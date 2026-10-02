"use client";

import { addDays, fmtDate, isoMonday } from "@/lib/calculations";
import { useHouseholdExports } from "@/lib/useHouseholdExports";

/** Lunes de la semana que viene (la que se planifica y se compra). */
export function nextWeekStart() {
  return fmtDate(addDays(isoMonday(fmtDate(new Date())), 7));
}

/**
 * Aviso en la Alacena compartida: si ya exportaste tu parte de la semana que viene y si faltan los demás.
 * La lista de compras del grupo se arma recién cuando exportaron todos.
 */
export function HouseholdExportBadge({ householdId, memberCount }: { householdId: string; memberCount: number }) {
  const { rows, mine, loaded, error } = useHouseholdExports(householdId, nextWeekStart());
  if (!loaded || error) return null;
  const done = rows.length;
  const allDone = done >= memberCount;
  const label = allDone ? "Listos ✓" : !mine ? "Falta tu parte" : `Falta${memberCount - done === 1 ? "" : "n"} ${memberCount - done}`;
  return (
    <span
      className="rounded-full px-2 py-1 font-mono text-[9px] font-bold uppercase leading-none tracking-wide"
      style={
        allDone
          ? { background: "rgb(var(--color-sage))", color: "#0f3d2d" }
          : !mine
            ? { background: "rgb(var(--color-carbs))", color: "#4a2f00" }
            : { background: "rgb(var(--color-surface-alt))", color: "rgb(var(--color-text-muted))", border: "1px solid rgb(var(--color-border))" }
      }
      title="Estado de la lista de compras del grupo para la semana que viene"
    >
      {label}
    </span>
  );
}

export function HouseholdExportPanel({ householdId, memberCount }: { householdId: string; memberCount: number }) {
  const weekStart = nextWeekStart();
  const { rows, mine, loaded, error } = useHouseholdExports(householdId, weekStart);
  if (!loaded) return null;
  if (error) {
    return (
      <div className="mb-3 rounded-lg border border-dashed border-border p-2.5 text-[11px] text-textMuted">
        La lista de compras del grupo necesita una actualización de la base (migration 2026-10-07) para funcionar.
      </div>
    );
  }
  const start = new Date(`${weekStart}T00:00:00`);
  const others = rows.filter((r) => r.user_id !== mine?.user_id);
  const missing = Math.max(0, memberCount - rows.length);
  return (
    <div className="mb-3 rounded-xl border border-gold/40 bg-gold/5 p-2.5">
      <div className="font-mono text-[9px] uppercase tracking-wide text-gold">
        Lista de compras del grupo · semana del {start.getDate()}/{start.getMonth() + 1}
      </div>
      <div className="mt-1.5 space-y-1 text-[12px]">
        <div className={mine ? "text-sage" : "text-text"}>
          {mine ? `✓ Vos exportaste tu parte (${mine.items.length} comida${mine.items.length === 1 ? "" : "s"})` : "• Falta exportar tu parte"}
        </div>
        {others.map((row) => (
          <div key={row.user_id} className="text-sage">
            ✓ {row.nombre || "Integrante"} exportó a la cena compartida ({row.items.length} comida{row.items.length === 1 ? "" : "s"})
          </div>
        ))}
        {missing > 0 && (
          <div className="text-textMuted">
            • Falta{missing === 1 ? "" : "n"} {missing} integrante{missing === 1 ? "" : "s"} por exportar
          </div>
        )}
      </div>
      <div className="mt-1.5 text-[11px] text-textMuted">
        {rows.length >= memberCount
          ? "Ya exportaron todos: podés armar la lista desde Comidas → Lista de compras."
          : "Cada uno exporta su parte desde Comidas → Lista de compras. Cuando estén todos, se arma la lista."}
      </div>
    </div>
  );
}
