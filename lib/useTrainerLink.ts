"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import { ExerciseEntry, TrainerLink, TrainerLinkRequest, TrainerRoutine, TrainerStudent } from "./types";

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

function requestFromRow(row: Record<string, unknown>): TrainerLinkRequest {
  return {
    id: row.id as string,
    trainerId: row.trainer_id as string,
    studentId: row.student_id as string,
    trainerEmail: row.trainer_email as string,
    studentEmail: row.student_email as string,
    status: row.status as TrainerLinkRequest["status"],
    respondedAt: (row.responded_at as string) ?? null,
    responseNote: (row.response_note as string) ?? null,
    createdAt: row.created_at as string,
  };
}

/**
 * Lado ALUMNO del vínculo: a lo sumo un entrenador vinculado por vez (igual
 * que el "hogar" de la alacena). Usar un código ya no vincula al instante --
 * crea una solicitud (RPC `request_trainer_link`, ver
 * migration_2026-09-21b) que queda "pendiente" hasta que el entrenador la
 * acepta o la rechaza. `leave` desvincula un vínculo ya aceptado.
 */
export function useTrainerLink(authenticated: boolean) {
  const [link, setLink] = useState<TrainerLink | null>(null);
  const [myRequest, setMyRequest] = useState<TrainerLinkRequest | null>(null);
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
      setMyRequest(null);
      setLoaded(true);
      return;
    }
    const [{ data: linkRow }, { data: requestRow }] = await Promise.all([
      supabase
        .from("trainer_links")
        .select("trainer_id, trainer_email, created_at, status, ended_at")
        .eq("student_id", user.id)
        .eq("status", "activo")
        .maybeSingle(),
      supabase
        .from("trainer_link_requests")
        .select("*")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    setLink(
      linkRow
        ? {
            trainerId: linkRow.trainer_id,
            trainerEmail: linkRow.trainer_email,
            createdAt: linkRow.created_at,
            status: linkRow.status,
            endedAt: linkRow.ended_at,
          }
        : null
    );
    // Una solicitud pendiente siempre se muestra; una ya resuelta
    // (aceptada/rechazada) solo importa si todavía no hay vínculo activo --
    // si ya está vinculado, mostrar la última solicitud resuelta no aporta nada.
    setMyRequest(requestRow && (requestRow.status === "pendiente" || !linkRow) ? requestFromRow(requestRow) : null);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (authenticated) refetch();
    else {
      setLink(null);
      setMyRequest(null);
      setLoaded(true);
    }
  }, [authenticated, refetch]);

  const join = useCallback(
    async (code: string) => {
      if (!supabase) return;
      setBusy(true);
      setStatus("Enviando solicitud...");
      const { error } = await supabase.rpc("request_trainer_link", { p_code: code.trim() });
      if (error) {
        setStatus(error.message.includes("nv") ? "Código inválido." : error.message);
        setBusy(false);
        return;
      }
      await refetch();
      setStatus("Solicitud enviada — esperando que tu entrenador la acepte ✓");
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

  return { link, myRequest, loaded, busy, status, join, leave };
}

/**
 * Lado ENTRENADOR: tus alumnos vinculados + solicitudes pendientes +
 * generar código de invitación. `generate_trainer_invite_code` (RPC) valida
 * server-side que estés aprobado -- acá `enabled` es solo para no disparar
 * la consulta de más. Aceptar/rechazar una solicitud pasa por
 * `respond_trainer_link_request` (RPC, migration_2026-09-21b), que crea el
 * vínculo y resuelve la solicitud en una sola transacción.
 */
export function useTrainerStudents(authenticated: boolean, enabled: boolean) {
  const [students, setStudents] = useState<TrainerStudent[]>([]);
  const [pendingRequests, setPendingRequests] = useState<TrainerLinkRequest[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const refetch = useCallback(async () => {
    if (!supabase || !enabled) {
      setLoaded(true);
      return;
    }
    const [{ data: studentRows }, { data: requestRows }] = await Promise.all([
      supabase
        .from("trainer_links")
        .select("student_id, student_email, created_at")
        .eq("status", "activo")
        .order("created_at", { ascending: false }),
      supabase
        .from("trainer_link_requests")
        .select("*")
        .eq("status", "pendiente")
        .order("created_at", { ascending: false }),
    ]);
    setStudents((studentRows || []).map((r) => ({ studentId: r.student_id, studentEmail: r.student_email, createdAt: r.created_at })));
    setPendingRequests((requestRows || []).map(requestFromRow));
    setLoaded(true);
  }, [enabled]);

  useEffect(() => {
    if (authenticated && enabled) refetch();
    else setLoaded(true);
  }, [authenticated, enabled, refetch]);

  const getInviteCode = useCallback(async () => {
    if (!supabase) return;
    setBusy(true);
    // Igual que getInviteCode() de useHousehold: reusa el código ya generado
    // si existe -- "código único" para compartir, no uno nuevo cada vez que
    // se reabre el panel (los códigos no expiran ni se consumen al usarse).
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      return;
    }
    const { data: existing } = await supabase
      .from("trainer_invites")
      .select("code")
      .eq("trainer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing?.code) {
      setInviteCode(existing.code);
      setBusy(false);
      return;
    }
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

  const respond = useCallback(
    async (requestId: string, decision: "aceptada" | "rechazada", note?: string) => {
      if (!supabase) return;
      setBusyRequestId(requestId);
      const { error } = await supabase.rpc("respond_trainer_link_request", {
        p_request_id: requestId,
        p_decision: decision,
        p_note: note || null,
      });
      if (error) {
        setStatus(error.message);
        setBusyRequestId(null);
        return;
      }
      await refetch();
      setBusyRequestId(null);
    },
    [refetch]
  );

  return { students, pendingRequests, loaded, inviteCode, busy, busyRequestId, status, getInviteCode, removeStudent, respond };
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
