/** Gastos e ingresos de la casa (tabla expenses, migration_2026-10-16). Cálculos puros: reparto, balance y totales del mes. */
export type ExpenseTipo = "gasto" | "ingreso" | "saldo";

export interface Expense {
  id: string;
  householdId: string | null;
  userId: string;
  fecha: string;
  tipo: ExpenseTipo;
  monto: number;
  categoria: string;
  descripcion: string | null;
  compartido: boolean;
  /** {user_id: porcentaje}; null = partes iguales entre los integrantes. */
  reparto: Record<string, number> | null;
  paraUserId: string | null;
  aporteCasa: boolean;
  origen: string | null;
}

export interface HouseholdMember {
  userId: string;
  nombre: string;
}

export const EXPENSE_CATEGORIES: { id: string; label: string }[] = [
  { id: "super", label: "Súper" },
  { id: "alquiler_servicios", label: "Alquiler y servicios" },
  { id: "salidas", label: "Salidas" },
  { id: "transporte", label: "Transporte" },
  { id: "salud", label: "Salud" },
  { id: "ingresos", label: "Ingresos" },
  { id: "otros", label: "Otros" },
];

export const categoryLabel = (id: string) => EXPENSE_CATEGORIES.find((c) => c.id === id)?.label ?? "Otros";

export const money = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;

/** Parte (en plata) que le toca a un integrante de un gasto compartido. */
export function shareOf(expense: Expense, memberId: string, memberIds: string[]): number {
  if (expense.reparto && expense.reparto[memberId] != null) return (expense.monto * expense.reparto[memberId]) / 100;
  if (expense.reparto) return 0;
  return memberIds.includes(memberId) ? expense.monto / Math.max(1, memberIds.length) : 0;
}

/**
 * Balance del grupo: para cada integrante, lo que puso (pagó) menos lo que le tocaba. Positivo = le deben; negativo = debe.
 * Los pagos para saldar ("saldo") restan deuda al que paga y le restan crédito al que recibe.
 */
export function computeBalance(expenses: Expense[], members: HouseholdMember[]): Record<string, number> {
  const ids = members.map((m) => m.userId);
  const net: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));
  for (const e of expenses) {
    if (e.tipo === "gasto" && e.compartido) {
      if (e.userId in net) net[e.userId] += e.monto;
      for (const id of ids) net[id] -= shareOf(e, id, ids);
    } else if (e.tipo === "saldo") {
      if (e.userId in net) net[e.userId] += e.monto;
      if (e.paraUserId && e.paraUserId in net) net[e.paraUserId] -= e.monto;
    }
  }
  return net;
}

/** Pagos mínimos para dejar todo en cero (el que más debe le paga al que más tiene a favor, y así). */
export function suggestTransfers(net: Record<string, number>): { from: string; to: string; monto: number }[] {
  const debtors = Object.entries(net).filter(([, v]) => v < -0.5).map(([id, v]) => ({ id, v: -v })).sort((a, b) => b.v - a.v);
  const creditors = Object.entries(net).filter(([, v]) => v > 0.5).map(([id, v]) => ({ id, v })).sort((a, b) => b.v - a.v);
  const out: { from: string; to: string; monto: number }[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].v, creditors[j].v);
    out.push({ from: debtors[i].id, to: creditors[j].id, monto: Math.round(pay) });
    debtors[i].v -= pay;
    creditors[j].v -= pay;
    if (debtors[i].v < 0.5) i++;
    if (creditors[j].v < 0.5) j++;
  }
  return out;
}

/** Totales de un mes (YYYY-MM) para una persona: ingresos propios, lo que gastó por su cuenta y su parte de lo compartido. */
export function monthSummary(expenses: Expense[], month: string, me: string, memberIds: string[]) {
  let ingresos = 0;
  let gastoPersonal = 0;
  let gastoCompartido = 0;
  const porCategoria: Record<string, number> = {};
  for (const e of expenses) {
    if (!e.fecha.startsWith(month)) continue;
    if (e.tipo === "ingreso" && e.userId === me) ingresos += e.monto;
    if (e.tipo !== "gasto") continue;
    if (e.compartido) {
      const mine = shareOf(e, me, memberIds);
      if (mine > 0) {
        gastoCompartido += mine;
        porCategoria[e.categoria] = (porCategoria[e.categoria] || 0) + mine;
      }
    } else if (e.userId === me) {
      gastoPersonal += e.monto;
      porCategoria[e.categoria] = (porCategoria[e.categoria] || 0) + e.monto;
    }
  }
  return { ingresos, gastoPersonal, gastoCompartido, gastoTotal: gastoPersonal + gastoCompartido, neto: ingresos - gastoPersonal - gastoCompartido, porCategoria };
}
