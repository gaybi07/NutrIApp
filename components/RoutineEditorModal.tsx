"use client";

import { biserieColor } from "@/lib/biserie";
import { useState } from "react";
import { ExerciseEntry, MuscleGroup, MUSCLE_GROUP_LABELS } from "@/lib/types";
import { clampNumber } from "@/lib/inputLimits";
import { ExercisePicker } from "@/components/ExercisePicker";
import { LibraryExercise, bodyweightPct, muscleGroupFor, usesTwoDumbbells } from "@/lib/exerciseLibrary";
import { Search } from "lucide-react";

const MUSCLE_GROUPS: MuscleGroup[] = ["pecho", "espalda", "hombros", "piernas", "brazos", "core"];

function emptyExercise(): ExerciseEntry {
  return { nombre: "", series: 4, repeticiones: 10, peso: undefined };
}

/**
 * Editor de rutina (nombre + lista de ejercicios con series/reps/peso, con
 * buscador de la biblioteca) -- compartido entre "Tus rutinas para alumnos"
 * (TrainerPanel) y "Cargar rutina" desde el entrenamiento en vivo
 * (LiveWorkout). `initial` solo necesita nombre/ejercicios (más un id
 * opcional si es una edición) -- un TrainerRoutine o Routine completos
 * calzan igual de bien acá.
 */
