"use client";

import { useEffect, useState } from "react";
import {
  DayEntry,
  ExerciseEntry,
  ExerciseSetEntry,
  Routine,
  TrainingSchedule,
  TrainingIntensity,
  Weekday,
  WorkoutSuggestion,
  WorkoutReport,
  WorkoutReportItem,
  WorkoutVerdict,
  MuscleGroup,
  INTENSITY_STYLES,
  AssignedSession,
} from "@/lib/types";
import { weekdayOf, getTrainingSessions, compareExerciseVolume, suggestNextSession } from "@/lib/calculations";
import { clampNumber } from "@/lib/inputLimits";
import { ExercisePicker } from "@/components/ExercisePicker";
import { RoutineEditorModal } from "@/components/RoutineEditorModal";
import { LibraryExercise, muscleGroupFor } from "@/lib/exerciseLibrary";
import { useRoutineIncidents, RoutineIncidentInput } from "@/lib/useRoutineIncidents";

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const INTENSITIES: TrainingIntensity[] = ["leve", "moderado", "exigente", "fallo"];
// Exportados para GlobalWorkoutTimer (app/page.tsx) -- lee el mismo
// localStorage desde afuera de este componente, para mostrar un contador
// fijo aunque LiveWorkout esté desmontado (se sale de la pestaña Actividad).
export const LIVE_WORKOUT_STORAGE_KEY = "registro:liveWorkout:v1";
const STORAGE_KEY = LIVE_WORKOUT_STORAGE_KEY;
const PENDING_SYNC_KEY = "registro:liveWorkout:pendingSync:v1";

type PendingSync = { sessionId: string; ejercicios: ExerciseEntry[]; minutos: number };

function loadPendingSync(): PendingSync | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PENDING_SYNC_KEY);
    return raw ? (JSON.parse(raw) as PendingSync) : null;
  } catch {
    return null;
  }
}

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
  grupoMuscular?: MuscleGroup;
  /** Se agregó en vivo durante una rutina asignada, no estaba en el plan --
   * a diferencia de un ejercicio planificado, este SÍ se puede quitar y
   * agregarle/sacarle series libremente (nunca fue parte de lo fijado por
   * el entrenador). Se registra como incidencia "ejercicio_fuera_de_plan"
   * al finalizar. Sin sentido en una rutina personal (ahí todo es igual). */
  esFueraDePlan?: boolean;
  /** Los tres desvíos que sí aplican a un ejercicio PLANIFICADO de una
   * rutina asignada -- no borran el ejercicio de la sesión (eso ocultaría
   * que estaba planificado), solo lo marcan para que el entrenador lo vea. */
  omitido?: boolean;
  reemplazadoPor?: string;
  comentario?: string;
}

