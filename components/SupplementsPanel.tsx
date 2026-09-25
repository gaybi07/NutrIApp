"use client";

import { useState } from "react";
import { DayEntry, SUPPLEMENT_CATALOG, SupplementEntry } from "@/lib/types";

/**
 * Suplementos del día -- aparte de la carga de comidas a propósito (no
 * suman kcal/macros, no pasan por IA). Tocar un básico del catálogo lo
 * suma con su dosis habitual ya puesta; tocarlo de nuevo lo saca. "+ Otro"
 * es la única vía manual, para lo que no está en el catálogo.
 */
export function SupplementsPanel({ entry, onUpsert }: { entry: DayEntry; onUpsert: (entry: DayEntry) => void }) {
  const [customName, setCustomName] = useState("");
  const [customDose, setCustomDose] = useState("");
  const taken = entry.suplementos || [];

  const isTaken = (nombre: string) => taken.some((s) => s.nombre === nombre);

  const toggle = (supplement: SupplementEntry) => {
    const next = isTaken(supplement.nombre) ? taken.filter((s) => s.nombre !== supplement.nombre) : [...taken, supplement];
    onUpsert({ ...entry, suplementos: next });
  };

  const addCustom = () => {
    if (!customName.trim()) return;
    onUpsert({ ...entry, suplementos: [...taken, { nombre: customName.trim(), dosis: customDose.trim() || "—" }] });
    setCustomName("");
    setCustomDose("");
  };

  const removeCustom = (nombre: string) => onUpsert({ ...entry, suplementos: taken.filter((s) => s.nombre !== nombre) });

  const customTaken = taken.filter((s) => !SUPPLEMENT_CATALOG.some((c) => c.nombre === s.nombre));

  return (
    <div>
      <div className="font-display italic text-lg text-gold mb-1">💊 Suplementos</div>
      <div className="mb-3 text-xs text-textMuted">Tocá el que tomaste hoy -- se suma con su dosis habitual, sin escribir nada.</div>
      <div className="grid grid-cols-2 gap-1.5">
        {SUPPLEMENT_CATALOG.map((s) => {
          const active = isTaken(s.nombre);
          return (
            <button
              key={s.nombre}
              type="button"
              onClick={() => toggle(s)}
              className={`rounded-xl border px-3 py-2.5 text-left ${
                active ? "border-sage/60 bg-sage/10 text-sage" : "border-gold/60 bg-gold/5 text-text"
              }`}
            >
              <div className="text-[13px] font-semibold">{s.nombre}{active ? " ✓" : ""}</div>
              <div className="font-mono text-[10px] uppercase tracking-wide text-textMuted">{s.dosis}</div>
            </button>
          );
        })}
      </div>

      {customTaken.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {customTaken.map((s) => (
            <div key={s.nombre} className="flex items-center justify-between gap-2 rounded-lg border border-sage/40 bg-sage/10 px-2.5 py-2">
              <span className="min-w-0 flex-1 truncate text-[12px] text-text">
                {s.nombre} <span className="text-textMuted">· {s.dosis}</span>
              </span>
              <button type="button" onClick={() => removeCustom(s.nombre)} className="shrink-0 font-mono text-[10px] text-rust">
                Quitar
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 border-t border-dashed border-border pt-3">
        <div className="mb-1.5 font-mono text-[9px] uppercase tracking-wide text-textMuted">¿Tomaste algo que no está en la lista?</div>
        <div className="flex gap-1.5">
          <input
            type="text"
            placeholder="Nombre"
            maxLength={40}
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            className="min-w-0 flex-1"
          />
          <input
            type="text"
            placeholder="Dosis"
            maxLength={20}
            value={customDose}
            onChange={(e) => setCustomDose(e.target.value)}
            className="w-24 shrink-0"
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={!customName.trim()}
            className="shrink-0 rounded-lg border border-gold/60 bg-gold px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-bg disabled:opacity-50"
          >
            + Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
