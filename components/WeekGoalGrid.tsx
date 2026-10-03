"use client";

import { useState } from "react";
import { DayEntry } from "@/lib/types";
import { dayGoal, dayProt, dayTotal } from "@/lib/calculations";
import { btn } from "@/components/buttonStyles";
import { DAY_STATUS_LABEL, DAY_STATUS_ORDER, DayGoalStatus, dayGoalStatus } from "@/lib/dayStatus";

const DOW = ["D", "L", "M", "M", "J", "V", "S"];
const DOW_FULL = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

export const STATUS_BG: Record<DayGoalStatus, string> = {
  violeta: "radial-gradient(circle at 30% 25%, #f5f3ff 0%, #c4b5fd 22%, #8b5cf6 58%, #6d28d9 100%)",
  verde: "radial-gradient(circle at 30% 25%, #ecfdf5 0%, #86efac 24%, #22c55e 60%, #15803d 100%)",
  amarillo: "#facc15",
  rojo: "rgb(var(--color-rust))",
};
export const STATUS_TEXT: Record<DayGoalStatus, string> = { violeta: "#ffffff", verde: "#ffffff", amarillo: "#422006", rojo: "#ffffff" };

/** Los dos mejores niveles llevan brillo (borde luminoso y halo); amarillo y rojo son de color común. */
export const isGlow = (s: DayGoalStatus) => s === "violeta" || s === "verde";

/** Estilo de un casillero ya cerrado. */
export function statusCellStyle(status: DayGoalStatus): React.CSSProperties {
  const base: React.CSSProperties = { background: STATUS_BG[status], color: STATUS_TEXT[status] };
  if (status === "violeta") {
    return { ...base, border: "2px solid #f5f3ff", boxShadow: "0 0 6px 1px #ddd6fe, 0 0 16px 3px rgba(139, 92, 246, 0.85), inset 0 0 8px rgba(255,255,255,0.65)", textShadow: "0 0 6px rgba(255,255,255,0.9)" };
  }
  if (status === "verde") {
    return { ...base, border: "2px solid #f0fdf4", boxShadow: "0 0 6px 1px #bbf7d0, 0 0 14px 2px rgba(34, 197, 94, 0.7), inset 0 0 8px rgba(255,255,255,0.55)", textShadow: "0 0 6px rgba(255,255,255,0.9)" };
  }
  return base;
}

/**
 * Cuadrícula de la semana: un casillero por día, coloreado según cómo salió contra el objetivo completo del día
 * (kcal y proteína). Los días sin nada cargado y los que todavía no llegaron quedan en gris; hoy se marca con un anillo
 * porque el día sigue en curso.
 */
export function WeekGoalGrid({
  weekDates,
  weekDays,
  todayFecha,
  goal,
  tdeeFallback,
  pesoKg,
  fixedGoal,
  proteinTarget,
  onOpenMonth,
}: {
  weekDates: string[];
  weekDays: (DayEntry | null)[];
  todayFecha: string;
  goal: number;
  tdeeFallback: number;
  pesoKg: number;
  fixedGoal: boolean;
  proteinTarget: number;
  /** Abre el almanaque del mes. */
  onOpenMonth?: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  const cells = weekDates.map((fecha, i) => {
    const entry = weekDays[i];
    const date = new Date(`${fecha}T00:00:00`);
    const kcal = entry ? dayTotal(entry) : 0;
    const prot = entry ? dayProt(entry) : 0;
    const hasData = kcal > 0;
    const kcalGoal = entry ? dayGoal(entry, goal, tdeeFallback, pesoKg, fixedGoal) : goal;
    // Hoy sigue en curso: queda sin color y se pinta cuando termina el día.
    const status = hasData ? dayGoalStatus(kcal, kcalGoal, prot, proteinTarget) : null;
    const painted = fecha < todayFecha ? status : null;
    return { fecha, date, kcal, prot, kcalGoal, status, painted, future: fecha > todayFecha, isToday: fecha === todayFecha };
  });
  const picked = cells.find((c) => c.fecha === selected) ?? null;

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((c) => (
          <button
            key={c.fecha}
            type="button"
            onClick={() => setSelected((prev) => (prev === c.fecha ? null : c.fecha))}
            aria-label={`${DOW_FULL[c.date.getDay()]} ${c.date.getDate()}`}
            className={`flex aspect-square flex-col items-center justify-center rounded-lg border font-mono ${
              c.painted ? "border-transparent" : c.isToday ? "relative overflow-hidden border-2 border-gold text-text" : "border-dashed border-border text-textMuted"
            } ${c.future ? "opacity-50" : ""}`}
            style={c.painted ? statusCellStyle(c.painted) : undefined}
          >
            {/* Hoy: el color de cómo va el día, bien transparente, adentro de un recuadro violeta que marca "hoy". */}
            {c.isToday && c.status && <span aria-hidden className="absolute inset-0" style={{ background: STATUS_BG[c.status], opacity: 0.3 }} />}
            <span className="relative text-[9px] uppercase leading-none opacity-80">{DOW[c.date.getDay()]}</span>
            <span className="relative mt-0.5 text-[13px] font-bold leading-none">{c.date.getDate()}</span>
          </button>
        ))}
      </div>

      {picked && (
        <div className="mt-2 rounded-lg border border-border bg-bg/40 px-2.5 py-2 text-[12px] text-text">
          <div className="font-mono text-[10px] uppercase tracking-wide text-textMuted">
            {DOW_FULL[picked.date.getDay()]} {picked.date.getDate()}
          </div>
          {picked.status ? (
            <>
              <div>
                {picked.kcal.toLocaleString("es-AR")} de {picked.kcalGoal.toLocaleString("es-AR")} kcal · {picked.prot} de {proteinTarget} g de proteína
              </div>
              <div className="text-textMuted">{picked.isToday ? "El día sigue en curso: el color final se define cuando termina." : DAY_STATUS_LABEL[picked.status]}</div>
            </>
          ) : (
            <div className="text-textMuted">{picked.future ? "Todavía no llegó." : "No cargaste nada ese día."}</div>
          )}
      <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
        {DAY_STATUS_ORDER.map((s) => (
          <div key={s} className="flex items-center gap-1.5 text-[10px] text-textMuted">
            <span className="inline-block h-3 w-3 shrink-0 rounded" style={isGlow(s) ? statusCellStyle(s) : { background: STATUS_BG[s] }} />
            {DAY_STATUS_LABEL[s]}
          </div>
        ))}
      </div>
        </div>
      )}

      {onOpenMonth && (
        <button type="button" onClick={onOpenMonth} className={`${btn("secondary", "sm", true)} mt-2`}>
          Ver el mes completo
        </button>
      )}
      {!picked && <div className="mt-1.5 text-center font-mono text-[9px] uppercase tracking-wide text-textMuted">Tocá un día para ver el detalle</div>}
    </div>
  );
}
