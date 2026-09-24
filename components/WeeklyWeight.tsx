"use client";

import { useEffect, useState } from "react";
import { addDays, fmtDate, weightStreak } from "@/lib/calculations";
import { GoalMode } from "@/lib/types";
import { useEscapeKey } from "@/lib/useEscapeKey";
import { clampNumber } from "@/lib/inputLimits";
import { FIELD_HELP } from "@/lib/helpText";
import { InfoHint } from "@/components/InfoHint";

export function WeeklyWeight({
  weekKey,
  weights,
  goalMode,
  onSave,
}: {
  weekKey: string;
  weights: Record<string, number>;
  goalMode?: GoalMode;
  onSave: (weekKey: string, weight: number) => void;
}) {
  const savedWeight = weights[weekKey];
  const [value, setValue] = useState(savedWeight ? String(savedWeight) : "");
  const [open, setOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  useEscapeKey(() => setOpen(false), open);

  // Todo el historial, no solo la semana pasada -- antes acá solo se veía
  // el delta contra la semana anterior, sin forma de repasar las demás.
  const history = Object.entries(weights)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([wk, peso], i, arr) => ({ weekKey: wk, peso, prevPeso: arr[i + 1]?.[1] ?? null }));

  useEffect(() => {
    setValue(savedWeight ? String(savedWeight) : "");
  }, [savedWeight]);

  const handleSave = () => {
    const weight = clampNumber(Number(value));
    if (weight > 0) onSave(weekKey, weight);
  };

  const prevWeekKey = fmtDate(addDays(new Date(`${weekKey}T00:00:00`), -7));
  const prevWeight = weights[prevWeekKey];
  const delta = savedWeight && prevWeight ? Math.round((savedWeight - prevWeight) * 10) / 10 : null;
  const streak = weightStreak(weights, weekKey);

  const wantsDown = goalMode === "perder";
  const wantsUp = goalMode === "aumentar";
  const deltaIsGood = delta == null || delta === 0 ? null : wantsDown ? delta < 0 : wantsUp ? delta > 0 : null;

  const modal = open && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center font-display text-xl text-text">
          Peso de esta semana
          <InfoHint text={FIELD_HELP.pesoSemanal} />
        </div>
        <div className="mt-1 text-[11px] text-textMuted">Registralo una vez por semana para seguir tu evolución.</div>
        <input
          className="mt-3 w-full"
          type="number"
          min="1"
          max="999999"
          step="0.1"
          placeholder="Ej: 82.4"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-label="Peso semanal en kilogramos"
          autoFocus
        />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-textMuted">
            Cancelar
          </button>
          <button type="button" onClick={() => { handleSave(); setOpen(false); }} className="rounded-lg border border-gold/60 bg-gold px-3 py-2 font-sans text-[12px] font-bold text-bg">
            Guardar
          </button>
        </div>
      </div>
    </div>
  );

  if (!savedWeight) {
    return (
      <section className="mb-4 rounded-xl border-2 border-rust/50 bg-surface p-3 shadow-[0_0_24px_-6px_rgba(239,68,68,0.45)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">Control semanal</div>
            <h2 className="font-display text-lg text-text">Peso de esta semana</h2>
          </div>
          <div className="shrink-0 rounded-full border border-rust/50 bg-rust/15 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-rust">
            Pendiente
          </div>
        </div>
        <div className="mt-2 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-[11px] text-textMuted">
          Todavía no cargaste el peso de esta semana. Registralo para seguir tu evolución.
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 w-full rounded-lg border border-gold/60 bg-gold px-3 py-2 font-sans text-[12px] font-bold text-bg"
        >
          Cargar peso semanal
        </button>
        {modal}
      </section>
    );
  }

  return (
    <section className="mb-4 rounded-xl border border-border/60 bg-bg/30 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="font-sans font-bold text-2xl leading-none text-text">{savedWeight.toFixed(1)}</span>
          <span className="font-mono text-[9.5px] uppercase tracking-wide text-textMuted">kg esta semana</span>
        </div>
        <div className="flex items-center gap-2.5">
          {delta != null && (
            <span className={`font-mono text-[11px] ${deltaIsGood == null ? "text-textMuted" : deltaIsGood ? "text-sage" : "text-rust"}`}>
              {delta > 0 ? "▲" : delta < 0 ? "▼" : "="} {Math.abs(delta).toFixed(1)} kg
            </span>
          )}
          {streak >= 2 && <span className="font-mono text-[11px] text-gold">🔥 {streak}</span>}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="font-mono text-[9px] uppercase tracking-wide text-textMuted underline"
          >
            Editar
          </button>
        </div>
      </div>
      {history.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="mt-1.5 font-mono text-[9px] uppercase tracking-wide text-textMuted underline"
          >
            {showHistory ? "Ocultar historial" : `Ver historial (${history.length} semanas)`}
          </button>
          {showHistory && (
            <div className="mt-2 space-y-1 border-t border-dashed border-border pt-2">
              {history.map(({ weekKey: wk, peso, prevPeso }) => {
                const d = prevPeso != null ? Math.round((peso - prevPeso) * 10) / 10 : null;
                const dGood = d == null || d === 0 ? null : wantsDown ? d < 0 : wantsUp ? d > 0 : null;
                const date = new Date(`${wk}T00:00:00`);
                return (
                  <div key={wk} className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-textMuted">
                      {date.getDate()}/{date.getMonth() + 1}
                    </span>
                    <span className="text-text">{peso.toFixed(1)}kg</span>
                    <span className={dGood == null ? "text-textMuted" : dGood ? "text-sage" : "text-rust"}>
                      {d == null ? "—" : `${d > 0 ? "▲" : d < 0 ? "▼" : "="} ${Math.abs(d).toFixed(1)}kg`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
      {modal}
    </section>
  );
}
