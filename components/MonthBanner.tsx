"use client";

import { MonthStandard } from "@/lib/monthStandard";
import { STATUS_BG } from "@/components/WeekGoalGrid";
import { ProteinSymbol } from "@/components/DayCell";

const NAME = { violeta: "Violeta", verde: "Verde", amarillo: "Amarillo", rojo: "Rojo" } as const;

export type BannerPattern = "onda" | "triangulos" | "dobles" | "cruz";
export const BANNER_PATTERNS: { id: BannerPattern; label: string }[] = [
  { id: "onda", label: "Onda" },
  { id: "triangulos", label: "Triángulos" },
  { id: "dobles", label: "Dos líneas" },
  { id: "cruz", label: "Cruz" },
];

/** Trazados de la línea del estandarte (caja 300 x 64). Cada uno es una lista de líneas que se dibujan con borde blanco. */
const PATTERN_PATHS: Record<BannerPattern, string[]> = {
  onda: ["M0 32 Q 18.75 8 37.5 32 T 75 32 T 112.5 32 T 150 32 T 187.5 32 T 225 32 T 262.5 32 T 300 32"],
  triangulos: ["M0 44 L25 20 L50 44 L75 20 L100 44 L125 20 L150 44 L175 20 L200 44 L225 20 L250 44 L275 20 L300 44"],
  dobles: ["M0 22 L300 22", "M0 42 L300 42"],
  cruz: ["M0 4 L300 60", "M0 60 L300 4"],
};

/**
 * Estandarte de un mes, simple: TODO el fondo es un solo color, el promedio de las kilocalorías del mes, y por encima pasa una
 * línea (con el patrón que elige cada uno) del color del promedio de la proteína, con los bordes blancos. Si el mes todavía está
 * en curso se ve transparente; si no tiene los 7 días cerrados mínimos, dice cuántos faltan.
 */
export function MonthBanner({ standard, pattern = "onda", inProgress = false }: { standard: MonthStandard; pattern?: BannerPattern; inProgress?: boolean }) {
  const { kcalStatus, proteinStatus, kcalOk, proteinOk, counted } = standard;
  const ready = kcalStatus !== null && proteinStatus !== null;
  return (
    <div>
      <div
        className="relative h-16 overflow-hidden rounded-lg"
        style={ready ? { background: STATUS_BG[kcalStatus!], opacity: inProgress ? 0.55 : 1 } : { border: "1px dashed rgb(var(--color-text-muted))" }}
      >
        {ready ? (
          <svg viewBox="0 0 300 64" preserveAspectRatio="none" className="h-full w-full" aria-hidden>
            {PATTERN_PATHS[pattern].map((d, i) => (
              <g key={i}>
                <path d={d} fill="none" stroke="#ffffff" strokeWidth={13} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                <path d={d} fill="none" style={{ stroke: STATUS_BG[proteinStatus!] }} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              </g>
            ))}
          </svg>
        ) : (
          <div className="flex h-full items-center justify-center px-3 text-center text-[12px] text-textMuted">
            Hacen falta 7 días cerrados para calcularlo. Llevás {counted}.
          </div>
        )}
      </div>
      {ready && (
        <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
          <div className="flex items-center gap-2">
            <span className="inline-block h-4 w-4 shrink-0 rounded" style={{ background: STATUS_BG[kcalStatus!] }} />
            <span>
              <span className="block font-mono text-[9px] uppercase tracking-wide text-textMuted">Kilocalorías (fondo)</span>
              {NAME[kcalStatus!]} · {kcalOk} de {counted} días en objetivo
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border bg-white" style={{ color: STATUS_BG[proteinStatus!] }}>
              <ProteinSymbol status={proteinStatus!} size={9} />
            </span>
            <span>
              <span className="block font-mono text-[9px] uppercase tracking-wide text-textMuted">Proteína (línea)</span>
              {NAME[proteinStatus!]} · {proteinOk} de {counted} días al 95% o más
            </span>
          </div>
        </div>
      )}
      {inProgress && ready && <div className="mt-1.5 text-[11px] text-textMuted">Mes en curso: así viene hasta hoy. Se define cuando termina.</div>}
    </div>
  );
}
