"use client";

import { useEffect, useState } from "react";
import { DayEntry, ExerciseEntry, Routine, TrainingSchedule } from "@/lib/types";
import { weekdayOf, totalVolume } from "@/lib/calculations";
import { clampNumber } from "@/lib/inputLimits";
import { SECTION_HELP } from "@/lib/helpText";
import { InfoHint } from "@/components/InfoHint";

function emptyExercise(): ExerciseEntry {
  return { nombre: "", series: 4, repeticiones: 10, peso: undefined };
}

export function ExerciseLogCard({
  entry,
  routines,
  schedule,
  onSave,
}: {
  entry: DayEntry;
  routines: Routine[];
  schedule: TrainingSchedule;
  onSave: (entry: DayEntry) => void;
}) {
  const scheduledRoutine = routines.find((r) => r.id === schedule[weekdayOf(entry.fecha)]);
  const hasSavedExercises = Boolean(entry.ejercicios && entry.ejercicios.length > 0);
  const preFilled = !hasSavedExercises;
  const [ejercicios, setEjercicios] = useState<ExerciseEntry[]>(() => {
    if (entry.ejercicios && entry.ejercicios.length > 0) return entry.ejercicios.map((e) => ({ ...e }));
    if (scheduledRoutine) return scheduledRoutine.ejercicios.map((e) => ({ ...e }));
    return [];
  });
  const [status, setStatus] = useState("");

  // Si todavía no guardaste nada hoy y armás/asignás una rutina recién ahora
  // (en la misma visita), esto la precarga sin necesidad de recargar la página.
  useEffect(() => {
    if (!hasSavedExercises && scheduledRoutine) {
      setEjercicios(scheduledRoutine.ejercicios.map((e) => ({ ...e })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduledRoutine?.id, hasSavedExercises]);

  const updateExercise = (index: number, patch: Partial<ExerciseEntry>) => {
    setEjercicios((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  };

  const addExercise = () => setEjercicios((prev) => [...prev, emptyExercise()]);
  const removeExercise = (index: number) => setEjercicios((prev) => prev.filter((_, i) => i !== index));

  const handleSave = () => {
    const clean = ejercicios.filter((e) => e.nombre.trim());
    onSave({ ...entry, ejercicios: clean });
    setStatus("Guardado ✓");
    setTimeout(() => setStatus(""), 2500);
  };

  return (
    <div className="mb-4 rounded-xl border border-border bg-surface p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center font-mono text-[10px] uppercase tracking-[0.15em] text-gold">
          Ejercicios de hoy
          <InfoHint text={SECTION_HELP.ejerciciosHoy} label="Qué es Ejercicios de hoy" />
        </div>
        {ejercicios.length > 0 && (
          <div className="font-mono text-[10px] text-textMuted">Vol. {totalVolume(ejercicios).toLocaleString("es-AR")} kg</div>
        )}
      </div>
      {scheduledRoutine && preFilled && (
        <div className="mb-2 rounded-lg border border-gold/30 bg-gold/10 px-2.5 py-1.5 text-[11px] text-textMuted">
          Precargado desde tu rutina de hoy ({scheduledRoutine.nombre}) — ajustá lo que realmente hiciste.
        </div>
      )}
      {ejercicios.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-3 text-[12px] text-textMuted">
          No tenés rutina asignada para hoy. Agregá ejercicios sueltos o armá una rutina en "Tus rutinas" más abajo.
        </div>
      ) : (
        <div className="space-y-2">
          {ejercicios.map((ex, i) => (
            <div key={i} className="rounded-lg border border-border bg-bg/40 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  placeholder="Ej: Press banca"
                  value={ex.nombre}
                  onChange={(event) => updateExercise(i, { nombre: event.target.value })}
                  className="flex-1"
                />
                <button type="button" onClick={() => removeExercise(i)} className="ml-2 shrink-0 font-mono text-[11px] text-rust" aria-label="Quitar ejercicio">
                  ×
                </button>
              </div>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                <div>
                  <label className="mb-0.5 block font-mono text-[8.5px] uppercase text-textMuted">Series</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={ex.series}
                    onChange={(event) => updateExercise(i, { series: clampNumber(Number(event.target.value), 99) })}
                  />
                </div>
                <div>
                  <label className="mb-0.5 block font-mono text-[8.5px] uppercase text-textMuted">Reps</label>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={ex.repeticiones}
                    onChange={(event) => updateExercise(i, { repeticiones: clampNumber(Number(event.target.value), 999) })}
                  />
                </div>
                <div>
                  <label className="mb-0.5 block font-mono text-[8.5px] uppercase text-textMuted">Peso (kg)</label>
                  <input
                    type="number"
                    min="0"
                    max="999"
                    step="0.5"
                    value={ex.peso ?? ""}
                    placeholder="—"
                    onChange={(event) => updateExercise(i, { peso: event.target.value ? clampNumber(Number(event.target.value), 999) : undefined })}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={addExercise}
        className="mt-2 w-full rounded-lg border border-dashed border-border px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-textMuted"
      >
        + Agregar ejercicio
      </button>
      <button
        type="button"
        onClick={handleSave}
        className="mt-2 w-full rounded-lg p-2.5 font-sans text-sm font-bold bg-gold text-bg"
      >
        Guardar
      </button>
      {status && <div className="mt-2 text-center font-mono text-[11px] text-sage">{status}</div>}
    </div>
  );
}
