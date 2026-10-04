"use client";

import { MonthStandard } from "@/lib/monthStandard";
import { STATUS_BG } from "@/components/WeekGoalGrid";
import { ProteinSymbol } from "@/components/DayCell";

const NAME = { violeta: "Violeta", verde: "Verde", amarillo: "Amarillo", rojo: "Rojo" } as const;

/**
 * Estandarte de un mes, simple: TODO el fondo es un solo color, el promedio de las kilocalorías del mes, y por el medio pasa
 * una línea ondulada con el promedio de la proteína, con los bordes blancos. Nada más.
 */
export function MonthBanner({ standard }: { standard: MonthStandard }) {
  const { kcalStatus, proteinStatus, kcalOk, proteinOk, counted } = standard;
  const wave = "M0 32 Q 18.75 8 37.5 32 T 75 32 T 112.5 32 T 150 32 T 187.5 32 T 225 32 T 262.5 32 T 300 32";
  return (
    <div>
      <div className="h-16 overflow-hidden rounded-lg" style={{ background: kcalStatus ? STATUS_BG[kcalStatus] : "rgb(var(--color-bg) / 0.6)", border: kcalStatus ? undefined : "1px dashed rgb(var(--color-text-muted))" }}>
        <svg viewBox="0 0 300 64" preserveAspectRatio="none" className="h-full w-full" aria-hidden>
          {proteinStatus && (
            <>
              <path d={wave} fill="none" stroke="#ffffff" strokeWidth={13} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              <path d={wave} fill="none" style={{ stroke: STATUS_BG[proteinStatus] }} strokeWidth={7} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </>
          )}
        </svg>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
        <div className="flex items-center gap-2">
          <span className="inline-block h-4 w-4 shrink-0 rounded" style={kcalStatus ? { background: STATUS_BG[kcalStatus] } : { border: "1px dashed rgb(var(--color-text-muted))" }} />
          <span>
            <span className="block font-mono text-[9px] uppercase tracking-wide text-textMuted">Kilocalorías (fondo)</span>
            {kcalStatus ? `${NAME[kcalStatus]} · ${kcalOk} de ${counted} días en objetivo` : "Juntando datos"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border bg-white"
            style={{ color: proteinStatus ? STATUS_BG[proteinStatus] : "rgb(var(--color-text-muted))" }}
          >
            {proteinStatus ? <ProteinSymbol status={proteinStatus} size={9} /> : null}
          </span>
          <span>
            <span className="block font-mono text-[9px] uppercase tracking-wide text-textMuted">Proteína (franja)</span>
            {proteinStatus ? `${NAME[proteinStatus]} · ${proteinOk} de ${counted} días al 95% o más` : "Juntando datos"}
          </span>
        </div>
      </div>
    </div>
  );
}
