"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import { AssignedSession, ExerciseEntry, TrainingPlan, Weekday, WorkoutExecution } from "./types";
import { fmtDate, addDays } from "./calculations";

function planFromRow(row: Record<string, unknown>): TrainingPlan {
  return {
    id: row.id as string,
    trainerId: row.trainer_id as string,
    studentId: row.student_id as string,
    weekStart: row.week_start as string,
    days: (row.days as Partial<Record<Weekday, string>>) || {},
    status: row.status as TrainingPlan["status"],
    publishedAt: (row.published_at as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function sessionFromRow(row: Record<string, unknown>): AssignedSession {
  return {
    id: row.id as string,
    planId: row.plan_id as string,
    trainerId: row.trainer_id as string,
    studentId: row.student_id as string,
    routineId: (row.routine_id as string) ?? null,
    routineSnapshot: (row.routine_snapshot as ExerciseEntry[]) || [],
    routineNombre: row.routine_nombre as string,
    fechaPlanificada: row.fecha_planificada as string,
    fechaOriginal: row.fecha_original as string,
    status: row.status as AssignedSession["status"],
    movedAt: (row.moved_at as string) ?? null,
    startedAt: (row.started_at as string) ?? null,
    completedAt: (row.completed_at as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/**
 * Lado ENTRENADOR: el plan semanal (qué TrainerRoutine va cada día) de UN
 * alumno puntual. `days` se edita en memoria y se guarda recién con
 * saveDraft()/publish() -- evita un round-trip a la base por cada click en
 * el desplegable de un día.
 */
export function useTrainingPlan(authenticated: boolean, studentId: string | null, weekStart: string) {
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [days, setDays] = useState<Partial<Record<Weekday, string>>>({});
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const refetch = useCallback(async () => {
    if (!supabase || !studentId) {
      setPlan(null);
      setDays({});
      setLoaded(true);
      return;
    }
    const { data } = await supabase
      .from("training_plans")
      .select("*")
      .eq("student_id", studentId)
      .eq("week_start", weekStart)
      .maybeSingle();
    const found = data ? planFromRow(data) : null;
    setPlan(found);
    setDays(found?.days || {});
    setLoaded(true);
  }, [studentId, weekStart]);

  useEffect(() => {
    if (authenticated && studentId) refetch();
    else {
      setPlan(null);
      setDays({});
      setLoaded(true);
    }
  }, [authenticated, studentId, refetch]);

  const setDay = useCallback((weekday: Weekday, routineId: string | null) => {
    setDays((prev) => {
      const next = { ...prev };
      if (routineId) next[weekday] = routineId;
      else delete next[weekday];
      return next;
    });
  }, []);

  /** Upsert por (trainer_id, student_id, week_start) -- ese unique constraint
   * ya existe en la tabla, así que reeditar una semana ya creada actualiza
   * en el lugar en vez de fallar por duplicado. Devuelve el id del plan
   * (haga falta o no para publish()). */
  const saveDraft = useCallback(async (): Promise<string | null> => {
    if (!supabase || !studentId) return null;
    setBusy(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      return null;
    }
    const { data, error } = await supabase
      .from("training_plans")
      .upsert(
        { trainer_id: user.id, student_id: studentId, week_start: weekStart, days },
        { onConflict: "trainer_id,student_id,week_start" }
      )
      .select("id")
      .single();
    setBusy(false);
    if (error) {
      setStatus(error.message);
      return null;
    }
    setStatus("Borrador guardado ✓");
    await refetch();
    return (data?.id as string) ?? null;
  }, [studentId, weekStart, days, refetch]);

  const publish = useCallback(async () => {
    setBusy(true);
    setStatus("Publicando...");
    const planId = await saveDraft();
    if (!planId || !supabase) {
      setBusy(false);
      return;
    }
    const { error } = await supabase.rpc("publish_training_plan", { p_plan_id: planId });
    setBusy(false);
    if (error) {
      setStatus(error.message);
      return;
    }
    setStatus("Semana publicada ✓ — tu alumno ya la puede ver");
    await refetch();
  }, [saveDraft, refetch]);

  return { plan, days, loaded, busy, status, setDay, saveDraft, publish };
}

function executionFromRow(row: Record<string, unknown>): WorkoutExecution {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    studentId: row.student_id as string,
    trainerId: row.trainer_id as string,
    ejercicios: (row.ejercicios as ExerciseEntry[]) || [],
    duracionMinutos: (row.duracion_minutos as number) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/** Lado ENTRENADOR, solo lectura: lo que el alumno hizo DE VERDAD (peso/reps
 * reales) en cada sesión completada -- para mostrar al lado del
 * routineSnapshot planificado. Solo trae algo si sessionIds no está vacío
 * (evita un "in ()" inválido). */
export function useStudentExecutions(authenticated: boolean, sessionIds: string[]) {
  const [executionsBySession, setExecutionsBySession] = useState<Record<string, WorkoutExecution>>({});
  const [loaded, setLoaded] = useState(false);
  const key = sessionIds.join(",");

  const refetch = useCallback(async () => {
    if (!supabase || sessionIds.length === 0) {
      setExecutionsBySession({});
      setLoaded(true);
      return;
    }
    const { data } = await supabase.from("workout_executions").select("*").in("session_id", sessionIds);
    const map: Record<string, WorkoutExecution> = {};
    (data || []).forEach((row) => {
      const exec = executionFromRow(row);
      map[exec.sessionId] = exec;
    });
    setExecutionsBySession(map);
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (authenticated) refetch();
    else {
      setExecutionsBySession({});
      setLoaded(true);
    }
  }, [authenticated, refetch]);

  return { executionsBySession, loaded };
}

/** Lado ENTRENADOR, solo lectura: el estado real (planificada/en_curso/
 * completada/vencida) de cada día ya publicado de un alumno, para pintar el
 * badge de cada fila del planificador. */
export function useStudentAssignedSessions(authenticated: boolean, studentId: string | null, weekStart: string) {
  const [sessions, setSessions] = useState<AssignedSession[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refetch = useCallback(async () => {
    if (!supabase || !studentId) {
      setSessions([]);
      setLoaded(true);
      return;
    }
    const weekEnd = fmtDate(addDays(new Date(`${weekStart}T00:00:00`), 6));
    const { data } = await supabase
      .from("assigned_sessions")
      .select("*")
      .eq("student_id", studentId)
      .gte("fecha_planificada", weekStart)
      .lte("fecha_planificada", weekEnd)
      .order("fecha_planificada", { ascending: true });
    setSessions((data || []).map(sessionFromRow));
    setLoaded(true);
  }, [studentId, weekStart]);

  useEffect(() => {
    if (authenticated && studentId) refetch();
    else {
      setSessions([]);
      setLoaded(true);
    }
  }, [authenticated, studentId, refetch]);

  return { sessions, loaded, refetch };
}
