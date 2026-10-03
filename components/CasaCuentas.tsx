"use client";

import { useMemo, useState } from "react";
import { PurchaseRecord } from "@/lib/types";
import { HouseholdInfo } from "@/lib/useHousehold";
import { useExpenses } from "@/lib/useExpenses";
import { EXPENSE_CATEGORIES, Expense, categoryLabel, computeBalance, money, monthSummary, shareOf, suggestTransfers } from "@/lib/expenses";
import { btn, chip } from "@/components/buttonStyles";
import { fmtDate } from "@/lib/calculations";

type Tab = "compartidos" | "mios" | "mes" | "balance";
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const fmtAr = (iso: string) => iso.split("-").reverse().slice(0, 2).join("/");

/**
 * Cuentas de la casa: gastos e ingresos en un solo lugar. Lo compartido lo ven todos los integrantes del grupo y se reparte
 * (partes iguales por defecto); lo personal lo ve solo quien lo cargó. El balance dice quién le debe a quién y se salda con un pago.
 */
export function CasaCuentas({ authenticated, household, purchases }: { authenticated: boolean; household: HouseholdInfo | null; purchases: PurchaseRecord[] }) {
  const hook = useExpenses(authenticated, household?.id ?? null);
  const { expenses, members, me, missing } = hook;
  const [tab, setTab] = useState<Tab>(household ? "compartidos" : "mios");
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const today = fmtDate(new Date());
  const [month, setMonth] = useState(today.slice(0, 7));
  const memberIds = members.map((m) => m.userId);
  const nameOf = (id: string | null) => (id === me ? "Vos" : members.find((m) => m.userId === id)?.nombre || "Integrante");

  const shared = useMemo(() => expenses.filter((e) => e.householdId && (e.compartido || e.tipo === "saldo" || e.aporteCasa)), [expenses]);
  const mine = useMemo(() => expenses.filter((e) => e.userId === me && !e.compartido && e.tipo !== "saldo"), [expenses, me]);
  const net = useMemo(() => computeBalance(shared, members), [shared, members]);
  const transfers = useMemo(() => suggestTransfers(net), [net]);
  const summary = useMemo(() => (me ? monthSummary(expenses, month, me, memberIds) : null), [expenses, month, me, memberIds]);

  // Compras del súper leídas con ticket que todavía no son un gasto compartido (una por día de compra).
  const pendingPurchases = useMemo(() => {
    if (!household) return [];
    const byDay = new Map<string, number>();
    for (const p of purchases) if (p.price) byDay.set(p.fecha, (byDay.get(p.fecha) || 0) + p.price);
    return Array.from(byDay.entries())
      .filter(([fecha]) => !expenses.some((e) => e.origen === `compra:${fecha}`))
      .map(([fecha, total]) => ({ fecha, total }))
      .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
      .slice(0, 5);
  }, [purchases, expenses, household]);

  if (missing) {
    return (
      <section className="rounded-2xl border border-border bg-surface/70 p-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Cuentas de la casa</div>
        <div className="mt-1 text-[12px] text-textMuted">Falta correr la actualización de la base (migración 2026-10-16) para activar los gastos.</div>
      </section>
    );
  }

  const list = (items: Expense[]) =>
    items.length === 0 ? (
      <div className="rounded-lg border border-dashed border-border p-3 text-[12px] text-textMuted">Todavía no hay movimientos acá.</div>
    ) : (
      <div className="space-y-1.5">
        {items.map((e) => (
          <div key={e.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg/40 px-2.5 py-2">
            <div className="min-w-0">
              <div className="truncate text-[13px] text-text">
                {e.tipo === "saldo" ? `${nameOf(e.userId)} le pagó a ${nameOf(e.paraUserId)}` : e.descripcion || categoryLabel(e.categoria)}
              </div>
              <div className="font-mono text-[9px] uppercase tracking-wide text-textMuted">
                {fmtAr(e.fecha)} · {e.tipo === "saldo" ? "saldo" : categoryLabel(e.categoria)}
                {e.tipo === "gasto" && e.compartido ? ` · pagó ${nameOf(e.userId)}` : ""}
                {e.aporteCasa ? " · aporte a la casa" : ""}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={`font-mono text-[12px] font-bold ${e.tipo === "ingreso" ? "text-sage" : "text-text"}`}>
                {e.tipo === "ingreso" ? "+" : ""}
                {money(e.monto)}
              </span>
              {e.userId === me && (
                <button type="button" onClick={() => hook.remove(e.id)} className={btn("danger", "sm")} aria-label="Eliminar">
                  Eliminar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    );

  const tabs: { id: Tab; label: string }[] = household
    ? [
        { id: "compartidos", label: "Compartidos" },
        { id: "mios", label: "Míos" },
        { id: "mes", label: "Mes" },
        { id: "balance", label: "Balance" },
      ]
    : [
        { id: "mios", label: "Míos" },
        { id: "mes", label: "Mes" },
      ];

  return (
    <section className="rounded-2xl border border-border bg-surface/70 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Cuentas de la casa</div>
          <div className="font-display text-xl text-text">{household ? household.name : "Mis gastos"}</div>
        </div>
        <button type="button" onClick={() => setAdding((v) => !v)} className={btn("primary", "sm")}>
          {adding ? "Cerrar" : "+ Agregar"}
        </button>
      </div>

      {adding && (
        <AddForm
          household={household}
          members={members}
          me={me}
          busy={hook.busy}
          onSubmit={async (e) => {
            const err = await hook.add(e);
            setMessage(err ? { text: "No se pudo guardar: " + err, ok: false } : { text: "Guardado.", ok: true });
            if (!err) setAdding(false);
          }}
        />
      )}
      {message && <div className={`mt-2 text-[12px] ${message.ok ? "text-sage" : "text-rust"}`}>{message.text}</div>}

      <div className="mt-2 flex flex-wrap gap-1.5">
        {tabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} className={chip(tab === t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-2">
        {tab === "compartidos" && (
          <>
            {pendingPurchases.length > 0 && (
              <div className="mb-2 space-y-1.5">
                {pendingPurchases.map((p) => (
                  <div key={p.fecha} className="flex items-center justify-between gap-2 rounded-lg border border-gold/40 bg-gold/5 px-2.5 py-2">
                    <div className="text-[12px] text-text">
                      Compra del súper del <b>{fmtAr(p.fecha)}</b> · {money(p.total)}
                      <div className="text-[10px] text-textMuted">Todavía no es un gasto de la casa.</div>
                    </div>
                    <button
                      type="button"
                      disabled={hook.busy}
                      onClick={async () => {
                        const err = await hook.add({ fecha: p.fecha, tipo: "gasto", monto: p.total, categoria: "super", descripcion: "Compra del súper", compartido: true, origen: `compra:${p.fecha}` });
                        setMessage(err ? { text: "No se pudo registrar: " + err, ok: false } : { text: "Compra registrada como gasto compartido.", ok: true });
                      }}
                      className={`${btn("secondary", "sm")} shrink-0`}
                    >
                      Registrar
                    </button>
                  </div>
                ))}
              </div>
            )}
            {list(shared)}
          </>
        )}
        {tab === "mios" && list(mine)}
        {tab === "mes" && summary && (
          <div>
            <div className="mb-2 flex items-center gap-2">
              <select value={month} onChange={(event) => setMonth(event.target.value)} className="min-w-0 flex-1">
                {Array.from({ length: 6 }, (_, i) => {
                  const d = new Date();
                  d.setMonth(d.getMonth() - i);
                  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                  return (
                    <option key={key} value={key}>
                      {MONTHS[d.getMonth()]} {d.getFullYear()}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-border bg-bg/40 px-2 py-2">
                <div className="font-mono text-[9px] uppercase tracking-wide text-textMuted">Ingresos</div>
                <div className="font-sans text-[15px] font-bold text-sage">{money(summary.ingresos)}</div>
              </div>
              <div className="rounded-lg border border-border bg-bg/40 px-2 py-2">
                <div className="font-mono text-[9px] uppercase tracking-wide text-textMuted">Gastos</div>
                <div className="font-sans text-[15px] font-bold text-text">{money(summary.gastoTotal)}</div>
              </div>
              <div className="rounded-lg border border-border bg-bg/40 px-2 py-2">
                <div className="font-mono text-[9px] uppercase tracking-wide text-textMuted">Queda</div>
                <div className={`font-sans text-[15px] font-bold ${summary.neto >= 0 ? "text-sage" : "text-rust"}`}>{money(summary.neto)}</div>
              </div>
            </div>
            {household && (
              <div className="mt-1.5 text-center font-mono text-[10px] text-textMuted">
                De los gastos: {money(summary.gastoPersonal)} tuyos + {money(summary.gastoCompartido)} tu parte de la casa
              </div>
            )}
            <div className="mt-2 space-y-1">
              {Object.entries(summary.porCategoria)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, total]) => (
                  <div key={cat} className="flex items-center justify-between rounded-lg border border-border bg-bg/30 px-2.5 py-1.5 text-[12px]">
                    <span className="text-text">{categoryLabel(cat)}</span>
                    <span className="font-mono text-textMuted">{money(total)}</span>
                  </div>
                ))}
              {Object.keys(summary.porCategoria).length === 0 && <div className="text-[12px] text-textMuted">Sin gastos en este mes.</div>}
            </div>
          </div>
        )}
        {tab === "balance" && household && (
          <div className="space-y-2">
            <div className="space-y-1">
              {members.map((m) => (
                <div key={m.userId} className="flex items-center justify-between rounded-lg border border-border bg-bg/40 px-2.5 py-2 text-[13px]">
                  <span className="text-text">{m.userId === me ? "Vos" : m.nombre}</span>
                  <span className={`font-mono text-[12px] font-bold ${(net[m.userId] || 0) >= 0 ? "text-sage" : "text-rust"}`}>
                    {(net[m.userId] || 0) >= 0 ? "le deben " : "debe "}
                    {money(Math.abs(net[m.userId] || 0))}
                  </span>
                </div>
              ))}
            </div>
            {transfers.length === 0 ? (
              <div className="rounded-lg border border-sage/40 bg-sage/10 px-3 py-2 text-[12px] text-sage">Están a mano ✓</div>
            ) : (
              transfers.map((t) => (
                <div key={`${t.from}-${t.to}`} className="rounded-lg border border-gold/40 bg-gold/5 p-2.5">
                  <div className="text-[13px] text-text">
                    <b>{nameOf(t.from)}</b> le debe <b>{money(t.monto)}</b> a <b>{nameOf(t.to)}</b>
                  </div>
                  {t.from === me && (
                    <button
                      type="button"
                      disabled={hook.busy}
                      onClick={async () => {
                        const err = await hook.add({ fecha: today, tipo: "saldo", monto: t.monto, categoria: "otros", paraUserId: t.to });
                        setMessage(err ? { text: "No se pudo registrar: " + err, ok: false } : { text: "Pago registrado: quedaron a mano.", ok: true });
                      }}
                      className={`${btn("primary", "sm", true)} mt-2`}
                    >
                      Marcar como saldado ({money(t.monto)})
                    </button>
                  )}
                  {t.from !== me && <div className="mt-1 text-[11px] text-textMuted">Cuando te pague, {nameOf(t.from)} lo marca como saldado.</div>}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function AddForm({
  household,
  members,
  me,
  busy,
  onSubmit,
}: {
  household: HouseholdInfo | null;
  members: { userId: string; nombre: string }[];
  me: string | null;
  busy: boolean;
  onSubmit: (e: { fecha: string; tipo: "gasto" | "ingreso"; monto: number; categoria: string; descripcion: string; compartido: boolean; reparto: Record<string, number> | null; aporteCasa: boolean }) => void;
}) {
  const [tipo, setTipo] = useState<"gasto" | "ingreso">("gasto");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(fmtDate(new Date()));
  const [categoria, setCategoria] = useState("super");
  const [descripcion, setDescripcion] = useState("");
  const [compartido, setCompartido] = useState(false);
  const [aporte, setAporte] = useState(false);
  const [miParte, setMiParte] = useState("50");
  const [error, setError] = useState("");

  const others = members.filter((m) => m.userId !== me);
  const canCustomSplit = members.length === 2 && others.length === 1;

  const submit = () => {
    const value = Number(monto.replace(",", "."));
    if (!value || value <= 0) return setError("Poné un monto mayor a 0.");
    let reparto: Record<string, number> | null = null;
    if (tipo === "gasto" && compartido && canCustomSplit && me) {
      const pct = Number(miParte);
      if (Number.isNaN(pct) || pct < 0 || pct > 100) return setError("Tu parte va de 0 a 100%.");
      reparto = { [me]: pct, [others[0].userId]: 100 - pct };
    }
    setError("");
    onSubmit({ fecha, tipo, monto: value, categoria: tipo === "ingreso" ? "ingresos" : categoria, descripcion: descripcion.trim(), compartido: tipo === "gasto" && compartido, reparto, aporteCasa: tipo === "ingreso" && aporte });
  };

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-border bg-bg/40 p-2.5">
      <div className="flex gap-1.5">
        <button type="button" onClick={() => setTipo("gasto")} className={chip(tipo === "gasto")}>
          Gasto
        </button>
        <button type="button" onClick={() => setTipo("ingreso")} className={chip(tipo === "ingreso")}>
          Ingreso
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-0.5 block font-mono text-[8.5px] uppercase text-textMuted">Monto ($)</label>
          <input type="number" inputMode="decimal" value={monto} onChange={(event) => setMonto(event.target.value)} />
        </div>
        <div>
          <label className="mb-0.5 block font-mono text-[8.5px] uppercase text-textMuted">Fecha</label>
          <input type="date" value={fecha} onChange={(event) => setFecha(event.target.value)} />
        </div>
      </div>
      {tipo === "gasto" && (
        <div>
          <label className="mb-0.5 block font-mono text-[8.5px] uppercase text-textMuted">Categoría</label>
          <select value={categoria} onChange={(event) => setCategoria(event.target.value)}>
            {EXPENSE_CATEGORIES.filter((c) => c.id !== "ingresos").map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="mb-0.5 block font-mono text-[8.5px] uppercase text-textMuted">Detalle (opcional)</label>
        <input value={descripcion} onChange={(event) => setDescripcion(event.target.value)} maxLength={80} />
      </div>
      {household && tipo === "gasto" && (
        <label className="flex items-center gap-2 text-[12px] text-text">
          <input type="checkbox" checked={compartido} onChange={(event) => setCompartido(event.target.checked)} className="h-4 w-4" />
          Es un gasto de la casa (lo ven y lo reparten todos)
        </label>
      )}
      {household && tipo === "ingreso" && (
        <label className="flex items-center gap-2 text-[12px] text-text">
          <input type="checkbox" checked={aporte} onChange={(event) => setAporte(event.target.checked)} className="h-4 w-4" />
          Es un aporte a la casa
        </label>
      )}
      {tipo === "gasto" && compartido && canCustomSplit && (
        <div>
          <label className="mb-0.5 block font-mono text-[8.5px] uppercase text-textMuted">Tu parte (%) — el resto es de {others[0].nombre}</label>
          <input type="number" inputMode="numeric" min="0" max="100" value={miParte} onChange={(event) => setMiParte(event.target.value)} />
        </div>
      )}
      {error && <div className="text-[12px] text-rust">{error}</div>}
      <div className="flex justify-end">
        <button type="button" onClick={submit} disabled={busy} className={btn("primary", "sm")}>
          Guardar
        </button>
      </div>
    </div>
  );
}
