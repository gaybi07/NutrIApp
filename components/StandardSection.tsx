"use client";

import { useState } from "react";
import { MonthStandard } from "@/lib/monthStandard";
import { BannerPattern, BannerStyles, MonthBanner, isStyleLocked, patternFor } from "@/components/MonthBanner";
import { fmtDate } from "@/lib/calculations";
import { StandardDesigner } from "@/components/StandardDesigner";
import { btn } from "@/components/buttonStyles";
import { STATUS_BG } from "@/components/WeekGoalGrid";

const MONTH_NAMES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** Estandarte del perfil: el mes en curso (transparente, "así venís") con flechas para ver los anteriores y un botón de estilo. */
export function StandardSection({
  standards,
  styles,
  onSaveStyle,
}: {
  /** El mes en curso primero, después los anteriores. */
  standards: MonthStandard[];
  styles: BannerStyles;
  onSaveStyle: (scope: "mes" | "todos", month: string, pattern: BannerPattern) => void;
}) {
  const [index, setIndex] = useState(0);
  const [designing, setDesigning] = useState(false);
  const [explain, setExplain] = useState(false);
  const standard = standards[Math.min(index, standards.length - 1)];
  const name = MONTH_NAMES[Number(standard.month.slice(5)) - 1];
  return (
    <div className="rounded-xl border border-border bg-bg/40 p-3">
      <div className="font-mono text-[9px] uppercase tracking-wide text-gold">Estandarte</div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="font-display text-lg capitalize">
          {name}
          {index === 0 ? <span className="ml-2 font-mono text-[10px] uppercase tracking-wide text-textMuted">en curso</span> : null}
        </span>
        <span className="flex gap-1.5">
          <button type="button" disabled={index >= standards.length - 1} onClick={() => setIndex((i) => i + 1)} className={btn("neutral", "sm")} aria-label="Mes anterior">
            ◂
          </button>
          <button type="button" disabled={index === 0} onClick={() => setIndex((i) => i - 1)} className={btn("neutral", "sm")} aria-label="Mes siguiente">
            ▸
          </button>
        </span>
      </div>
      <div className="mt-1.5 cursor-pointer" onClick={() => setExplain((v) => !v)} role="button" aria-expanded={explain}>
        <MonthBanner standard={standard} pattern={patternFor(styles, standard.month)} inProgress={index === 0} todayFecha={fmtDate(new Date())} />
      </div>
      <div className="mt-1.5 text-center font-mono text-[9px] uppercase tracking-wide text-textMuted">
        {explain ? "Tocá de nuevo para cerrar la explicación" : "Tocá el estandarte para ver qué significan tus colores"}
      </div>
      {explain && <StandardExplanation standard={standard} />}
      <button type="button" onClick={() => setDesigning(true)} className={`${btn("secondary", "sm", true)} mt-3`}>
        {isStyleLocked(styles, standard.month) ? "Ver estilo 🔒" : "Estilo"}
      </button>
      {designing && (
        <StandardDesigner
          standard={standard}
          styles={styles}
          onSave={(scope, pattern) => {
            onSaveStyle(scope, standard.month, pattern);
            setDesigning(false);
          }}
          onClose={() => setDesigning(false)}
        />
      )}
    </div>
  );
}

const COLOR_NAME = { violeta: "Violeta", verde: "Verde", amarillo: "Amarillo", rojo: "Rojo" } as const;

/** Explica el estandarte tocado: qué mide el fondo y qué mide la línea, la escala de colores y cómo salió cada semana. */
function StandardExplanation({ standard }: { standard: MonthStandard }) {
  const pctOf = (ok: number, total: number) => (total > 0 ? Math.round((ok / total) * 100) : 0);
  const dot = (status: keyof typeof STATUS_BG | null, round = false) => (
    <span className={`inline-block h-3.5 w-3.5 shrink-0 ${round ? "rounded-full" : "rounded"}`} style={status ? { background: STATUS_BG[status] } : { border: "1px dashed rgb(var(--color-text-muted))" }} />
  );
  return (
    <div className="mt-2 space-y-3 rounded-lg border border-border bg-bg/40 p-3 text-[12px] text-text">
      <div>
        <div className="font-semibold">El fondo mide tus kilocalorías</div>
        <div className="mt-0.5 flex items-center gap-2 text-textMuted">
          {dot(standard.kcalStatus)}
          {standard.kcalStatus
            ? `${COLOR_NAME[standard.kcalStatus]}: ${standard.kcalOk} de ${standard.counted} días (${pctOf(standard.kcalOk, standard.counted)}%) dentro del objetivo de kcal`
            : "Todavía no hay suficientes días cerrados."}
        </div>
      </div>
      <div>
        <div className="font-semibold">La línea mide tu proteína</div>
        <div className="mt-0.5 flex items-center gap-2 text-textMuted">
          {dot(standard.proteinStatus, true)}
          {standard.proteinStatus
            ? `${COLOR_NAME[standard.proteinStatus]}: ${standard.proteinOk} de ${standard.counted} días (${pctOf(standard.proteinOk, standard.counted)}%) con la proteína al 95% o más`
            : "Todavía no hay suficientes días cerrados."}
        </div>
      </div>
      <div>
        <div className="font-semibold">Qué significa cada color (según el porcentaje de días cumplidos)</div>
        <div className="mt-1 space-y-0.5 text-textMuted">
          <div className="flex items-center gap-2">{dot("violeta")} Violeta: 90% o más de los días</div>
          <div className="flex items-center gap-2">{dot("verde")} Verde: entre 70% y 90%</div>
          <div className="flex items-center gap-2">{dot("amarillo")} Amarillo: entre 40% y 70%</div>
          <div className="flex items-center gap-2">{dot("rojo")} Rojo: menos de 40%</div>
        </div>
      </div>
      <div>
        <div className="font-semibold">Las cuatro semanas de abajo</div>
        <div className="mt-1 space-y-1 text-textMuted">
          {standard.weeks.map((w, i) => (
            <div key={w.start} className="flex items-center gap-2">
              <span className="w-10 shrink-0 font-mono text-[10px] uppercase">Sem {i + 1}</span>
              {w.kcalStatus && w.proteinStatus ? (
                <>
                  {dot(w.kcalStatus)}
                  <span>
                    kcal {w.kcalOk}/{w.counted}
                  </span>
                  {dot(w.proteinStatus, true)}
                  <span>
                    proteína {w.proteinOk}/{w.counted}
                  </span>
                </>
              ) : (
                <span>Faltan días: hacen falta 3 cerrados (llevás {w.counted})</span>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="text-[11px] text-textMuted">Kcal cumplida = día dentro de tu objetivo de kcal. Proteína cumplida = día con la proteína al 95% o más de tu objetivo.</div>
    </div>
  );
}
