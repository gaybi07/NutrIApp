"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import { ExerciseEntry, TrainerLink, TrainerRoutine, TrainerStudent } from "./types";

function routineFromRow(row: Record<string, unknown>): TrainerRoutine {
  return {
    id: row.id as string,
    trainerId: row.trainer_id as string,
    nombre: row.nombre as string,
    ejercicios: (row.ejercicios as ExerciseEntry[]) || [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/**
 * Lado ALUMNO del vínculo: a lo sumo un entrenador vinculado por vez (igual
 * que el "hogar" de la alacena). `join` valida el código server-side (RPC
 * `join_trainer`, ver migration_2026-09-18) y `leave` te desvincula.
 */
export function useTrainerLink(authenticated: boolean) {
  const [link, setLink] = useState<TrainerLink | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const refetch = useCallback(async () => {
    if (!supabase) {
      setLoaded(true);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLink(null);
      setLoaded(true);
      return;
    }
    const { data } = await supabase
      .from("trainer_links")
      .select("trainer_id, trainer_email, created_at")
      .eq("student_id", user.id)
      .maybeSingle();
    setLink(data ? { trainerId: data.trainer_id, trainerEmail: data.trainer_email, createdAt: data.created_at } : null);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (authenticated) refetch();
    else {
      setLink(null);
      setLoaded(true);
    }
  }, [authenticated, refetch]);

  const join = useCallback(
    async (code: string) => {
      if (!supabase) return;
      setBusy(true);
      setStatus("Vinculando...");
      const { error } = await supabase.rpc("join_trainer", { p_code: code.trim() });
      if (error) {
        setStatus(error.message.includes("nv") ? "Código inválido." : error.message);
        setBusy(false);
        return;
      }
      await refetch();
      setStatus("Te vinculaste con tu entrenador ✓");
      setBusy(false);
    },
    [refetch]
  );

  const leave = useCallback(async () => {
    if (!supabase || !link) return;
    setBusy(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) await supabase.from("trainer_links").delete().eq("student_id", user.id);
    setLink(null);
    setStatus("Te desvinculaste de tu entrenador.");
    setBusy(false);
  }, [link]);

  return { link, loaded, busy, status, join, leave };
}

/**
 * Lado ENTRENADOR: tus alumnos vinculados + generar código de invitación.
 * `generate_trainer_invite_code` (RPC) valida server-side que estés
 * aprobado -- acá `enabled` es solo para no disparar la consulta de más.
 */
export function useTrainerStudents(authenticated: boolean, enabled: boolean) {
  const [students, setStudents] = useState<TrainerStudent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const refetch = useCallback(async () => {
    if (!supabase || !enabled) {
      setLoaded(true);
      return;
    }
    const { data } = await supabase
      .from("trainer_links")
      .select("student_id, student_email, created_at")
      .order("created_at", { ascending: false });
    setStudents((data || []).map((r) => ({ studentId: r.student_id, studentEmail: r.student_email, createdAt: r.created_at })));
    setLoaded(true);
  }, [enabled]);

  useEffect(() => {
    if (authenticated && enabled) refetch();
    else setLoaded(true);
  }, [authenticated, enabled, refetch]);

  const getInviteCode = useCallback(async () => {
    if (!supabase) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("generate_trainer_invite_code");
    if (error) {
      setStatus(error.message);
      setBusy(false);
      return;
    }
    setInviteCode((data as string) || null);
    setBusy(false);
  }, []);

  const removeStudent = useCallback(
    async (studentId: string) => {
      if (!supabase) return;
      setBusy(true);
      await supabase.from("trainer_links").delete().eq("student_id", studentId);
      await refetch();
      setBusy(false);
    },
    [refetch]
  );

  return { students, loaded, inviteCode, busy, status, getInviteCode, removeStudent };
}

/** Lado ENTRENADOR: CRUD de tus propias rutinas para alumnos. */
export function useTrainerRoutines(authenticated: boolean, enabled: boolean) {
  const [routines, setRoutines] = useState<TrainerRoutine[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  const refetch = useCallback(async () => {
    if (!supabase || !enabled) {
      setLoaded(true);
      return;
    }
    const { data } = await supabase.from("trainer_routines").select("*").order("created_at", { ascending: false });
    setRoutines((data || []).map(routineFromRow));
    setLoaded(true);
  }, [enabled]);

  useEffect(() => {
    if (authenticated && enabled) refetch();
    else setLoaded(true);
  }, [authenticated, enabled, refetch]);

  const save = useCallback(
    async (routine: { id?: string; nombre: string; ejercicios: ExerciseEntry[] }) => {
      if (!supabase) return;
      setBusy(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setBusy(false);
        return;
      }
      if (routine.id) {
        await supabase
          .from("trainer_routines")
          .update({ nombre: routine.nombre, ejercicios: routine.ejercicios, updated_at: new Date().toISOString() })
          .eq("id", routine.id);
      } else {
        await supabase.from("trainer_routines").insert({ trainer_id: user.id, nombre: routine.nombre, ejercicios: routine.ejercicios });
      }
      await refetch();
      setBusy(false);
    },
    [refetch]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!supabase) return;
      setBusy(true);
      await supabase.from("trainer_routines").delete().eq("id", id);
      await refetch();
      setBusy(false);
    },
    [refetch]
  );

  return { routines, loaded, busy, save, remove };
}

/** Lado ALUMNO: solo-lectura de las rutinas del entrenador vinculado -- la
 * RLS ya filtra por vínculo (ver my_trainer_id() en la migración), así que
 * la consulta no necesita filtrar por trainer_id acá. */
export function useTrainerRoutinesForStudent(authenticated: boolean, hasLink: boolean) {
  const [routines, setRoutines] = useState<TrainerRoutine[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refetch = useCallback(async () => {
    if (!supabase || !hasLink) {
      setLoaded(true);
      return;
    }
    const { data } = await supabase.from("trainer_routines").select("*").order("created_at", { ascending: false });
    setRoutines((data || []).map(routineFromRow));
    setLoaded(true);
  }, [hasLink]);

  useEffect(() => {
    if (authenticated && hasLink) refetch();
    else {
      setRoutines([]);
      setLoaded(true);
    }
  }, [authenticated, hasLink, refetch]);

  return { routines, loaded, refetch };
}
