"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LibraryExercise,
  loadExerciseLibrary,
  exerciseImageUrl,
  CATEGORY_LABELS,
  EQUIPMENT_LABELS,
  MUSCLE_LABELS,
} from "@/lib/exerciseLibrary";

const RESULTS_LIMIT = 60;

/**
 * Buscador de ejercicios (base gratuita free-exercise-db, ~876 ejercicios
 * con foto de la ejecución) para elegir en vez de escribir el nombre a
 * ciegas. Sin filtro/búsqueda no muestra nada (876 con foto de una sería
 * pesado y poco útil) -- se recomienda buscar por nombre o filtrar por
 * músculo primero.
 */
export function ExercisePicker({ onSelect, onClose }: { onSelect: (exercise: LibraryExercise) => void; onClose: () => void }) {
  const [exercises, setExercises] = useState<LibraryExercise[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState("todos");
  const [detail, setDetail] = useState<LibraryExercise | null>(null);

  useEffect(() => {
    loadExerciseLibrary()
      .then(setExercises)
      .catch(() => setError("No pude cargar la lista de ejercicios. Revisá tu conexión y probá de nuevo."));
  }, []);

  const muscles = useMemo(() => {
    if (!exercises) return [];
    const set = new Set<string>();
    exercises.forEach((e) => e.primaryMuscles.forEach((m) => set.add(m)));
    return Array.from(set).sort();
  }, [exercises]);

  const filtered = useMemo(() => {
    if (!exercises) return [];
    const q = query.trim().toLowerCase();
    if (!q && muscle === "todos") return [];
    return exercises
      .filter(
        (e) =>
          (muscle === "todos" || e.primaryMuscles.includes(muscle)) &&
          (!q || e.name.toLowerCase().includes(q) || e.nameEs?.toLowerCase().includes(q))
      )
      .slice(0, RESULTS_LIMIT);
  }, [exercises, query, muscle]);

  const pick = (exercise: LibraryExercise) => {
    onSelect(exercise);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {detail ? (
          <div className="flex flex-col overflow-y-auto p-4">
            <button type="button" onClick={() => setDetail(null)} className="mb-2 self-start font-mono text-[10px] uppercase tracking-wide text-textMuted">
              ‹ Volver a la búsqueda
            </button>
            {detail.images[0] && (
              <img src={exerciseImageUrl(detail.images[0])} alt={detail.nameEs || detail.name} className="mb-3 w-full rounded-xl border border-border object-cover" />
            )}
            <div className="font-display text-xl text-text">{detail.nameEs || detail.name}</div>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {detail.category && (
                <span className="rounded-full border border-border bg-bg/60 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-textMuted">
                  {CATEGORY_LABELS[detail.category] || detail.category}
                </span>
              )}
              {detail.equipment && (
                <span className="rounded-full border border-border bg-bg/60 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-textMuted">
                  {EQUIPMENT_LABELS[detail.equipment] || detail.equipment}
                </span>
              )}
              {detail.primaryMuscles.map((m) => (
                <span key={m} className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-gold">
                  {MUSCLE_LABELS[m] || m}
                </span>
              ))}
            </div>
            {detail.instructions.length > 0 && (
              <div className="mb-3 rounded-xl border border-dashed border-border bg-bg/40 p-2.5">
                <div className="mb-1.5 font-mono text-[9px] uppercase tracking-wide text-textMuted">
                  {detail.instructionsEs ? "Cómo hacerlo" : "Cómo hacerlo (en inglés — la foto ayuda igual)"}
                </div>
                <ol className="list-decimal space-y-1 pl-4 text-[12px] text-textMuted">
                  {(detail.instructionsEs || detail.instructions).map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
            <button type="button" onClick={() => pick(detail)} className="w-full rounded-lg p-2.5 font-sans text-sm font-bold bg-gold text-bg">
              Usar este ejercicio
            </button>
          </div>
        ) : (
          <>
            <div className="border-b border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="font-display text-lg text-text">Buscar ejercicio</div>
                <button type="button" onClick={onClose} className="font-mono text-[11px] text-textMuted">
                  Cerrar
                </button>
              </div>
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ej: press banca, sentadilla, curl..."
                className="mb-2 w-full"
                autoFocus
              />
              <select value={muscle} onChange={(event) => setMuscle(event.target.value)} className="w-full">
                <option value="todos">Todos los grupos musculares</option>
                {muscles.map((m) => (
                  <option key={m} value={m}>
                    {MUSCLE_LABELS[m] || m}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {error && <div className="text-center text-[12px] text-rust">{error}</div>}
              {!error && !exercises && <div className="text-center text-[12px] text-textMuted">Cargando ejercicios...</div>}
              {!error && exercises && filtered.length === 0 && (
                <div className="text-center text-[12px] text-textMuted">
                  {query.trim() || muscle !== "todos" ? "No encontré nada con eso." : "Escribí un nombre o elegí un grupo muscular para buscar."}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                {filtered.map((exercise) => (
                  <div
                    key={exercise.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => pick(exercise)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        pick(exercise);
                      }
                    }}
                    className="relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-bg/40 text-left hover:border-gold/60"
                  >
                    {exercise.images[0] && (
                      <img src={exerciseImageUrl(exercise.images[0])} alt={exercise.nameEs || exercise.name} className="h-24 w-full object-cover" loading="lazy" />
                    )}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDetail(exercise);
                      }}
                      aria-label={`Ver info de ${exercise.nameEs || exercise.name}`}
                      className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-bg/80 text-[11px] text-textMuted backdrop-blur-sm"
                    >
                      ℹ️
                    </button>
                    <div className="p-1.5">
                      <div className="line-clamp-2 text-[11px] text-text">{exercise.nameEs || exercise.name}</div>
                      <div className="font-mono text-[8.5px] uppercase tracking-wide text-textMuted">
                        {exercise.primaryMuscles.map((m) => MUSCLE_LABELS[m] || m).join(", ")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {filtered.length === RESULTS_LIMIT && (
                <div className="mt-2 text-center text-[10px] text-textMuted">Hay más resultados — afiná la búsqueda para verlos.</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
