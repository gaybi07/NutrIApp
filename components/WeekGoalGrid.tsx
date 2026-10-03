"use client";

import { useState } from "react";
import { DayEntry } from "@/lib/types";
import { dayGoal, dayProt, dayTotal } from "@/lib/calculations";
import { DAY_STATUS_LABEL, DayGoalStatus, dayGoalStatus } from "@/lib/dayStatus";

const DOW = ["D", "L", "M", "M", "J", "V", "S"];
const DOW_FULL = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

const STATUS_BG: Record<DayGoalStatus, string> = {
  violeta: "rgb(var(--color-accent))",
  verde: "rgb(var(--color-sage))",
  amarillo: "rgb(var(--color-carbs))",
  rojo: "rgb(var(--color-rust))",
  multicolor: "conic-gradient(from 0deg, #ef4444, #f59e0b, #22c55e, #3b82f6, #a855f7, #ef4444)",
};
const STATUS_TEXT: Record<DayGoalStatus, string> = { violeta: "#ffffff", verde: "#0f3d2d", amarillo: "#4a2f00", rojo: "#ffffff", multicolor: "#ffffff" };

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
}: {
  weekDates: string[];
  weekDays: (DayEntry | null)[];
  todayFecha: string;
  goal: number;
  tdeeFallback: number;
  pesoKg: number;
  fixedGoal: boolean;
  proteinTarget: number;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  const cells = weekDates.map((fecha, i) => {
    const entry = weekDays[i];
    const date = new Date(`${fecha}T00:00:00`);
    const kcal = entry ? dayTotal(entry) : 0;
    const prot = entry ? dayProt(entry) : 0;
    const hasData = kcal > 0;
    const kcalGoal = entry ? dayGoal(entry, goal, tdeeFallback, pesoKg, fixedGoal) : goal;
    const status = hasData ? dayGoalStatus(kcal, kcalGoal, prot, proteinTarget) : null;
    return { fecha, date, kcal, prot, kcalGoal, status, future: fecha > todayFecha, isToday: fecha === todayFecha };
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
              c.status ? "border-transparent" : "border-dashed border-border text-textMuted"
            } ${c.isToday ? "ring-2 ring-text/70 ring-offset-1 ring-offset-surface" : ""} ${c.future ? "opacity-50" : ""}`}
            style={c.status ? { background: STATUS_BG[c.status], color: STATUS_TEXT[c.status] } : undefined}
          >
            <span className="text-[9px] uppercase leading-none opacity-80">{DOW[c.date.getDay()]}</span>
            <span className="mt-0.5 text-[13px] font-bold leading-none">{c.date.getDate()}</span>
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
              <div className="text-textMuted">{DAY_STATUS_LABEL[picked.status]}</div>
            </>
          ) : (
            <div className="text-textMuted">{picked.future ? "Todavía no llegó." : "No cargaste nada ese día."}</div>
          )}
        </div>
      )}

      <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
        {(["violeta", "verde", "amarillo", "rojo", "multicolor"] as DayGoalStatus[]).map((s) => (
          <div key={s} className="flex items-center gap-1.5 text-[10px] text-textMuted">
            <span className="inline-block h-3 w-3 shrink-0 rounded" style={{ background: STATUS_BG[s] }} />
            {DAY_STATUS_LABEL[s]}
          </div>
        ))}
      </div>
    </div>
  );
}
