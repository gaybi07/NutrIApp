"use client";

import { useState } from "react";
import { MonthStandard } from "@/lib/monthStandard";
import { BannerPattern, BannerStyles, MonthBanner, WeekStrip, isStyleLocked, patternFor } from "@/components/MonthBanner";
import { fmtDate } from "@/lib/calculations";
import { StandardDesigner } from "@/components/StandardDesigner";
import { btn } from "@/components/buttonStyles";

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
      <div className="mt-1.5">
        <MonthBanner standard={standard} pattern={patternFor(styles, standard.month)} inProgress={index === 0} />
        <WeekStrip standard={standard} pattern={patternFor(styles, standard.month)} todayFecha={fmtDate(new Date())} />
      </div>
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
