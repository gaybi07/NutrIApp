"use client";

import { Circle, Star, Triangle, X } from "lucide-react";
import { DayGoalStatus, KcalStatus, KCAL_STATUS_LABEL, PROTEIN_STATUS_LABEL } from "@/lib/dayStatus";
import { STATUS_BG } from "@/components/WeekGoalGrid";

/**
 * Casillero de un día con doble indicador y la misma escala de colores: el FONDO es cómo salió en kilocalorías y el SÍMBOLO
 * (adentro, en un círculo blanco) es cómo salió en proteína, del color de su franja: ★ proteína extra (violeta), ● cumplida
 * (verde), ▲ algo baja (amarillo) y ✕ muy baja (rojo). Hoy va con recuadro violeta y los colores bien transparentes porque el
 * día sigue en curso.
 */
export function ProteinSymbol({ status, size }: { status: DayGoalStatus; size: number }) {
  const common = { size, "aria-hidden": true } as const;
  if (status === "violeta") return <Star {...common} fill="currentColor" strokeWidth={1.5} />;
  if (status === "verde") return <Circle {...common} fill="currentColor" strokeWidth={1.5} />;
  if (status === "amarillo") return <Triangle {...common} fill="currentColor" strokeWidth={1.5} />;
  return <X {...common} strokeWidth={3.5} />;
}

export function DayCell({
  label,
  day,
  dow,
  kcalStatus,
  proteinStatus,
  closed,
  isToday,
  future,
  selected,
  onClick,
}: {
  label: string;
  day: number;
  /** Letra del día de la semana (opcional, la cuadrícula semanal la muestra). */
  dow?: string;
  kcalStatus: KcalStatus | null;
  proteinStatus: DayGoalStatus | null;
  /** El día ya terminó: recién ahí se pinta con el color definitivo. */
  closed: boolean;
  isToday: boolean;
  future: boolean;
  selected?: boolean;
  onClick: () => void;
}) {
  const hasData = kcalStatus !== null && proteinStatus !== null;
  const painted = closed && hasData;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-lg font-mono ${
        painted ? "" : isToday ? "border-2 border-gold text-text" : "border border-dashed border-border text-textMuted"
      } ${future ? "opacity-50" : ""} ${selected ? "ring-2 ring-text/60 ring-offset-1 ring-offset-surface" : ""}`}
      style={painted ? { background: STATUS_BG[kcalStatus!], color: kcalStatus === "amarillo" ? "#422006" : "#ffffff" } : undefined}
    >
      {isToday && kcalStatus && <span aria-hidden className="absolute inset-0" style={{ background: STATUS_BG[kcalStatus], opacity: 0.3 }} />}
      {dow && <span className="relative text-[9px] uppercase leading-none opacity-80">{dow}</span>}
      <span className="relative text-[13px] font-bold leading-none">{day}</span>
      {hasData && proteinStatus && (
        <span
          aria-hidden
          className="relative mt-0.5 flex h-[17px] w-[17px] items-center justify-center rounded-full"
          style={{ background: "#ffffff", color: STATUS_BG[proteinStatus], opacity: closed ? 1 : 0.75 }}
        >
          <ProteinSymbol status={proteinStatus} size={11} />
        </span>
      )}
    </button>
  );
}

/** Leyenda: el fondo mide las kcal y la manito la proteína, los dos con la misma escala de colores. */
export function DayLegend() {
  const kcal: KcalStatus[] = ["verde", "amarillo", "rojo"];
  const prot: DayGoalStatus[] = ["violeta", "verde", "amarillo", "rojo"];
  return (
    <div className="mt-3 space-y-2">
      <div>
        <div className="mb-1 font-mono text-[9px] uppercase tracking-wide text-textMuted">Fondo del cuadrado = kilocalorías</div>
        <div className="space-y-1">
          {kcal.map((s) => (
            <div key={s} className="flex items-center gap-1.5 text-[10px] text-textMuted">
              <span className="inline-block h-3 w-3 shrink-0 rounded" style={{ background: STATUS_BG[s] }} />
              {KCAL_STATUS_LABEL[s]}
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-1 font-mono text-[9px] uppercase tracking-wide text-textMuted">Símbolo del círculo = proteína</div>
        <div className="space-y-1">
          {prot.map((s) => (
            <div key={s} className="flex items-center gap-1.5 text-[10px] text-textMuted">
              <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border bg-white" style={{ color: STATUS_BG[s] }}>
                <ProteinSymbol status={s} size={9} />
              </span>
              {PROTEIN_STATUS_LABEL[s]}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Explica un día tocado: qué significa el color del fondo (kcal) y el símbolo de adentro (proteína), con sus números. */
export function DayExplanation({
  kcalStatus,
  proteinStatus,
  kcal,
  kcalGoal,
  protein,
  proteinGoal,
  inProgress,
}: {
  kcalStatus: KcalStatus;
  proteinStatus: DayGoalStatus;
  kcal: number;
  kcalGoal: number;
  protein: number;
  proteinGoal: number;
  inProgress: boolean;
}) {
  return (
    <div className="mt-1 space-y-1.5">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 inline-block h-4 w-4 shrink-0 rounded" style={{ background: STATUS_BG[kcalStatus] }} />
        <div>
          <div className="font-semibold">Color del cuadrado = kilocalorías</div>
          <div className="text-textMuted">
            {kcal.toLocaleString("es-AR")} de {kcalGoal.toLocaleString("es-AR")} kcal · {KCAL_STATUS_LABEL[kcalStatus]}
          </div>
        </div>
      </div>
      <div className="flex items-start gap-2">
        <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border bg-white" style={{ color: STATUS_BG[proteinStatus] }}>
          <ProteinSymbol status={proteinStatus} size={9} />
        </span>
        <div>
          <div className="font-semibold">Figura de adentro = proteína</div>
          <div className="text-textMuted">
            {protein} de {proteinGoal} g · {PROTEIN_STATUS_LABEL[proteinStatus]}
          </div>
        </div>
      </div>
      {inProgress && <div className="text-textMuted">El día sigue en curso: los colores finales se definen cuando termina.</div>}
    </div>
  );
}
