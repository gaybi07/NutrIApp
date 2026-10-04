import { DayEntry } from "@/lib/types";
import { dayGoal, dayProt, dayTotal } from "@/lib/calculations";
import { DayGoalStatus, KcalStatus, dayKcalStatus, dayProteinStatus } from "@/lib/dayStatus";

export interface WeekStandard {
  /** Primer y último día de la franja (AAAA-MM-DD). */
  start: string;
  end: string;
  counted: number;
  kcalStatus: DayGoalStatus | null;
  proteinStatus: DayGoalStatus | null;
  kcalOk: number;
  proteinOk: number;
}

export interface MonthStandard {
  /** AAAA-MM */
  month: string;
  status: DayGoalStatus | null;
  counted: number;
  avg: number;
  /** Color del mes solo en kilocalorías (el fondo del estandarte) y solo en proteína (la franja de arriba). */
  kcalStatus: DayGoalStatus | null;
  proteinStatus: DayGoalStatus | null;
  /** Cuántos días cerrados cumplieron: kcal dentro del objetivo / proteína al 95% o más. */
  kcalOk: number;
  proteinOk: number;
  /** Las cuatro franjas del mes (días 1-7, 8-14, 15-21 y 22-fin) con sus propios colores. */
  weeks: WeekStandard[];
  /** Un renglón por día cerrado con datos: el patrón del estandarte. */
  daysDetail: { fecha: string; kcal: KcalStatus; protein: DayGoalStatus }[];
}

/** Estandarte de un mes: el color que resume cómo le fue contra su objetivo, con los días ya cerrados (antes de hoy). */
export function computeMonthStandard(
  days: DayEntry[],
  month: string,
  todayFecha: string,
  goal: number,
  tdeeFallback: number,
  pesoKg: number,
  fixedGoal: boolean,
  proteinTarget: number
): MonthStandard {
  const detail: MonthStandard["daysDetail"] = [];
  for (const d of [...days].sort((a, b) => (a.fecha < b.fecha ? -1 : 1))) {
    if (!d.fecha.startsWith(month) || d.fecha >= todayFecha) continue;
    const kcal = dayTotal(d);
    if (kcal <= 0) continue;
    const kcalGoal = dayGoal(d, goal, tdeeFallback, pesoKg, fixedGoal);
    detail.push({ fecha: d.fecha, kcal: dayKcalStatus(kcal, kcalGoal), protein: dayProteinStatus(dayProt(d), proteinTarget) });
  }
  // El color de cada barra del mes sale del PORCENTAJE DE DÍAS que cumplieron:
  //   violeta 90% o más · verde 70% o más · amarillo 40% o más · rojo por debajo de 40%.
  // Kcal cumplida = día con kcal dentro del objetivo; proteína cumplida = día con proteína al 95% o más.
  const total = detail.length;
  const kcalOk = detail.filter((x) => x.kcal === "verde" || x.kcal === "violeta").length;
  const proteinOk = detail.filter((x) => x.protein === "verde" || x.protein === "violeta").length;
  const byPct = (ok: number): DayGoalStatus => {
    const pct = total > 0 ? ok / total : 0;
    return pct >= 0.9 ? "violeta" : pct >= 0.7 ? "verde" : pct >= 0.4 ? "amarillo" : "rojo";
  };
  const enough = total >= 7;
  const kcalStatus = enough ? byPct(kcalOk) : null;
  const proteinStatus = enough ? byPct(proteinOk) : null;
  // Color general del mes: el más bajo de los dos.
  const rank: Record<DayGoalStatus, number> = { violeta: 3, verde: 2, amarillo: 1, rojo: 0 };
  const order: DayGoalStatus[] = ["rojo", "amarillo", "verde", "violeta"];
  const status = kcalStatus && proteinStatus ? order[Math.min(rank[kcalStatus], rank[proteinStatus])] : null;
  // Las cuatro franjas de la semana, con el mismo criterio (pero alcanza con 3 días cerrados para pintarla).
  const [yy, mm] = month.split("-").map(Number);
  const lastDay = new Date(yy, mm, 0).getDate();
  const bounds: [number, number][] = [[1, 7], [8, 14], [15, 21], [22, lastDay]];
  const pad = (n: number) => String(n).padStart(2, "0");
  const weeks: WeekStandard[] = bounds.map(([from, to]) => {
    const start = `${month}-${pad(from)}`;
    const end = `${month}-${pad(to)}`;
    const part = detail.filter((x) => x.fecha >= start && x.fecha <= end);
    const ok = (f: (x: (typeof detail)[number]) => boolean) => part.filter(f).length;
    const pct = (n: number): DayGoalStatus => {
      const r = part.length > 0 ? n / part.length : 0;
      return r >= 0.9 ? "violeta" : r >= 0.7 ? "verde" : r >= 0.4 ? "amarillo" : "rojo";
    };
    const ready = part.length >= 3;
    return {
      start,
      end,
      counted: part.length,
      kcalOk: ok((x) => x.kcal === "verde" || x.kcal === "violeta"),
      proteinOk: ok((x) => x.protein === "verde" || x.protein === "violeta"),
      kcalStatus: ready ? pct(ok((x) => x.kcal === "verde" || x.kcal === "violeta")) : null,
      proteinStatus: ready ? pct(ok((x) => x.protein === "verde" || x.protein === "violeta")) : null,
    };
  });
  return { month, status, counted: total, avg: 0, kcalStatus, proteinStatus, kcalOk, proteinOk, weeks, daysDetail: detail };
}

/** Los últimos `count` meses (el actual primero). */
export function recentMonths(todayFecha: string, count: number): string[] {
  const t = new Date(`${todayFecha}T00:00:00`);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(t.getFullYear(), t.getMonth() - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}
