"use client";

import { useState } from "react";
import { DayEntry } from "@/lib/types";
import { dayGoal, dayProt, dayTotal } from "@/lib/calculations";
import { btn } from "@/components/buttonStyles";
import { DayGoalStatus, dayKcalStatus, dayProteinStatus } from "@/lib/dayStatus";
import { DayCell, DayExplanation, DayLegend } from "@/components/DayCell";

const DOW = ["D", "L", "M", "M", "J", "V", "S"];
const DOW_FULL = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

export const STATUS_BG: Record<DayGoalStatus, string> = {
  violeta: "#8b5cf6",
  verde: "#22c55e",
  amarillo: "#facc15",
  rojo: "rgb(var(--color-rust))",
};
export const STATUS_TEXT: Record<DayGoalStatus, string> = { violeta: "#ffffff", verde: "#ffffff", amarillo: "#422006", rojo: "#ffffff" };

/** Ya no hay brillo ni bordes: los colores van lisos. (Se conserva por compatibilidad con quienes lo usan.) */
export const isGlow = (_s: DayGoalStatus) => false;

/** Estilo de un casillero/franja ya cerrado: color liso, sin borde. */
export function statusCellStyle(status: DayGoalStatus): React.CSSProperties {
  return { background: STATUS_BG[status], color: STATUS_TEXT[status] };
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
    return {
      fecha,
      date,
      kcal,
      prot,
      kcalGoal,
      kcalStatus: hasData ? dayKcalStatus(kcal, kcalGoal) : null,
      proteinStatus: hasData ? dayProteinStatus(prot, proteinTarget) : null,
      closed: fecha < todayFecha,
      future: fecha > todayFecha,
      isToday: fecha === todayFecha,
    };
  });
  const picked = cells.find((c) => c.fecha === selected) ?? null;

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((c) => (
          <DayCell
            key={c.fecha}
            label={`${DOW_FULL[c.date.getDay()]} ${c.date.getDate()}`}
            day={c.date.getDate()}
            dow={DOW[c.date.getDay()]}
            kcalStatus={c.kcalStatus}
            proteinStatus={c.proteinStatus}
            closed={c.closed}
            isToday={c.isToday}
            future={c.future}
            selected={selected === c.fecha}
            onClick={() => setSelected((prev) => (prev === c.fecha ? null : c.fecha))}
          />
        ))}
      </div>

      {picked && (
        <div className="mt-2 rounded-lg border border-border bg-bg/40 px-2.5 py-2 text-[12px] text-text">
          <div className="font-mono text-[10px] uppercase tracking-wide text-textMuted">
            {DOW_FULL[picked.date.getDay()]} {picked.date.getDate()}
          </div>
          {picked.kcalStatus && picked.proteinStatus ? (
            <DayExplanation
              kcalStatus={picked.kcalStatus}
              proteinStatus={picked.proteinStatus}
              kcal={picked.kcal}
              kcalGoal={picked.kcalGoal}
              protein={picked.prot}
              proteinGoal={proteinTarget}
              inProgress={picked.isToday}
            />
          ) : (
            <div className="text-textMuted">{picked.future ? "Todavía no llegó." : "No cargaste nada ese día."}</div>
          )}
          <DayLegend />
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
