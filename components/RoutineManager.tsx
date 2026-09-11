"use client";

import { useState } from "react";
import { ExerciseEntry, Routine, TrainingSchedule, Weekday, WEEKDAY_LABELS } from "@/lib/types";
import { clampNumber } from "@/lib/inputLimits";
import { SECTION_HELP } from "@/lib/helpText";
import { InfoHint } from "@/components/InfoHint";

const ORDERED_WEEKDAYS: Weekday[] = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

function emptyExercise(): ExerciseEntry {
  return { nombre: "", series: 4, repeticiones: 10, peso: undefined };
}

function newRoutineId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function RoutineManager({
  routines,
  schedule,
  onSaveRoutines,
  onSaveSchedule,
}: {
  routines: Routine[];
  schedule: TrainingSchedule;
  onSaveRoutines: (routines: Routine[]) => void;
  onSaveSchedule: (schedule: TrainingSchedule) => void;
}) {
  const [pickerDay, setPickerDay] = useState<Weekday | null>(null);
  const [editing, setEditing] = useState<Routine | null>(null);

  const assignDay = (day: Weekday, routineId: string | null) => {
    const next = { ...schedule };
    if (routineId) next[day] = routineId;
    else delete next[day];
    onSaveSchedule(next);
    setPickerDay(null);
  };

  const startNewRoutine = () => {
    setEditing({ id: newRoutineId(), nombre: "", ejercicios: [emptyExercise()] });
  };

  const startEditRoutine = (routine: Routine) => {
    setEditing({ ...routine, ejercicios: routine.ejercicios.map((e) => ({ ...e })) });
  };

  const deleteRoutine = (id: string) => {
    onSaveRoutines(routines.filter((r) => r.id !== id));
    const next = { ...schedule };
    let changed = false;
    for (const day of ORDERED_WEEKDAYS) {
      if (next[day] === id) {
        delete next[day];
        changed = true;
      }
    }
    if (changed) onSaveSchedule(next);
  };

  const saveEditing = () => {
    if (!editing) return;
    const nombre = editing.nombre.trim() || "Rutina sin nombre";
    const ejercicios = editing.ejercicios.filter((e) => e.nombre.trim());
    const cleaned: Routine = { id: editing.id, nombre, ejercicios };
    const exists = routines.some((r) => r.id === cleaned.id);
    onSaveRoutines(exists ? routines.map((r) => (r.id === cleaned.id ? cleaned : r)) : [...routines, cleaned]);
    setEditing(null);
  };

  const updateExercise = (index: number, patch: Partial<ExerciseEntry>) => {
    if (!editing) return;
    setEditing({ ...editing, ejercicios: editing.ejercicios.map((e, i) => (i === index ? { ...e, ...patch } : e)) });
  };

  const addExercise = () => {
    if (!editing) return;
    setEditing({ ...editing, ejercicios: [...editing.ejercicios, emptyExercise()] });
  };

  const removeExercise = (index: number) => {
    if (!editing) return;
    setEditing({ ...editing, ejercicios: editing.ejercicios.filter((_, i) => i !== index) });
  };

  return (
    <div>
      <div className="mb-4 rounded-xl border border-border bg-surface p-3">
        <div className="mb-2 flex items-center font-mono text-[10px] uppercase tracking-[0.15em] text-gold">
          Tu rutina semanal
          <InfoHint text={SECTION_HELP.rutinaSemanal} label="Qué es la rutina semanal" />
        </div>
        <div className="space-y-1.5">
          {ORDERED_WEEKDAYS.map((day) => {
            const routineId = schedule[day];
            const routine = routineId ? routines.find((r) => r.id === routineId) : undefined;
            return (
              <button
                key={day}
                type="button"
                onClick={() => setPickerDay(day)}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-bg/40 px-2.5 py-2 text-left"
              >
                <span className="font-mono text-[10px] uppercase tracking-wide text-textMuted">{WEEKDAY_LABELS[day]}</span>
                <span className={`font-mono text-[11px] ${routine ? "text-sage" : "text-textMuted"}`}>
                  {routine ? routine.nombre : "Descanso"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center font-mono text-[10px] uppercase tracking-[0.15em] text-gold">
            Tus rutinas
            <InfoHint text={SECTION_HELP.rutinas} label="Qué son las rutinas" />
          </div>
          <button
            type="button"
            onClick={startNewRoutine}
            className="rounded-full border border-gold/60 bg-gold px-2.5 py-1 font-mono text-[9px] uppercase tracking-wide text-bg"
          >
            + Nueva rutina
          </button>
        </div>
        {routines.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-3 text-[12px] text-textMuted">
            Todavía no armaste ninguna rutina.
          </div>
        ) : (
          <div className="space-y-2">
            {routines.map((routine) => (
              <div key={routine.id} className="rounded-lg border border-border bg-bg/40 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold">{routine.nombre}</div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => startEditRoutine(routine)}
                      className="rounded-full border border-border px-2 py-1 font-mono text-[9px] uppercase tracking-wide text-textMuted"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteRoutine(routine.id)}
                      className="rounded-full border border-rust/50 px-2 py-1 font-mono text-[9px] uppercase tracking-wide text-rust"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
                <div className="mt-1.5 space-y-0.5">
                  {routine.ejercicios.map((e, i) => (
                    <div key={i} className="font-mono text-[10px] text-textMuted">
                      {e.nombre} · {e.series}x{e.repeticiones}
                      {e.peso ? ` · ${e.peso}kg` : ""}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {pickerDay && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm" onClick={() => setPickerDay(null)}>
          <div
            className="max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="font-display text-lg text-text">{WEEKDAY_LABELS[pickerDay]}</div>
            <div className="mt-3 space-y-2">
              <button
                type="button"
                onClick={() => assignDay(pickerDay, null)}
                className="w-full rounded-lg border border-border bg-bg/40 p-2.5 text-left font-mono text-[11px] uppercase tracking-wide text-textMuted"
              >
                Descanso (sin rutina)
              </button>
              {routines.map((routine) => (
                <button
                  key={routine.id}
                  type="button"
                  onClick={() => assignDay(pickerDay, routine.id)}
                  className="w-full rounded-lg border border-border bg-bg/40 p-2.5 text-left"
                >
                  <div className="text-sm font-semibold">{routine.nombre}</div>
                  <div className="mt-0.5 font-mono text-[9px] uppercase tracking-wide text-textMuted">{routine.ejercicios.length} ejercicios</div>
                </button>
              ))}
              {routines.length === 0 && (
                <div className="rounded-lg border border-dashed border-border p-3 text-[12px] text-textMuted">Primero armá una rutina abajo.</div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setPickerDay(null)}
              className="mt-3 w-full rounded-lg border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-textMuted"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm" onClick={() => setEditing(null)}>
          <div
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <label>Nombre de la rutina</label>
            <input
              type="text"
              placeholder="Ej: Día A: Pecho/Tríceps"
              value={editing.nombre}
              onChange={(event) => setEditing({ ...editing, nombre: event.target.value })}
              className="w-full"
            />
            <div className="mt-3 space-y-2">
              {editing.ejercicios.map((ex, i) => (
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
                        onChange={(event) =>
                          updateExercise(i, { peso: event.target.value ? clampNumber(Number(event.target.value), 999) : undefined })
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addExercise}
              className="mt-2 w-full rounded-lg border border-dashed border-border px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-textMuted"
            >
              + Agregar ejercicio
            </button>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-textMuted"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveEditing}
                className="rounded-lg border border-gold/60 bg-gold px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-bg"
              >
                Guardar rutina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