export interface LiveSession {
  fecha: string;
  startedAt: number;
  routineId?: string;
  exercises: DraftExercise[];
  /** Si esta sesión viene de un AssignedSession (rutina asignada por el
   * profe, ver lib/useAssignedSessions.ts) -- un draft viejo en
   * localStorage de antes de este campo existir deserializa igual, queda
   * simplemente undefined, así que no hace falta ninguna migración. */
  assignedSessionId?: string;
  /** Copiados de assignedSession AL ARRANCAR, no leídos de nuevo al
   * finalizar -- el prop `assignedSession` es "la de HOY" y se recalcula en
   * cada render; si el entrenamiento cruza la medianoche, para cuando se
   * finaliza ya no es "hoy" y el prop pasa a null. Sin esta copia, las
   * incidencias de esa sesión perderían a qué profe/rutina corresponden. */
  assignedTrainerId?: string;
  assignedRoutineNombre?: string;
  assignedTrainerRoutineId?: string | null;
  /** Si está pausado (ej. "voy al baño"), el momento en que se pausó -- el
   * contador se congela ahí en vez de seguir sumando. Al reanudar,
   * `startedAt` se corre hacia adelante por el tiempo que estuvo pausado
   * (ver togglePause), así "ahora - startedAt" sigue dando el tiempo
   * REALMENTE entrenado sin necesitar un acumulador aparte. */
  pausedAt?: number;
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

export function formatElapsed(ms: number): string {
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
  onSaveSchedule,
  onCreateAndAssignRoutine,
  suggestions,
  onSaveSuggestions,
  assignedSession,
  onStartAssignedSession,
  onCompleteAssignedSession,
}: {
  entry: DayEntry;
  routines: Routine[];
  schedule: TrainingSchedule;
  onFinish: (entry: DayEntry) => void;
  onSaveSchedule: (schedule: TrainingSchedule) => void;
  /** Crea la rutina Y la asigna al día de hoy en una sola actualización --
   * a propósito no son dos llamadas separadas (guardar rutina + asignar
   * día): ambas leerían los settings viejos si se llaman sincrónicamente
   * una atrás de la otra, y la segunda pisaría a la primera. */
  onCreateAndAssignRoutine: (routine: Routine, weekday: Weekday) => void;
  suggestions: Record<string, WorkoutSuggestion>;
  onSaveSuggestions: (updates: Record<string, WorkoutSuggestion>) => void;
  /** Todos opcionales y sin valor por defecto -- sin un vínculo activo con
   * un profe (Autoentrenador), quedan undefined y esta pantalla se
   * comporta exactamente igual que siempre. */
  assignedSession?: AssignedSession | null;
  onStartAssignedSession?: (sessionId: string) => void;
  onCompleteAssignedSession?: (sessionId: string, ejercicios: ExerciseEntry[], duracionMinutos?: number) => Promise<{ ok: boolean; error?: string }>;
}) {
  const scheduledRoutine = routines.find((r) => r.id === schedule[weekdayOf(entry.fecha)]);
  const [session, setSession] = useState<LiveSession | null>(() => loadStoredSession(entry.fecha));
  // La rutina de la sesión EN CURSO, no la de hoy en el schedule -- son el
  // mismo id salvo que la sesión ya haya empezado antes de un cambio de
  // agenda. Si es "asignada" (vino del entrenador, ver Routine.origen en
  // lib/types.ts), no se puede tocar la estructura: nada de agregar/quitar
  // ejercicios ni series. Registrar reps/peso/esfuerzo por serie sigue
  // permitido siempre -- eso es ejecutar la rutina, no modificarla.
  const sessionRoutine = session ? routines.find((r) => r.id === session.routineId) : null;
  const isAssignedRoutine = Boolean(session?.assignedSessionId) || sessionRoutine?.origen === "asignada";
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [libraryTarget, setLibraryTarget] = useState<"new" | null>(null);
  // Ojo: arranca en null a propósito aunque `entry.entrenamientoReporte` ya
  // pueda existir -- si lo iniciara con ese valor, el modal del reporte se
  // abriría solo cada vez que se entra a la solapa. Se vuelve a abrir con el
  // botón "Ver reporte" de más abajo, a pedido del usuario.
  const [report, setReport] = useState<WorkoutReport | null>(null);
  const [planningOpen, setPlanningOpen] = useState(false);
  const [creatingRoutine, setCreatingRoutine] = useState(false);
  // Solo se usa para rutinas asignadas -- ver handleFinish/confirmFinish.
  const [finishing, setFinishing] = useState(false);
  const [finalComment, setFinalComment] = useState("");
  const { recordMany } = useRoutineIncidents();
  // Si complete_assigned_session falla justo al terminar, el entrenamiento
  // YA se guardó en el historial personal (ver doFinish) -- esto solo
  // guarda lo necesario para poder reintentar avisarle al profe, sin
  // depender de que "session" siga abierta. Se persiste en localStorage
  // (igual que la sesión en vivo) para no perder el aviso pendiente si se
  // recarga la página antes de reintentar.
  const [pendingSync, setPendingSync] = useState<PendingSync | null>(() => loadPendingSync());
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pendingSync) window.localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pendingSync));
    else window.localStorage.removeItem(PENDING_SYNC_KEY);
  }, [pendingSync]);

  const assignRoutineToday = (routineId: string) => {
    onSaveSchedule({ ...schedule, [weekdayOf(entry.fecha)]: routineId });
    setPlanningOpen(false);
  };

  const togglePause = () => {
    setSession((prev) => {
      if (!prev) return prev;
      if (prev.pausedAt) {
        // Reanudar: correr startedAt hacia adelante por lo que estuvo
        // pausado, así el cálculo "ahora - startedAt" de siempre sigue
        // dando el tiempo real entrenado, sin sumar el rato pausado.
        const pausedMs = Date.now() - prev.pausedAt;
        return { ...prev, startedAt: prev.startedAt + pausedMs, pausedAt: undefined };
      }
      return { ...prev, pausedAt: Date.now() };
    });
  };

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
            grupoMuscular: e.grupoMuscular,
          };
        })
      : [];
    setSession({ fecha: entry.fecha, startedAt: Date.now(), routineId: scheduledRoutine?.id, exercises });
    setOpenIndex(null);
  };

  /** Arranca una sesión asignada por el profe (AssignedSession) en vez de
   * la rutina personal del día -- misma construcción de DraftExercise que
   * startSession, a partir de routineSnapshot en vez de la rutina del
   * schedule personal. Las sugerencias de peso se guardan con la clave del
   * TrainerRoutine (assignedSession.routineId), no con la de la
   * AssignedSession -- así se acumulan semana a semana para la misma
   * rutina del profe, no se pierden cada vez que se publica una nueva. */
  const startAssignedSession = () => {
    if (!assignedSession) return;
    const suggestionKeyBase = assignedSession.routineId;
    const exercises: DraftExercise[] = assignedSession.routineSnapshot.map((e) => {
      const key = suggestionKeyBase ? `${suggestionKeyBase}::${e.nombre}` : null;
      const suggestion = key ? suggestions[key] : undefined;
      const peso = suggestion?.pesoSugerido ?? e.peso;
      return {
        nombre: e.nombre,
        plannedSeries: e.series,
        plannedRepeticiones: e.repeticiones,
        plannedPeso: e.peso,
        suggestionNote: suggestion?.nota,
        sets: Array.from({ length: e.series }, () => defaultSet(e.repeticiones, peso)),
        grupoMuscular: e.grupoMuscular,
      };
    });
    setSession({
      fecha: entry.fecha,
      startedAt: Date.now(),
      assignedSessionId: assignedSession.id,
      assignedTrainerId: assignedSession.trainerId,
      assignedRoutineNombre: assignedSession.routineNombre,
      assignedTrainerRoutineId: assignedSession.routineId,
      exercises,
    });
    setOpenIndex(null);
    onStartAssignedSession?.(assignedSession.id);
  };

  const cancelSession = () => {
    if (!window.confirm("¿Cancelar el entrenamiento en vivo? Se pierde lo cargado hasta ahora.")) return;
    setSession(null);
    setOpenIndex(null);
  };

  const addExerciseByName = (nombre: string, grupoMuscular?: MuscleGroup) => {
    setSession((prev) =>
      prev
        ? {
            ...prev,
            exercises: [
              ...prev.exercises,
              {
                nombre,
                plannedSeries: 4,
                plannedRepeticiones: 10,
                sets: Array.from({ length: 4 }, () => defaultSet(10)),
                grupoMuscular,
                // Si la sesión es de una rutina asignada, esto nunca estuvo
                // en el plan -- se marca para poder quitarlo/editarlo libre
                // y para registrar la incidencia al finalizar.
                esFueraDePlan: isAssignedRoutine || undefined,
              },
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

  // Los tres desvíos de un ejercicio PLANIFICADO -- nunca lo sacan de la
  // sesión, solo lo marcan (ver comentario en DraftExercise). Reemplazar/
  // comentar usan window.prompt, igual que "+ Agregar ejercicio" -- mismo
  // patrón liviano ya establecido en este componente.
  const toggleOmitido = (exIndex: number) => {
    setSession((prev) => {
      if (!prev) return prev;
      const exercises = prev.exercises.map((ex, i) => (i === exIndex ? { ...ex, omitido: !ex.omitido } : ex));
      return { ...prev, exercises };
    });
  };

  const setReemplazadoPor = (exIndex: number, reemplazadoPor: string | undefined) => {
    setSession((prev) => {
      if (!prev) return prev;
      const exercises = prev.exercises.map((ex, i) => (i === exIndex ? { ...ex, reemplazadoPor } : ex));
      return { ...prev, exercises };
    });
  };

  const setComentario = (exIndex: number, comentario: string | undefined) => {
    setSession((prev) => {
      if (!prev) return prev;
      const exercises = prev.exercises.map((ex, i) => (i === exIndex ? { ...ex, comentario } : ex));
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

  const doFinish = (comentarioFinal: string) => {
    if (!session) return;
    const elapsedMinutes = Math.max(1, Math.round((Date.now() - session.startedAt) / 60000));
    // Con una sesión asignada, sessionRoutine es null (no viene de
    // routines/settings) -- estos resuelven a lo que corresponda según de
    // dónde vino la sesión. Se leen de `session` (copiado AL ARRANCAR, ver
    // startAssignedSession), no del prop `assignedSession` -- ese prop es
    // "la de HOY" y se recalcula en cada render, así que si el
    // entrenamiento cruza la medianoche ya no coincide con la sesión que
    // se está cerrando.
    const incidentTrainerId = session.assignedTrainerId ?? sessionRoutine?.trainerId;
    const incidentRoutineId = session.assignedSessionId ?? session.routineId ?? "";
    const incidentRoutineNombre = session.assignedRoutineNombre ?? sessionRoutine?.nombre ?? "";
    const incidentTrainerRoutineId = session.assignedTrainerRoutineId ?? sessionRoutine?.trainerRoutineId ?? undefined;
    const finalExercises: ExerciseEntry[] = [];
    const reportItems: WorkoutReportItem[] = [];
    const suggestionUpdates: Record<string, WorkoutSuggestion> = {};
    const counts: Record<TrainingIntensity, number> = { leve: 0, moderado: 0, exigente: 0, fallo: 0 };
    const incidents: RoutineIncidentInput[] = [];

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
      finalExercises.push({ nombre: ex.nombre, series: sets.length, repeticiones: avgReps, peso: avgPeso, sets, grupoMuscular: ex.grupoMuscular });
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

      // Incidencias -- solo tienen sentido con una rutina asignada (hay un
      // entrenador del otro lado a quien avisar); una rutina personal no
      // genera nada de esto, se comporta exactamente como antes.
      if (isAssignedRoutine) {
        if (ex.esFueraDePlan) {
          incidents.push({
            fecha: entry.fecha,
            routineId: incidentRoutineId,
            routineNombre: incidentRoutineNombre,
            trainerRoutineId: incidentTrainerRoutineId,
            tipo: "ejercicio_fuera_de_plan",
            ejercicioNombre: ex.nombre,
            detalle: `${sets.length} serie${sets.length === 1 ? "" : "s"} realizada${sets.length === 1 ? "" : "s"}`,
          });
        } else {
          if (ex.omitido) {
            incidents.push({
              fecha: entry.fecha,
              routineId: incidentRoutineId,
              routineNombre: incidentRoutineNombre,
              trainerRoutineId: incidentTrainerRoutineId,
              tipo: "omitido",
              ejercicioNombre: ex.nombre,
            });
          }
          if (ex.reemplazadoPor) {
            incidents.push({
              fecha: entry.fecha,
              routineId: incidentRoutineId,
              routineNombre: incidentRoutineNombre,
              trainerRoutineId: incidentTrainerRoutineId,
              tipo: "reemplazado",
              ejercicioNombre: ex.nombre,
              detalle: `Reemplazado por: ${ex.reemplazadoPor}`,
            });
          }
          if (ex.comentario) {
            incidents.push({
              fecha: entry.fecha,
              routineId: incidentRoutineId,
              routineNombre: incidentRoutineNombre,
              trainerRoutineId: incidentTrainerRoutineId,
              tipo: "comentario",
              ejercicioNombre: ex.nombre,
              detalle: ex.comentario,
            });
          }
          if (sets.length > ex.plannedSeries) {
            const extra = sets.length - ex.plannedSeries;
            incidents.push({
              fecha: entry.fecha,
              routineId: incidentRoutineId,
              routineNombre: incidentRoutineNombre,
              trainerRoutineId: incidentTrainerRoutineId,
              tipo: "serie_adicional",
              ejercicioNombre: ex.nombre,
              detalle: `${extra} serie${extra === 1 ? "" : "s"} de más (planificadas: ${ex.plannedSeries})`,
            });
          }
        }
      }
    }

    if (isAssignedRoutine && comentarioFinal.trim()) {
      incidents.push({
        fecha: entry.fecha,
        routineId: incidentRoutineId,
        routineNombre: incidentRoutineNombre,
        trainerRoutineId: incidentTrainerRoutineId,
        tipo: "comentario_final",
        detalle: comentarioFinal.trim(),
      });
    }

    const ranked = (Object.entries(counts) as [TrainingIntensity, number][]).sort((a, b) => b[1] - a[1]);
    const overallIntensidad: TrainingIntensity = ranked[0][1] > 0 ? ranked[0][0] : "moderado";
    const existingSessions = getTrainingSessions(entry);
    const newReport: WorkoutReport = { minutos: elapsedMinutes, overallIntensidad, items: reportItems };

    onFinish({
      ...entry,
      entreno: true,
      entrenamientos: [...existingSessions, { intensidad: overallIntensidad, minutos: elapsedMinutes, tipo: "fuerza" }],
      ejercicios: finalExercises,
      entrenamientoReporte: newReport,
    });
    if (Object.keys(suggestionUpdates).length > 0) onSaveSuggestions(suggestionUpdates);
    if (incidents.length > 0) recordMany(incidentTrainerId, incidents);

    // Doble guardado: lo de arriba (onFinish) ya quedó guardado en el
    // historial personal SIEMPRE, pase lo que pase con la red -- avisarle
    // al profe es un paso aparte, que puede fallar sin que el entrenamiento
    // se pierda. Se guarda el snapshot en "pendingSync" en vez de dejarlo
    // atado a `session` (que se limpia ya mismo) para que el botón de
    // reintentar no necesite mantener la sesión en vivo abierta.
    if (session.assignedSessionId && onCompleteAssignedSession) {
      const sessionId = session.assignedSessionId;
      onCompleteAssignedSession(sessionId, finalExercises, elapsedMinutes).then((res) => {
        if (!res.ok) setPendingSync({ sessionId, ejercicios: finalExercises, minutos: elapsedMinutes });
      });
    }

    setReport(newReport);
    setSession(null);
    setOpenIndex(null);
    setFinishing(false);
    setFinalComment("");
  };

  const retrySync = () => {
    if (!pendingSync || !onCompleteAssignedSession) return;
    const { sessionId, ejercicios, minutos } = pendingSync;
    onCompleteAssignedSession(sessionId, ejercicios, minutos).then((res) => {
      if (res.ok) setPendingSync(null);
    });
  };

  // Con rutina asignada, antes de cerrar de verdad se pide el comentario
  // final (opcional) -- con rutina personal, "Finalizar" sigue haciendo
  // exactamente lo mismo que siempre (sin paso extra).
  const handleFinish = () => {
    // Sin esto, el pop-up del ejercicio que hubiera quedado abierto seguiría
    // ahí detrás del modal de "Finalizar" (mismo tipo de overlay, uno atrás
    // del otro).
    setOpenIndex(null);
    if (isAssignedRoutine) setFinishing(true);
    else doFinish("");
  };

  const elapsedLabel = session ? formatElapsed((session.pausedAt ?? now) - session.startedAt) : "0:00";
  const isPaused = Boolean(session?.pausedAt);

  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="collapsible-eyebrow mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Fuerza</div>
      {pendingSync && (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-rust/40 bg-rust/10 px-2.5 py-2 text-[11px] text-rust">
          <span>Se guardó tu entrenamiento, pero no se pudo avisar a tu profe.</span>
          <button type="button" onClick={retrySync} className="shrink-0 rounded-md border border-rust/50 px-2 py-1 font-mono text-[10px] uppercase">
            Reintentar
          </button>
        </div>
      )}
      {!session && assignedSession && (
        <div className="mb-2 rounded-xl border border-gold p-3" style={{ background: "linear-gradient(135deg, rgb(var(--color-accent) / 0.14), rgb(var(--color-surface)))" }}>
          <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.14em] text-gold">📋 Hoy te toca · asignado por tu profe</div>
          <div className="mb-0.5 text-[15px] font-bold text-text">{assignedSession.routineNombre}</div>
          <div className="mb-3 text-[12px] text-textMuted">{assignedSession.routineSnapshot.length} ejercicios</div>
          <button type="button" onClick={startAssignedSession} className="w-full rounded-lg p-3 font-sans text-sm font-bold bg-gold text-bg">
            ▶ Arrancar sesión asignada
          </button>
        </div>
      )}
      {!session && (
        <>
          {scheduledRoutine ? (
            <>
              <button
                type="button"
                onClick={startSession}
                className="w-full rounded-lg p-3 font-sans text-sm font-bold bg-gold text-bg"
              >
                ▶ Iniciar entrenamiento
              </button>
              {/* Antes de arrancar, solo el nombre -- la lista de ejercicios
                  se ve recién adentro de la sesión en vivo (a pedido: no
                  tiene sentido mostrarla si todavía no empezaste). */}
              <div className="mt-2 rounded-lg border border-border bg-bg/40 px-2.5 py-2 text-center text-[12px] text-textMuted">
                Rutina de hoy: <span className="font-semibold text-text">{scheduledRoutine.nombre}</span>
                {scheduledRoutine.origen === "asignada" && <span className="ml-1.5 text-gold">🔒 Asignada</span>}
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setPlanningOpen(true)}
              className="w-full rounded-lg p-3 font-sans text-sm font-bold bg-gold text-bg"
            >
              📋 Cargar rutina
            </button>
          )}
          {entry.entrenamientoReporte && (
            <button
              type="button"
              onClick={() => setReport(entry.entrenamientoReporte!)}
              className="mt-2 w-full rounded-lg border border-dashed border-gold/40 px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-gold"
            >
              📊 Ver reporte del entrenamiento de hoy
            </button>
          )}
        </>
      )}

      {planningOpen && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm" onClick={() => setPlanningOpen(false)}>
          <div
            className="max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 font-display text-lg text-text">Cargar rutina de hoy</div>
            {routines.length > 0 && (
              <div className="mb-3 space-y-1.5">
                {routines.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => assignRoutineToday(r.id)}
                    className="w-full rounded-lg border border-border bg-bg/40 p-2.5 text-left"
                  >
                    <div className="text-sm font-semibold text-text">{r.nombre}</div>
                    <div className="mt-0.5 font-mono text-[9px] uppercase tracking-wide text-textMuted">{r.ejercicios.length} ejercicios</div>
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setPlanningOpen(false);
                setCreatingRoutine(true);
              }}
              className="w-full rounded-lg border border-dashed border-gold/50 px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-gold"
            >
              + Nueva rutina
            </button>
            <button
              type="button"
              onClick={() => setPlanningOpen(false)}
              className="mt-2 w-full rounded-lg border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-textMuted"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {creatingRoutine && (
        <RoutineEditorModal
          initial={null}
          onClose={() => setCreatingRoutine(false)}
          onSave={(routine) => {
            const id = routine.id || newId();
            onCreateAndAssignRoutine({ id, nombre: routine.nombre, ejercicios: routine.ejercicios }, weekdayOf(entry.fecha));
            setCreatingRoutine(false);
          }}
        />
      )}

      {session && (
        <>
          {isAssignedRoutine && (
            <div className="mb-2 rounded-lg border border-dashed border-gold/40 bg-gold/5 px-3 py-2 text-center text-[11px] text-textMuted">
              🔒 Rutina asignada por tu entrenador — no podés borrar lo planificado, pero podés marcar omitidos, reemplazos, series
              extra y ejercicios fuera de plan. Todo queda registrado para que lo vea.
            </div>
          )}
          <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-border bg-bg/40 px-3 py-2">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-wide text-textMuted">{isPaused ? "En pausa" : "Tiempo"}</div>
              <div className={`font-mono text-xl font-bold tabular-nums ${isPaused ? "text-gold" : "text-text"}`}>{elapsedLabel}</div>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={togglePause}
                className={`rounded-lg border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wide ${
                  isPaused ? "border-gold bg-gold text-bg" : "border-border text-textMuted"
                }`}
              >
                {isPaused ? "▶ Seguir" : "⏸ Pausar"}
              </button>
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
                Finalizar
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
                      <span className={`truncate text-sm font-semibold ${ex.omitido ? "text-textMuted line-through" : "text-text"}`}>
                        {ex.nombre}
                      </span>
                      {ex.esFueraDePlan && (
                        <span className="shrink-0 rounded-full border border-border px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wide text-textMuted">
                          Fuera de plan
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 font-mono text-[10px] text-textMuted">
                      {doneCount}/{ex.sets.length} series {open ? "●" : "›"}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Pop-up del ejercicio abierto -- flota sobre la pantalla en vez de
              empujar la lista hacia abajo (antes se desglosaba inline acá
              mismo). La lista de arriba se queda quieta siempre; solo cambia
              CÓMO se muestra el detalle, la lógica de openIndex/auto-cierre
              (más abajo, ver el useEffect que lo pone en null solo) no cambia. */}
          {openIndex != null && session.exercises[openIndex] && (
            <div
              className="fixed inset-0 z-[68] flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm"
              onClick={() => setOpenIndex(null)}
            >
              <div
                className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-border bg-surface p-3 shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                {(() => {
                  const i = openIndex;
                  const ex = session.exercises[i];
                  const canRemoveExercise = !isAssignedRoutine || ex.esFueraDePlan;
                  const canRemoveSetBelow = (setIndex: number) => !isAssignedRoutine || ex.esFueraDePlan || setIndex >= ex.plannedSeries;
                  return (
                    <>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className={`truncate text-base font-bold ${ex.omitido ? "text-textMuted line-through" : "text-text"}`}>
                          {ex.nombre}
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="font-mono text-[8px] uppercase tracking-wide text-textMuted">{isPaused ? "En pausa" : "Tiempo"}</div>
                          <div className={`font-mono text-sm font-bold tabular-nums ${isPaused ? "text-gold" : "text-text"}`}>{elapsedLabel}</div>
                        </div>
                      </div>
                      {ex.suggestionNote && (
                        <div className="mb-2 rounded-lg border border-gold/30 bg-gold/10 px-2 py-1.5 text-[11px] text-textMuted">
                          💡 {ex.suggestionNote}
                        </div>
                      )}
                      {ex.omitido && (
                        <div className="mb-2 rounded-lg border border-rust/30 bg-rust/10 px-2 py-1.5 text-[11px] text-rust">
                          Marcado como omitido — se avisa a tu entrenador.
                        </div>
                      )}
                      {ex.reemplazadoPor && (
                        <div className="mb-2 rounded-lg border border-gold/30 bg-gold/10 px-2 py-1.5 text-[11px] text-textMuted">
                          Reemplazado por: <span className="font-semibold text-text">{ex.reemplazadoPor}</span>
                        </div>
                      )}
                      {ex.comentario && (
                        <div className="mb-2 rounded-lg border border-border bg-bg/60 px-2 py-1.5 text-[11px] text-textMuted">
                          💬 {ex.comentario}
                        </div>
                      )}
                      <div className="space-y-1.5">
                        {ex.sets.map((set, j) => (
                          <div key={j} className="rounded-lg border border-border bg-bg/60 p-2">
                            <div className="mb-1 flex items-center justify-between">
                              <span className="font-mono text-[9px] uppercase tracking-wide text-textMuted">
                                Serie {j + 1}
                                {isAssignedRoutine && !ex.esFueraDePlan && j >= ex.plannedSeries ? " · extra" : ""}
                              </span>
                              {ex.sets.length > 1 && canRemoveSetBelow(j) && (
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
                        {canRemoveExercise && (
                          <button
                            type="button"
                            onClick={() => removeExercise(i)}
                            className="rounded-lg border border-dashed border-rust/40 px-2 py-1.5 font-mono text-[9px] uppercase tracking-wide text-rust"
                          >
                            Quitar ejercicio
                          </button>
                        )}
                      </div>

                      {isAssignedRoutine && !ex.esFueraDePlan && (
                        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleOmitido(i)}
                            className={`rounded-lg border px-2 py-1.5 font-mono text-[9px] uppercase tracking-wide ${
                              ex.omitido ? "border-rust/50 bg-rust/10 text-rust" : "border-dashed border-border text-textMuted"
                            }`}
                          >
                            {ex.omitido ? "Deshacer omitir" : "Omitir"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const value = window.prompt("¿Con qué lo reemplazaste?", ex.reemplazadoPor || "");
                              if (value !== null) setReemplazadoPor(i, value.trim() || undefined);
                            }}
                            className="rounded-lg border border-dashed border-gold/50 px-2 py-1.5 font-mono text-[9px] uppercase tracking-wide text-gold"
                          >
                            Reemplazar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const value = window.prompt("Comentario para tu entrenador:", ex.comentario || "");
                              if (value !== null) setComentario(i, value.trim() || undefined);
                            }}
                            className="rounded-lg border border-dashed border-border px-2 py-1.5 font-mono text-[9px] uppercase tracking-wide text-textMuted"
                          >
                            💬 Comentario
                          </button>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setOpenIndex(null)}
                        className="mt-2 w-full rounded-lg border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-textMuted"
                      >
                        Cerrar
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

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
          {isAssignedRoutine && (
            <div className="mt-1.5 text-center text-[10px] text-textMuted">
              Lo que agregues acá queda marcado "fuera de plan" para tu entrenador.
            </div>
          )}
        </>
      )}

      {finishing && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm" onClick={() => setFinishing(false)}>
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-surface p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="font-display text-lg text-text">Cerrar entrenamiento</div>
            <div className="mb-2 mt-1 text-[11px] text-textMuted">
              Comentario final para tu entrenador (opcional) — se guarda junto con lo que hayas marcado en cada ejercicio.
            </div>
            <textarea
              rows={3}
              value={finalComment}
              onChange={(event) => setFinalComment(event.target.value)}
              placeholder="Ej: me costó más de lo normal, dormí poco"
              className="w-full"
            />
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setFinishing(false)}
                className="rounded-lg border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-textMuted"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => doFinish(finalComment)}
                className="rounded-lg border border-gold/60 bg-gold px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-bg"
              >
                Finalizar
              </button>
            </div>
          </div>
        </div>
      )}

      {libraryTarget && (
        <ExercisePicker
          onSelect={(exercise: LibraryExercise) => addExerciseByName(exercise.nameEs || exercise.name, muscleGroupFor(exercise.primaryMuscles))}
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
    </div>
  );
}
