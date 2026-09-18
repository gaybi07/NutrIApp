"use client";

import { useEffect, useState } from "react";
import {
  DayEntry,
  ExerciseEntry,
  ExerciseSetEntry,
  Routine,
  TrainingSchedule,
  TrainingIntensity,
  WorkoutSuggestion,
  INTENSITY_STYLES,
} from "@/lib/types";
import { weekdayOf, getTrainingSessions, compareExerciseVolume, suggestNextSession, WorkoutVerdict } from "@/lib/calculations";
import { clampNumber } from "@/lib/inputLimits";
import { SECTION_HELP } from "@/lib/helpText";
import { Collapsible } from "@/components/Collapsible";
import { ExercisePicker } from "@/components/ExercisePicker";
import { LibraryExercise } from "@/lib/exerciseLibrary";

const INTENSITIES: TrainingIntensity[] = ["leve", "moderado", "exigente", "fallo"];
const STORAGE_KEY = "registro:liveWorkout:v1";

interface DraftSet {
  repeticiones: number;
  peso?: number;
  intensidad?: TrainingIntensity;
}

interface DraftExercise {
  nombre: string;
  plannedSeries: number;
  plannedRepeticiones: number;
  plannedPeso?: number;
  suggestionNote?: string;
  sets: DraftSet[];
}

interface LiveSession {
  fecha: string;
  startedAt: number;
  routineId?: string;
  exercises: DraftExercise[];
}

interface ReportItem {
  nombre: string;
  verdict: WorkoutVerdict;
  nota: string;
}

interface Report {
  minutos: number;
  overallIntensidad: TrainingIntensity;
  items: ReportItem[];
}

function loadStoredSession(fecha: string): LiveSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LiveSession;
    return parsed.fecha === fecha ? parsed : null;
  } catch {
    return null;
  }
}

