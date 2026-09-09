"use client";

import { useState } from "react";
import { DayEntry, TrainingIntensity, INTENSITY_STYLES } from "@/lib/types";
import { estimateTrainingCalories } from "@/lib/calculations";

export function TrainingEntryForm({ entry, onSave }: { entry: DayEntry; onSave: (entry: DayEntry) => void }) {
  const [pasos, setPasos] = useState(entry.pasos ? String(entry.pasos) : "");
  const [intensidad, setIntensidad] = useState<TrainingIntensity | "ninguno">(
    entry.entreno ? entry.entrenoIntensidad || "moderado" : "ninguno"
  );

  const handleSave = () => {
    onSave({
      ...entry,
      pasos: Math.max(0, Number(pasos) || 0),
      entreno: intensidad !== "ninguno",
      entrenoIntensidad: intensidad !== "ninguno" ? intensidad : undefined,
      entrenoMinutos: intensidad !== "ninguno" ? entry.entrenoMinutos || 60 : undefined,
    });
  };

  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold mb-1">Hoy</div>
      <h2 className="font-display text-xl leading-none mb-3">Pasos y entrenamiento</h2>

      <div className="mb-3">
        <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted">Pasos</label>
        <input
          type="number"
          min="0"
          step="100"
          inputMode="numeric"
          value={pasos}
          onChange={(event) => setPasos(event.target.value)}
          placeholder="0"
          className="w-full"
        />
      </div>

      <div className="mb-4">
        <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted">Entrenamiento</label>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(INTENSITY_STYLES) as Array<TrainingIntensity | "ninguno">).map((value) => {
            const style = INTENSITY_STYLES[value];
            const active = intensidad === value;
            const calories = value === "ninguno" ? 0 : estimateTrainingCalories({ ...entry, entreno: true, entrenoIntensidad: value });
            return (
              <button
                key={value}
                type="button"
                onClick={() => setIntensidad(value)}
                className={`rounded-lg border px-2 py-1.5 text-left font-mono text-[9.5px] uppercase tracking-wide transition-colors ${
                  active ? "" : "border-border text-textMuted"
                }`}
                style={active ? { background: style.background, color: style.color, borderColor: style.background } : undefined}
              >
                {style.label}
                {value !== "ninguno" && ` +${calories}`}
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        className="w-full rounded-lg p-3 font-sans font-bold text-sm"
        style={{ background: "#C9A227", color: "#1C1B18" }}
      >
        Guardar
      </button>
    </div>
  );
}
