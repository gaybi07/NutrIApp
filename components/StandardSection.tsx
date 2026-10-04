"use client";

import { useState } from "react";
import { MonthStandard } from "@/lib/monthStandard";
import { BANNER_PATTERNS, BannerPattern, MonthBanner } from "@/components/MonthBanner";
import { btn, chip } from "@/components/buttonStyles";

const MONTH_NAMES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** Estandarte del perfil: el mes en curso (transparente, "así venís") con flechas para ver los anteriores y el estilo de la línea. */
export function StandardSection({
  standards,
  pattern,
  onPatternChange,
}: {
  /** El mes en curso primero, después los anteriores. */
  standards: MonthStandard[];
  pattern: BannerPattern;
  onPatternChange: (pattern: BannerPattern) => void;
}) {
  const [index, setIndex] = useState(0);
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
        <MonthBanner standard={standard} pattern={pattern} inProgress={index === 0} />
      </div>
      <div className="mt-3 font-mono text-[9px] uppercase tracking-wide text-textMuted">Estilo de la línea</div>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {BANNER_PATTERNS.map((p) => (
          <button key={p.id} type="button" onClick={() => onPatternChange(p.id)} className={chip(pattern === p.id)}>
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
