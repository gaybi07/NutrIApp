"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import { AssignedSession, Disciplina, ExerciseEntry } from "./types";
import { fmtDate, isoMonday, addDays } from "./calculations";

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
    disciplina: (row.disciplina as Disciplina) ?? "fuerza",
  };
}

const OPEN_STATUSES: AssignedSession["status"][] = ["planificada", "movida", "en_curso"];

/**
 * Lado ALUMNO: sus AssignedSession de la semana actual, y la de HOY en
 * particular (si hay una todavía abierta). `hasTrainerLink` en false corta
 * la consulta de una -- mismo patrón guard que useTrainerRoutinesForStudent
 * -- así un Autoentrenador nunca dispara ni un solo request nuevo.
 */
export function useMyAssignedSessions(authenticated: boolean, hasTrainerLink: boolean, disciplina: Disciplina = "fuerza") {
  const [sessions, setSessions] = useState<AssignedSession[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState("");

  const refetch = useCallback(async () => {
    if (!supabase || !hasTrainerLink) {
      setSessions([]);
      setLoaded(true);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSessions([]);
      setLoaded(true);
      return;
    }
    const monday = isoMonday(fmtDate(new Date()));
    const weekStart = fmtDate(monday);
    const weekEnd = fmtDate(addDays(monday, 6));
    const { data } = await supabase
      .from("assigned_sessions")
      .select("*")
      .eq("student_id", user.id)
      .eq("disciplina", disciplina)
      .gte("fecha_planificada", weekStart)
      .lte("fecha_planificada", weekEnd)
      .neq("status", "cancelada")
      .order("fecha_planificada", { ascending: true });
    setSessions((data || []).map(sessionFromRow));
    setLoaded(true);
  }, [hasTrainerLink, disciplina]);

  useEffect(() => {
    if (authenticated) refetch();
    else {
      setSessions([]);
      setLoaded(true);
    }
  }, [authenticated, refetch]);

  const todayIso = fmtDate(new Date());
  const todaySession = sessions.find((s) => s.fechaPlanificada === todayIso && OPEN_STATUSES.includes(s.status)) || null;

  /** Marca la sesión "en_curso" al arrancarla en LiveWorkout -- el trigger
   * de la base pone started_at solo, no hace falta mandarlo. */
  const start = useCallback(
    async (sessionId: string) => {
      if (!supabase) return;
      await supabase.from("assigned_sessions").update({ status: "en_curso" }).eq("id", sessionId);
      await refetch();
    },
    [refetch]
  );

  /** Devuelve {ok,error} en vez de lanzar -- así LiveWorkout puede guardar
   * primero en el DayEntry personal (nunca depende de esto) y avisar sin
   * riesgo de que un error acá tire abajo ese guardado. */
  const complete = useCallback(
    async (sessionId: string, ejercicios: ExerciseEntry[], duracionMinutos?: number): Promise<{ ok: boolean; error?: string }> => {
      if (!supabase) return { ok: false, error: "Sin conexión a Supabase" };
      // Paso defensivo: el trigger de la base (trg_guard_assigned_sessions_update)
      // permite "planificada -> completada" en la función RPC de abajo, PERO
      // rechaza esa transición si la fila sigue en "planificada" al momento de
      // la actualización final -- solo "en_curso"/"movida" -> "completada" está
      // permitido de verdad. Si el `start()` de más arriba no llegó a aplicarse
      // (ej. sin red al arrancar), la fila queda en "planificada" y
      // complete_assigned_session fallaría para siempre, aunque el
      // entrenamiento personal ya se haya guardado. Este update de más pisa
      // ese caso -- si la fila ya está en curso o más adelante, no hace nada
      // (mismo estado o el trigger la deja pasar igual); si ya está cerrada,
      // falla en silencio, y la llamada de abajo ya sabe tratar eso como éxito.
      await supabase.from("assigned_sessions").update({ status: "en_curso" }).eq("id", sessionId);
      const { error } = await supabase.rpc("complete_assigned_session", {
        p_session_id: sessionId,
        p_ejercicios: ejercicios,
        p_duracion_minutos: duracionMinutos ?? null,
      });
      // Un reintento después de que ya cerró bien la primera vez no debe
      // mostrarse como error -- "ya está cerrada" ES el éxito, solo llegó tarde.
      if (error && !error.message.includes("no se puede cerrar desde el estado")) {
        setStatus(error.message);
        return { ok: false, error: error.message };
      }
      await refetch();
      return { ok: true };
    },
    [refetch]
  );

  return { sessions, todaySession, loaded, status, start, complete, refetch };
}