export function RoutineEditorModal({
  initial,
  onSave,
  onClose,
}: {
  initial: { id?: string; nombre: string; ejercicios: ExerciseEntry[] } | null;
  onSave: (routine: { id?: string; nombre: string; ejercicios: ExerciseEntry[] }) => void;
  onClose: () => void;
}) {
  const [nombre, setNombre] = useState(initial?.nombre || "");
  const [ejercicios, setEjercicios] = useState<ExerciseEntry[]>(initial?.ejercicios.map((e) => ({ ...e })) || [emptyExercise()]);
  const [libraryTarget, setLibraryTarget] = useState<number | null>(null);

  const updateExercise = (index: number, patch: Partial<ExerciseEntry>) =>
    setEjercicios((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  const addExercise = () => setEjercicios((prev) => [...prev, emptyExercise()]);
  const removeExercise = (index: number) => setEjercicios((prev) => prev.filter((_, i) => i !== index));

  // Biserie: unir un ejercicio con el anterior (comparten un id) o separarlos. Si se saca uno de un par, el otro queda suelto.
  const toggleBiserie = (index: number) =>
    setEjercicios((prev) => {
      if (index === 0) return prev;
      const current = prev[index];
      const before = prev[index - 1];
      if (current.biserie && current.biserie === before.biserie) {
        const id = current.biserie;
        const next = prev.map((e, i) => (i === index ? { ...e, biserie: undefined } : e));
        const remaining = next.filter((e) => e.biserie === id).length;
        return remaining < 2 ? next.map((e) => (e.biserie === id ? { ...e, biserie: undefined } : e)) : next;
      }
      const id = before.biserie ?? Math.random().toString(36).slice(2, 8);
      return prev.map((e, i) => (i === index || i === index - 1 ? { ...e, biserie: id } : e));
    });

  const pickFromLibrary = (exercise: LibraryExercise) => {
    if (libraryTarget === null) return;
    const nombreEjercicio = exercise.nameEs || exercise.name;
    const grupoMuscular = muscleGroupFor(exercise.primaryMuscles);
    if (libraryTarget === -1) setEjercicios((prev) => [...prev, { ...emptyExercise(), nombre: nombreEjercicio, grupoMuscular }]);
    else updateExercise(libraryTarget, { nombre: nombreEjercicio, grupoMuscular });
    setLibraryTarget(null);
  };

  const handleSave = () => {
    const clean = ejercicios.filter((e) => e.nombre.trim());
    if (!nombre.trim() || clean.length === 0) return;
    onSave({ id: initial?.id, nombre: nombre.trim(), ejercicios: clean });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <label>Nombre de la rutina</label>
        <input
          type="text"
          placeholder="Ej: Día A: Pecho/Tríceps"
          value={nombre}
          onChange={(event) => setNombre(event.target.value)}
          className="w-full"
        />
        <div className="mt-3 space-y-2">
          {ejercicios.map((ex, i) => (
            <div key={i} className={`rounded-lg border border-border bg-bg/40 p-2.5 ${ex.biserie ? "border-l-4" : ""}`} style={ex.biserie ? { borderLeftColor: biserieColor(ejercicios, ex.biserie) } : undefined}>
              {i > 0 && (
                <button
                  type="button"
                  onClick={() => toggleBiserie(i)}
                  style={ex.biserie && ex.biserie === ejercicios[i - 1].biserie ? { borderColor: biserieColor(ejercicios, ex.biserie), color: biserieColor(ejercicios, ex.biserie) } : undefined}
                  className={`mb-1.5 w-full rounded-md border px-2 py-1 font-mono text-[9px] uppercase tracking-wide ${
                    ex.biserie && ex.biserie === ejercicios[i - 1].biserie ? "" : "border-dashed border-border text-textMuted"
                  }`}
                >
                  {ex.biserie && ex.biserie === ejercicios[i - 1].biserie ? "✓ Biserie con el anterior (tocá para separar)" : "+ Unir con el anterior (biserie)"}
                </button>
              )}
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  placeholder="Ej: Press banca"
                  value={ex.nombre}
                  onChange={(event) => updateExercise(i, { nombre: event.target.value })}
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => setLibraryTarget(i)}
                  className="ml-2 shrink-0 rounded-md border border-border px-1.5 py-1 text-[12px]"
                  aria-label="Buscar en la biblioteca de ejercicios"
                >
                  <Search size={16} strokeWidth={1.8} />
                </button>
                <button type="button" onClick={() => removeExercise(i)} className="ml-1 shrink-0 font-mono text-[11px] text-rust" aria-label="Quitar ejercicio">
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
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                <label className="flex items-center gap-1.5 rounded-md border border-border bg-bg/30 px-2 py-1.5 text-[11px] text-text">
                  <input
                    type="checkbox"
                    checked={usesTwoDumbbells(ex)}
                    onChange={(event) => updateExercise(i, { mancuernas: event.target.checked })}
                    className="h-3.5 w-3.5"
                  />
                  Mancuernas (peso por mancuerna)
                </label>
                <div>
                  <select
                    value={String(bodyweightPct(ex))}
                    onChange={(event) => updateExercise(i, { pesoCorporalPct: Number(event.target.value) })}
                    aria-label="Peso corporal"
                  >
                    <option value="0">Sin peso corporal</option>
                    <option value="100">Peso corporal 100% (dominadas, fondos)</option>
                    <option value="65">Peso corporal 65% (flexiones)</option>
                    <option value="50">Peso corporal 50%</option>
                    <option value="25">Peso corporal 25%</option>
                  </select>
                </div>
              </div>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                <div>
                  <label className="mb-0.5 block font-mono text-[8.5px] uppercase text-textMuted">Dropset (última serie)</label>
                  <select
                    value={ex.dropsets?.caidas ?? 0}
                    onChange={(event) => {
                      const caidas = Number(event.target.value);
                      updateExercise(i, { dropsets: caidas > 0 ? { caidas, reduccionPct: ex.dropsets?.reduccionPct ?? 20 } : undefined });
                    }}
                  >
                    <option value={0}>Sin dropset</option>
                    <option value={1}>1 caída</option>
                    <option value={2}>2 caídas</option>
                    <option value={3}>3 caídas</option>
                  </select>
                </div>
                {ex.dropsets && (
                  <div>
                    <label className="mb-0.5 block font-mono text-[8.5px] uppercase text-textMuted">Cada caída baja</label>
                    <select
                      value={ex.dropsets.reduccionPct}
                      onChange={(event) => updateExercise(i, { dropsets: { caidas: ex.dropsets!.caidas, reduccionPct: Number(event.target.value) } })}
                    >
                      {[10, 15, 20, 25, 30, 40].map((pct) => (
                        <option key={pct} value={pct}>
                          {pct}% menos peso
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="mt-1.5">
                <label className="mb-0.5 block font-mono text-[8.5px] uppercase text-textMuted">Grupo muscular</label>
                <select
                  value={ex.grupoMuscular ?? ""}
                  onChange={(event) => updateExercise(i, { grupoMuscular: (event.target.value || undefined) as MuscleGroup | undefined })}
                >
                  <option value="">Sin clasificar</option>
                  {MUSCLE_GROUPS.map((group) => (
                    <option key={group} value={group}>
                      {MUSCLE_GROUP_LABELS[group]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" onClick={addExercise} className="rounded-lg border border-dashed border-border px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-textMuted">
            + Agregar ejercicio
          </button>
          <button type="button" onClick={() => setLibraryTarget(-1)} className="flex items-center justify-center gap-1 rounded-lg border border-dashed border-gold/50 px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-gold">
            <Search size={16} strokeWidth={1.8} className="shrink-0" /> Desde biblioteca
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-textMuted">
            Cancelar
          </button>
          <button type="button" onClick={handleSave} className="rounded-lg border border-gold/60 bg-gold px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-white">
            Guardar rutina
          </button>
        </div>
      </div>
      {libraryTarget !== null && <ExercisePicker onSelect={pickFromLibrary} onClose={() => setLibraryTarget(null)} />}
    </div>
  );
}
