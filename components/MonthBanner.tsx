"use client";

import { useId } from "react";
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
 * La pieza completa, como UNA sola imagen: el estandarte del mes arriba y las cuatro semanas pegadas abajo. La línea del estilo
 * elegido atraviesa todo el dibujo de punta a punta, así que se une de arriba hacia abajo; cada tramo se pinta con su propio
 * color (el del mes arriba, el de cada semana abajo) y con su propio fondo de kilocalorías, separados por líneas blancas.
 */
export function StandardFlag({ standard, pattern, inProgress, todayFecha }: { standard: MonthStandard; pattern: BannerPattern; inProgress: boolean; todayFecha: string }) {
  const uid = useId().replace(/:/g, "");
  const H = 118; // alto total del dibujo; arriba 0-72 (mes), abajo 74-118 (semanas)
  const TOP = 72;
  const def = PATTERNS[pattern];
  const k = H / 64; // los estilos están dibujados en una caja de 64 de alto: se estiran para atravesar todo
  const monthReady = standard.kcalStatus !== null && standard.proteinStatus !== null;
  const zones = [
    { id: "m", x: 0, y: 0, w: 300, h: TOP, bg: monthReady ? STATUS_BG[standard.kcalStatus!] : null, line: monthReady ? STATUS_BG[standard.proteinStatus!] : null, dim: inProgress },
    ...standard.weeks.map((w, i) => {
      const ready = w.kcalStatus !== null && w.proteinStatus !== null;
      return { id: `w${i}`, x: i * 75, y: TOP + 2, w: 75, h: H - TOP - 2, bg: ready ? STATUS_BG[w.kcalStatus!] : null, line: ready ? STATUS_BG[w.proteinStatus!] : null, dim: w.end >= todayFecha };
    }),
  ];
  return (
    <div>
      <div className="relative overflow-hidden rounded-xl bg-white p-[2px]">
        <svg viewBox={`0 0 300 ${H}`} preserveAspectRatio="none" className="block h-32 w-full rounded-[10px]" aria-hidden>
          <defs>
            {zones.map((z) => (
              <clipPath key={z.id} id={`${uid}-${z.id}`}>
                <rect x={z.x} y={z.y} width={z.w} height={z.h} />
              </clipPath>
            ))}
          </defs>
          {zones.map((z) => (
            <g key={z.id} clipPath={`url(#${uid}-${z.id})`} opacity={z.dim && z.bg ? 0.55 : 1}>
              <rect x={z.x} y={z.y} width={z.w} height={z.h} style={{ fill: z.bg ?? "rgb(var(--color-bg) / 0.6)" }} />
              {z.line && (
                <>
                  {def.paths.map((d, i) => (
                    <g key={i} transform={`scale(1 ${k})`}>
                      <path d={d} fill="none" stroke="#ffffff" strokeWidth={13} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                      <path d={d} fill="none" style={{ stroke: z.line ?? undefined }} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                    </g>
                  ))}
                  {def.dots?.map((c, i) => (
                    <circle key={i} cx={c.cx} cy={c.cy * k} r={c.r} style={{ fill: z.line! }} stroke="#ffffff" strokeWidth={3} vectorEffect="non-scaling-stroke" />
                  ))}
                </>
              )}
            </g>
          ))}
          {/* Líneas blancas que separan el mes de las semanas y las semanas entre sí */}
          <rect x={0} y={TOP} width={300} height={2} fill="#ffffff" />
          {[75, 150, 225].map((x) => (
            <rect key={x} x={x - 1} y={TOP} width={2} height={H - TOP} fill="#ffffff" />
          ))}
        </svg>
        {!monthReady && (
          <div className="pointer-events-none absolute inset-x-0 top-[2px] flex h-[72px] items-center justify-center px-4 text-center text-[12px] text-textMuted" style={{ height: "56%" }}>
            Hacen falta 7 días cerrados para calcularlo. Llevás {standard.counted}.
          </div>
        )}
      </div>
      <div className="mt-1 grid grid-cols-4 text-center font-mono text-[8.5px] uppercase tracking-wide text-textMuted">
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
