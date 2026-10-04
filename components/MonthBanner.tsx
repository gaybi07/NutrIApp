"use client";

import { MonthStandard } from "@/lib/monthStandard";
import { STATUS_BG } from "@/components/WeekGoalGrid";
import { ProteinSymbol } from "@/components/DayCell";

const NAME = { violeta: "Violeta", verde: "Verde", amarillo: "Amarillo", rojo: "Rojo" } as const;

export type BannerPattern =
  | "onda"
  | "triangulos"
  | "dobles"
  | "cruz"
  | "diagonal"
  | "ondaDoble"
  | "escalera"
  | "arcos"
  | "rombos"
  | "puntos"
  | "barras"
  | "recta";

/** Caja de dibujo: 300 x 64. Cada estilo es una lista de líneas (se dibujan con borde blanco) y, a veces, puntos. */
const rombos = [0, 1, 2, 3, 4].map((i) => `M${i * 60 + 5} 32 L${i * 60 + 30} 10 L${i * 60 + 55} 32 L${i * 60 + 30} 54 Z`);
const PATTERNS: Record<BannerPattern, { label: string; paths: string[]; dots?: { cx: number; cy: number; r: number }[] }> = {
  onda: { label: "Onda", paths: ["M0 32 Q 18.75 8 37.5 32 T 75 32 T 112.5 32 T 150 32 T 187.5 32 T 225 32 T 262.5 32 T 300 32"] },
  triangulos: { label: "Triángulos", paths: ["M0 44 L25 20 L50 44 L75 20 L100 44 L125 20 L150 44 L175 20 L200 44 L225 20 L250 44 L275 20 L300 44"] },
  dobles: { label: "Dos líneas", paths: ["M0 22 L300 22", "M0 42 L300 42"] },
  cruz: { label: "Cruz", paths: ["M0 4 L300 60", "M0 60 L300 4"] },
  diagonal: { label: "Diagonal", paths: ["M0 58 L300 6"] },
  ondaDoble: {
    label: "Ondas cruzadas",
    paths: ["M0 32 Q 25 6 50 32 T 100 32 T 150 32 T 200 32 T 250 32 T 300 32", "M0 32 Q 25 58 50 32 T 100 32 T 150 32 T 200 32 T 250 32 T 300 32"],
  },
  escalera: { label: "Escalera", paths: ["M0 54 H40 V42 H80 V30 H120 V18 H160 V30 H200 V42 H240 V54 H280 V42 H300"] },
  arcos: { label: "Arcos", paths: ["M0 46 Q 25 4 50 46 Q 75 4 100 46 Q 125 4 150 46 Q 175 4 200 46 Q 225 4 250 46 Q 275 4 300 46"] },
  rombos: { label: "Rombos", paths: rombos },
  puntos: { label: "Puntos", paths: [], dots: [0, 1, 2, 3, 4, 5, 6].map((i) => ({ cx: 22 + i * 43, cy: 32, r: 8 })) },
  barras: { label: "Barras", paths: [0, 1, 2, 3, 4, 5, 6].map((i) => `M${22 + i * 43} 12 V52`) },
  recta: { label: "Recta", paths: ["M0 32 L300 32"] },
};
export const BANNER_PATTERNS: { id: BannerPattern; label: string }[] = (Object.keys(PATTERNS) as BannerPattern[]).map((id) => ({ id, label: PATTERNS[id].label }));

/** Estilos del estandarte: uno por mes, o uno para todos los meses. Una vez guardado, no se cambia. */
export interface BannerStyles {
  default?: BannerPattern;
  months: Record<string, BannerPattern>;
}

/** El estilo que le toca a un mes: el suyo, si no el de "todos los meses", si no la onda. */
export function patternFor(styles: BannerStyles, month: string): BannerPattern {
  return styles.months[month] ?? styles.default ?? "onda";
}
export const isStyleLocked = (styles: BannerStyles, month: string) => styles.months[month] !== undefined || styles.default !== undefined;

