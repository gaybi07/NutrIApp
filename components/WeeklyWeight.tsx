"use client";

import { useEffect, useState } from "react";

export function WeeklyWeight({
  weekKey,
  weights,
  onSave,
}: {
  weekKey: string;
  weights: Record<string, number>;
  onSave: (weekKey: string, weight: number) => void;
}) {
  const savedWeight = weights[weekKey];
  const [value, setValue] = useState(savedWeight ? String(savedWeight) : "");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setValue(savedWeight ? String(savedWeight) : "");
  }, [savedWeight]);

  const handleSave = () => {
    const weight = Number(value);
    if (weight > 0) onSave(weekKey, weight);
  };

  return (
    <section className="mb-4 rounded-xl border border-border bg-surface p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">Control semanal</div>
          <h2 className="font-display text-lg text-text">Peso de esta semana</h2>
        </div>
        {savedWeight ? <div className="font-mono text-lg text-sage">{savedWeight.toFixed(1)} kg</div> : <div className="text-[11px] text-rust">Pendiente</div>}
      </div>

      {!savedWeight && (
        <div className="mt-2 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-[11px] text-textMuted">
          Todavía no cargaste el peso de esta semana. Registralo para seguir tu evolución.
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 w-full rounded-lg border border-gold/60 bg-gold px-3 py-2 font-sans text-[12px] font-bold text-bg"
      >
        {savedWeight ? "Actualizar peso semanal" : "Cargar peso semanal"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="font-display text-xl text-text">Peso de esta semana</div>
            <div className="mt-1 text-[11px] text-textMuted">Registralo una vez por semana para seguir tu evolución.</div>
            <input
              className="mt-3 w-full"
              type="number"
              min="1"
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
      )}
    </section>
  );
}