function defaultSet(repeticiones: number, peso?: number): DraftSet {
  return { repeticiones, peso, intensidad: undefined };
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

const VERDICT_LABEL: Record<WorkoutVerdict, { icon: string; text: string; color: string }> = {
  mejor: { icon: "▲", text: "Por encima de lo planificado", color: "text-sage" },
  similar: { icon: "●", text: "Como lo planificado", color: "text-textMuted" },
  peor: { icon: "▼", text: "Por debajo de lo planificado", color: "text-rust" },
};

export function LiveWorkout({
  entry,
  routines,
  schedule,
  onFinish,
  suggestions,
  onSaveSuggestions,
}: {
  entry: DayEntry;
  routines: Routine[];
  schedule: TrainingSchedule;
  onFinish: (entry: DayEntry) => void;
  suggestions: Record<string, WorkoutSuggestion>;
  onSaveSuggestions: (updates: Record<string, WorkoutSuggestion>) => void;
}) {
  const scheduledRoutine = routines.find((r) => r.id === schedule[weekdayOf(entry.fecha)]);
  const [session, setSession] = useState<LiveSession | null>(() => loadStoredSession(entry.fecha));
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [libraryTarget, setLibraryTarget] = useState<"new" | null>(null);
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [session]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (session) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(STORAGE_KEY);
  }, [session]);

  const startSession = () => {
    const exercises: DraftExercise[] = scheduledRoutine
      ? scheduledRoutine.ejercicios.map((e) => {
          const key = `${scheduledRoutine.id}::${e.nombre}`;
          const suggestion = suggestions[key];
          const peso = suggestion?.pesoSugerido ?? e.peso;
          return {
            nombre: e.nombre,
            plannedSeries: e.series,
            plannedRepeticiones: e.repeticiones,
            plannedPeso: e.peso,
            suggestionNote: suggestion?.nota,
            sets: Array.from({ length: e.series }, () => defaultSet(e.repeticiones, peso)),
          };
        })
      : [];
    setSession({ fecha: entry.fecha, startedAt: Date.now(), routineId: scheduledRoutine?.id, exercises });
    setOpenIndex(null);
  };

  const cancelSession = () => {
    if (!window.confirm("¿Cancelar el entrenamiento en vivo? Se pierde lo cargado hasta ahora.")) return;
    setSession(null);
    setOpenIndex(null);
  };

  const addExerciseByName = (nombre: string) => {
    setSession((prev) =>
      prev
        ? {
            ...prev,
            exercises: [
              ...prev.exercises,
              { nombre, plannedSeries: 4, plannedRepeticiones: 10, sets: Array.from({ length: 4 }, () => defaultSet(10)) },
            ],
          }
        : prev
    );
  };

  const removeExercise = (index: number) => {
    setSession((prev) => (prev ? { ...prev, exercises: prev.exercises.filter((_, i) => i !== index) } : prev));
    if (openIndex === index) setOpenIndex(null);
  };

  const addSet = (exIndex: number) => {
    setSession((prev) => {
      if (!prev) return prev;
      const exercises = prev.exercises.map((ex, i) => {
        if (i !== exIndex) return ex;
        const last = ex.sets[ex.sets.length - 1];
        return { ...ex, sets: [...ex.sets, defaultSet(last?.repeticiones ?? ex.plannedRepeticiones, last?.peso ?? ex.plannedPeso)] };
      });
      return { ...prev, exercises };
    });
  };

  const removeSet = (exIndex: number, setIndex: number) => {
    setSession((prev) => {
      if (!prev) return prev;
      const exercises = prev.exercises.map((ex, i) => (i === exIndex ? { ...ex, sets: ex.sets.filter((_, j) => j !== setIndex) } : ex));
      return { ...prev, exercises };
    });
  };

  const updateSet = (exIndex: number, setIndex: number, patch: Partial<DraftSet>) => {
    setSession((prev) => {
      if (!prev) return prev;
      const exercises = prev.exercises.map((ex, i) => {
        if (i !== exIndex) return ex;
        return { ...ex, sets: ex.sets.map((s, j) => (j === setIndex ? { ...s, ...patch } : s)) };
      });
      return { ...prev, exercises };
    });
  };

  // Cuando la última serie sin cargar queda completa (tiene intensidad), colapsa
  // solo -- así el usuario pasa naturalmente al siguiente ejercicio.
  useEffect(() => {
    if (openIndex == null || !session) return;
    const ex = session.exercises[openIndex];
    if (ex && ex.sets.length > 0 && ex.sets.every((s) => s.intensidad != null)) {
      setOpenIndex(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const handleFinish = () => {
    if (!session) return;
    const elapsedMinutes = Math.max(1, Math.round((Date.now() - session.startedAt) / 60000));
    const finalExercises: ExerciseEntry[] = [];
    const reportItems: ReportItem[] = [];
    const suggestionUpdates: Record<string, WorkoutSuggestion> = {};
    const counts: Record<TrainingIntensity, number> = { leve: 0, moderado: 0, exigente: 0, fallo: 0 };

    for (const ex of session.exercises) {
      const doneSets = ex.sets.filter((s) => s.intensidad != null);
      const sets: ExerciseSetEntry[] = ex.sets.map((s) => ({
        repeticiones: s.repeticiones,
        peso: s.peso,
        intensidad: s.intensidad || "moderado",
      }));
      const avgReps = sets.length ? Math.round(sets.reduce((a, s) => a + s.repeticiones, 0) / sets.length) : ex.plannedRepeticiones;
      const pesos = sets.map((s) => s.peso).filter((p): p is number => p != null);
      const avgPeso = pesos.length ? Math.round((pesos.reduce((a, b) => a + b, 0) / pesos.length) * 2) / 2 : undefined;
      finalExercises.push({ nombre: ex.nombre, series: sets.length, repeticiones: avgReps, peso: avgPeso, sets });
      doneSets.forEach((s) => counts[s.intensidad!]++);

      if (doneSets.length > 0) {
        const plannedRef: ExerciseEntry = { nombre: ex.nombre, series: ex.plannedSeries, repeticiones: ex.plannedRepeticiones, peso: ex.plannedPeso };
        const verdict = compareExerciseVolume(plannedRef, sets);
        const suggestion = suggestNextSession(sets);
        reportItems.push({ nombre: ex.nombre, verdict, nota: suggestion.nota });
        if (session.routineId) {
          suggestionUpdates[`${session.routineId}::${ex.nombre}`] = {
            nota: suggestion.nota,
            pesoSugerido: suggestion.pesoSugerido,
            generatedAt: Date.now(),
          };
        }
      }
    }

    const ranked = (Object.entries(counts) as [TrainingIntensity, number][]).sort((a, b) => b[1] - a[1]);
    const overallIntensidad: TrainingIntensity = ranked[0][1] > 0 ? ranked[0][0] : "moderado";
    const existingSessions = getTrainingSessions(entry);

    onFinish({
      ...entry,
      entreno: true,
      entrenamientos: [...existingSessions, { intensidad: overallIntensidad, minutos: elapsedMinutes, tipo: "fuerza" }],
      ejercicios: finalExercises,
    });
    if (Object.keys(suggestionUpdates).length > 0) onSaveSuggestions(suggestionUpdates);

    setReport({ minutos: elapsedMinutes, overallIntensidad, items: reportItems });
    setSession(null);
    setOpenIndex(null);
  };

  const elapsedLabel = session ? formatElapsed(now - session.startedAt) : "0:00";

  return (
    <Collapsible eyebrow="Fuerza" title="Entrenamiento en vivo" info={SECTION_HELP.ejerciciosHoy} defaultOpen scrollable={!session}>
      {!session && (
        <>
          {scheduledRoutine ? (
            <div className="mb-3 rounded-lg border border-gold/30 bg-gold/10 px-2.5 py-2 text-[12px] text-textMuted">
              Se va a cargar tu rutina de hoy: <span className="font-bold text-text">{scheduledRoutine.nombre}</span> (
              {scheduledRoutine.ejercicios.length} ejercicios).
            </div>
          ) : (
            <div className="mb-3 rounded-lg border border-dashed border-border px-2.5 py-2 text-[12px] text-textMuted">
              No tenés rutina planificada para hoy — vas a poder armarla al toque, ejercicio por ejercicio, a medida que entrenás.
            </div>
          )}
          <button
            type="button"
            onClick={startSession}
            className="w-full rounded-lg p-3 font-sans text-sm font-bold bg-gold text-bg"
          >
            ▶ Iniciar entrenamiento
          </button>
        </>
      )}

      {session && (
        <>
          <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-border bg-bg/40 px-3 py-2">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-wide text-textMuted">Tiempo</div>
              <div className="font-mono text-xl font-bold tabular-nums text-text">{elapsedLabel}</div>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={cancelSession}
                className="rounded-lg border border-rust/40 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wide text-rust"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleFinish}
                className="rounded-lg border border-gold/60 bg-gold px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide text-bg"
              >
                Finalizar entrenamiento
              </button>
            </div>
          </div>

          {session.exercises.length === 0 && (
            <div className="mb-2 rounded-lg border border-dashed border-border p-3 text-center text-[12px] text-textMuted">
              Agregá tu primer ejercicio para arrancar.
            </div>
          )}

          <div className="space-y-2">
            {session.exercises.map((ex, i) => {
              const doneCount = ex.sets.filter((s) => s.intensidad != null).length;
              const complete = ex.sets.length > 0 && doneCount === ex.sets.length;
              const open = openIndex === i;
              return (
                <div key={i} className="overflow-hidden rounded-lg border border-border bg-bg/40">
                  <button
                    type="button"
                    onClick={() => setOpenIndex((prev) => (prev === i ? null : i))}
                    className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${complete ? "bg-sage" : "bg-textMuted/40"}`} />
                      <span className="truncate text-sm font-semibold text-text">{ex.nombre}</span>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] text-textMuted">
                      {doneCount}/{ex.sets.length} series {open ? "▲" : "▼"}
                    </span>
                  </button>

                  {open && (
                    <div className="border-t border-border p-2.5">
                      {ex.suggestionNote && (
                        <div className="mb-2 rounded-lg border border-gold/30 bg-gold/10 px-2 py-1.5 text-[11px] text-textMuted">
                          💡 {ex.suggestionNote}
                        </div>
                      )}
                      <div className="space-y-1.5">
                        {ex.sets.map((set, j) => (
                          <div key={j} className="rounded-lg border border-border bg-bg/60 p-2">
                            <div className="mb-1 flex items-center justify-between">
                              <span className="font-mono text-[9px] uppercase tracking-wide text-textMuted">Serie {j + 1}</span>
                              {ex.sets.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeSet(i, j)}
                                  className="font-mono text-[11px] text-rust"
                                  aria-label={`Quitar serie ${j + 1}`}
                                >
                                  ×
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              <div>
                                <label className="mb-0.5 block font-mono text-[8.5px] uppercase text-textMuted">Reps</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="999"
                                  value={set.repeticiones}
                                  onChange={(event) => updateSet(i, j, { repeticiones: clampNumber(Number(event.target.value), 999) })}
                                />
                              </div>
                              <div>
                                <label className="mb-0.5 block font-mono text-[8.5px] uppercase text-textMuted">Peso (kg)</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="999"
                                  step="0.5"
                                  value={set.peso ?? ""}
                                  placeholder="—"
                                  onChange={(event) =>
                                    updateSet(i, j, { peso: event.target.value ? clampNumber(Number(event.target.value), 999) : undefined })
                                  }
                                />
                              </div>
                            </div>
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {INTENSITIES.map((value) => {
                                const style = INTENSITY_STYLES[value];
                                const active = set.intensidad === value;
                                return (
                                  <button
                                    key={value}
                                    type="button"
                                    onClick={() => updateSet(i, j, { intensidad: value })}
                                    className={`rounded-md border px-1.5 py-1 font-mono text-[9px] uppercase tracking-wide ${
                                      active ? "" : "border-border text-textMuted"
                                    }`}
                                    style={active ? { background: style.background, color: style.color, borderColor: style.background } : undefined}
                                  >
                                    {style.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => addSet(i)}
                          className="rounded-lg border border-dashed border-border px-2 py-1.5 font-mono text-[9px] uppercase tracking-wide text-textMuted"
                        >
                          + Serie
                        </button>
                        <button
                          type="button"
                          onClick={() => removeExercise(i)}
                          className="rounded-lg border border-dashed border-rust/40 px-2 py-1.5 font-mono text-[9px] uppercase tracking-wide text-rust"
                        >
                          Quitar ejercicio
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => {
                const nombre = window.prompt("Nombre del ejercicio:");
                if (nombre && nombre.trim()) addExerciseByName(nombre.trim());
              }}
              className="rounded-lg border border-dashed border-border px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-textMuted"
            >
              + Agregar ejercicio
            </button>
            <button
              type="button"
              onClick={() => setLibraryTarget("new")}
              className="rounded-lg border border-dashed border-gold/50 px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-gold"
            >
              🔍 Desde biblioteca
            </button>
          </div>
        </>
      )}

      {libraryTarget && (
        <ExercisePicker
          onSelect={(exercise: LibraryExercise) => addExerciseByName(exercise.nameEs || exercise.name)}
          onClose={() => setLibraryTarget(null)}
        />
      )}

      {report && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm" onClick={() => setReport(null)}>
          <div
            className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="font-display text-lg text-text">Entrenamiento cerrado ✓</div>
            <div className="mb-3 font-mono text-[11px] text-textMuted">
              {report.minutos} min · nivel general {INTENSITY_STYLES[report.overallIntensidad].label.toLowerCase()}
            </div>
            {report.items.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-3 text-[12px] text-textMuted">
                No se completó ninguna serie con detalle — la próxima vez cargá reps/peso/sensación por serie para tener sugerencias.
              </div>
            ) : (
              <div className="space-y-2">
                {report.items.map((item, i) => {
                  const v = VERDICT_LABEL[item.verdict];
                  return (
                    <div key={i} className="rounded-lg border border-border bg-bg/40 p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-text">{item.nombre}</span>
                        <span className={`font-mono text-[10px] ${v.color}`}>
                          {v.icon} {v.text}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-textMuted">{item.nota}</div>
                    </div>
                  );
                })}
                <div className="rounded-lg border border-dashed border-gold/40 bg-gold/10 px-2.5 py-2 text-[11px] text-textMuted">
                  Estas sugerencias van a aparecer solas la próxima vez que entrenes esta rutina el mismo día de la semana.
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => setReport(null)}
              className="mt-3 w-full rounded-lg p-2.5 font-sans text-sm font-bold bg-gold text-bg"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </Collapsible>
  );
}