/** La línea del estandarte (solo el dibujo), reutilizable para las miniaturas del diseñador. */
export function BannerArt({ pattern, lineColor, background, inProgress = false, heightClass = "h-16", flat = false }: { pattern: BannerPattern; lineColor: string; background: string; inProgress?: boolean; heightClass?: string; flat?: boolean }) {
  const def = PATTERNS[pattern];
  return (
    <div className={`${heightClass} overflow-hidden ${flat ? "" : "rounded-lg"}`} style={{ background, opacity: inProgress ? 0.55 : 1 }}>
      <svg viewBox="0 0 300 64" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden>
        {def.paths.map((d, i) => (
          <g key={i}>
            <path d={d} fill="none" stroke="#ffffff" strokeWidth={13} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            <path d={d} fill="none" style={{ stroke: lineColor }} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </g>
        ))}
        {def.dots?.map((c, i) => (
          <circle key={i} cx={c.cx} cy={c.cy} r={c.r} style={{ fill: lineColor }} stroke="#ffffff" strokeWidth={3} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
    </div>
  );
}

/**
 * La pieza completa, como una sola imagen: arriba el estandarte del mes y pegadas abajo las cuatro semanas, todo con el mismo
 * estilo de línea y separado por líneas blancas.
 */
export function StandardFlag({ standard, pattern, inProgress, todayFecha }: { standard: MonthStandard; pattern: BannerPattern; inProgress: boolean; todayFecha: string }) {
  const ready = standard.kcalStatus !== null && standard.proteinStatus !== null;
  return (
    <div>
      <div className="overflow-hidden rounded-xl bg-white p-[2px]">
        <div className="overflow-hidden rounded-[10px]">
          {ready ? (
            <BannerArt pattern={pattern} lineColor={STATUS_BG[standard.proteinStatus!]} background={STATUS_BG[standard.kcalStatus!]} inProgress={inProgress} heightClass="h-20" flat />
          ) : (
            <div className="flex h-20 items-center justify-center bg-bg/60 px-3 text-center text-[12px] text-textMuted">
              Hacen falta 7 días cerrados para calcularlo. Llevás {standard.counted}.
            </div>
          )}
        </div>
        <div className="mt-[2px] grid grid-cols-4 gap-[2px] overflow-hidden rounded-[10px]">
          {standard.weeks.map((w) => {
            const weekReady = w.kcalStatus !== null && w.proteinStatus !== null;
            return weekReady ? (
              <BannerArt key={w.start} pattern={pattern} lineColor={STATUS_BG[w.proteinStatus!]} background={STATUS_BG[w.kcalStatus!]} inProgress={w.end >= todayFecha} heightClass="h-11" flat />
            ) : (
              <div key={w.start} className="h-11 bg-bg/60" />
            );
          })}
        </div>
      </div>
      <div className="mt-1 grid grid-cols-4 gap-[2px] text-center font-mono text-[8.5px] uppercase tracking-wide text-textMuted">
        {standard.weeks.map((w, i) => (
          <span key={w.start}>Sem {i + 1}</span>
        ))}
      </div>
    </div>
  );
}

/**
 * Estandarte de un mes, simple: TODO el fondo es un solo color, el promedio de las kilocalorías del mes, y por encima pasa una
 * línea (con el patrón que elige cada uno) del color del promedio de la proteína, con los bordes blancos. Si el mes todavía está
 * en curso se ve transparente; si no tiene los 7 días cerrados mínimos, dice cuántos faltan.
 */
export function MonthBanner({ standard, pattern = "onda", inProgress = false, todayFecha }: { standard: MonthStandard; pattern?: BannerPattern; inProgress?: boolean; todayFecha: string }) {
  const { kcalStatus, proteinStatus, kcalOk, proteinOk, counted } = standard;
  const ready = kcalStatus !== null && proteinStatus !== null;
  return (
    <div>
      <StandardFlag standard={standard} pattern={pattern} inProgress={inProgress} todayFecha={todayFecha} />
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
