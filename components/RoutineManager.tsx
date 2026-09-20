"use client";

import { useState } from "react";
import { Routine, TrainingSchedule, Weekday, WEEKDAY_LABELS } from "@/lib/types";
import { SECTION_HELP } from "@/lib/helpText";
import { Collapsible } from "@/components/Collapsible";
import { RoutineEditorModal } from "@/components/RoutineEditorModal";

const ORDERED_WEEKDAYS: Weekday[] = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

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
  // "new" = editor abierto para una rutina en blanco; una Routine puntual =
  // editando una existente; null = editor cerrado. Antes esto tenía su
  // propia copia entera del editor de ejercicios (con su propio buscador de
  // biblioteca) duplicando RoutineEditorModal -- unificado acá para que el
  // grupo muscular (y cualquier otro cambio futuro) se aplique en un solo lugar.
  const [editingRoutine, setEditingRoutine] = useState<Routine | "new" | null>(null);

  const assignDay = (day: Weekday, routineId: string | null) => {
    const next = { ...schedule };
    if (routineId) next[day] = routineId;
    else delete next[day];
    onSaveSchedule(next);
    setPickerDay(null);
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

  const saveRoutine = (routine: { id?: string; nombre: string; ejercicios: Routine["ejercicios"] }) => {
    const cleaned: Routine = { id: routine.id || newRoutineId(), nombre: routine.nombre, ejercicios: routine.ejercicios };
    const exists = routines.some((r) => r.id === cleaned.id);
    onSaveRoutines(exists ? routines.map((r) => (r.id === cleaned.id ? cleaned : r)) : [...routines, cleaned]);
    setEditingRoutine(null);
  };

  return (
    <div>
      <Collapsible eyebrow="Fuerza" title="Tu rutina semanal" info={SECTION_HELP.rutinaSemanal}>
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
      </Collapsible>

      <Collapsible
        eyebrow="Fuerza"
        title="Tus rutinas"
        info={SECTION_HELP.rutinas}
        badge={
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setEditingRoutine("new");
            }}
            className="rounded-full border border-gold/60 bg-gold px-2.5 py-1 font-mono text-[9px] uppercase tracking-wide text-bg"
          >
            + Nueva rutina
          </button>
        }
      >
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
                      onClick={() => setEditingRoutine(routine)}
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
      </Collapsible>

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

      {editingRoutine && (
        <RoutineEditorModal
          initial={editingRoutine === "new" ? null : editingRoutine}
          onSave={saveRoutine}
          onClose={() => setEditingRoutine(null)}
        />
      )}
    </div>
  );
}
