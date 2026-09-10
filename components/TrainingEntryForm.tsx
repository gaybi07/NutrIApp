"use client";

import { useState } from "react";
import { DayEntry, TrainingIntensity, TrainingSession, INTENSITY_STYLES } from "@/lib/types";
import { estimateTrainingCalories, getTrainingSessions } from "@/lib/calculations";
import { clampNumber, countDigits, MAX_MINUTES_DIGITS } from "@/lib/inputLimits";

const INTENSITIES: TrainingIntensity[] = ["leve", "moderado", "exigente", "fallo"];

function sessionCalories(intensidad: TrainingIntensity, minutos: number, pesoKg?: number) {
  return estimateTrainingCalories({
    fecha: "",
    desK: 0, desP: 0, almK: 0, almP: 0, merK: 0, merP: 0, cenK: 0, cenP: 0,
    pasos: 0,
    entreno: true,
    pesoKg,
    entrenamientos: [{ intensidad, minutos }],
  });
}

export function TrainingEntryForm({ entry, onSave }: { entry: DayEntry; onSave: (entry: DayEntry) => void }) {
  const [pasos, setPasos] = useState(entry.pasos ? String(entry.pasos) : "");
  const [sessions, setSessions] = useState<TrainingSession[]>(getTrainingSessions(entry));
  const [nuevaIntensidad, setNuevaIntensidad] = useState<TrainingIntensity>("moderado");
  const [nuevosMinutos, setNuevosMinutos] = useState("60");

  const addSession = () => {
    setSessions((prev) => [...prev, { intensidad: nuevaIntensidad, minutos: clampNumber(Number(nuevosMinutos) || 60, 9999) }]);
  };

  const removeSession = (index: number) => {
    setSessions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave({
      ...entry,
      pasos: clampNumber(Number(pasos) || 0),
      entreno: sessions.length > 0,
      entrenoIntensidad: sessions[0]?.intensidad,
      entrenoMinutos: sessions[0]?.minutos,
      entrenamientos: sessions,
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
          max="999999"
          step="100"
          inputMode="numeric"
          value={pasos}
          onChange={(event) => setPasos(event.target.value)}
          placeholder="0"
          className="w-full"
        />
      </div>

      <div className="mb-3">
        <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted">
          Entrenamientos de hoy {sessions.length > 0 && `(${sessions.length})`}
        </label>

        {sessions.length > 0 && (
          <div className="mb-2 space-y-1.5">
            {sessions.map((session, index) => {
              const style = INTENSITY_STYLES[session.intensidad];
              return (
                <div
                  key={index}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg/40 px-2.5 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: style.background }} />
                    <span className="font-mono text-[11px] text-text">
                      {style.label} · {session.minutos} min · +{sessionCalories(session.intensidad, session.minutos, entry.pesoKg)} kcal
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSession(index)}
                    className="shrink-0 font-mono text-[11px] text-rust"
                    aria-label={`Quitar entrenamiento ${index + 1}`}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="rounded-lg border border-dashed border-border bg-bg/20 p-2.5">
          <div className="mb-1.5 font-mono text-[9px] uppercase tracking-wide text-textMuted">Agregar entrenamiento</div>
          <div className="flex flex-wrap gap-1.5">
            {INTENSITIES.map((value) => {
                const style = INTENSITY_STYLES[value];
                const active = nuevaIntensidad === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setNuevaIntensidad(value)}
                    className={`rounded-lg border px-2 py-1.5 text-left font-mono text-[9.5px] uppercase tracking-wide transition-colors ${
                      active ? "" : "border-border text-textMuted"
                    }`}
                    style={active ? { background: style.background, color: style.color, borderColor: style.background } : undefined}
                  >
                    {style.label}
                  </button>
                );
              })}
          </div>
          <div className="mt-2 text-[11px] text-textMuted">{INTENSITY_STYLES[nuevaIntensidad].description}</div>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="9999"
              step="5"
              value={nuevosMinutos}
              onChange={(event) => {
                if (countDigits(event.target.value) <= MAX_MINUTES_DIGITS) setNuevosMinutos(event.target.value);
              }}
              className="flex-1"
              aria-label="Duración en minutos"
            />
            <span className="font-mono text-[11px] uppercase text-textMuted">min</span>
            <button
              type="button"
              onClick={addSession}
              className="shrink-0 rounded-lg border border-gold/60 bg-gold px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-bg"
            >
              + Agregar
            </button>
          </div>
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
