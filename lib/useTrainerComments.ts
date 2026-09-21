"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import { TrainerComment } from "./types";

function fromRow(row: Record<string, unknown>): TrainerComment {
  return {
    id: row.id as string,
    trainerId: row.trainer_id as string,
    studentId: row.student_id as string,
    texto: row.texto as string,
    readAt: (row.read_at as string) ?? null,
    createdAt: row.created_at as string,
  };
}

/** Lado ENTRENADOR: comentarios enviados a un alumno puntual -- de una sola
 * vía, no hay respuesta del alumno acá (eso ya lo cubre el comentario libre
 * de las incidencias, del lado de LiveWorkout). */
export function useTrainerComments(studentId: string | null) {
  const [comments, setComments] = useState<TrainerComment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [sending, setSending] = useState(false);

  const refetch = useCallback(async () => {
    if (!supabase || !studentId) {
      setLoaded(true);
      return;
    }
    const { data } = await supabase
      .from("trainer_comments")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });
    setComments((data || []).map(fromRow));
    setLoaded(true);
  }, [studentId]);

  useEffect(() => {
    setLoaded(false);
    refetch();
  }, [refetch]);

  const send = useCallback(
    async (texto: string) => {
      if (!supabase || !studentId || !texto.trim()) return;
      setSending(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("trainer_comments").insert({ trainer_id: user.id, student_id: studentId, texto: texto.trim() });
        await refetch();
      }
      setSending(false);
    },
    [studentId, refetch]
  );

  return { comments, loaded, sending, send };
}

/** Lado ALUMNO: comentarios recibidos de su entrenador, más recientes
 * primero, con "marcar como leído". */
export function useMyTrainerComments(authenticated: boolean, hasLink: boolean) {
  const [comments, setComments] = useState<TrainerComment[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refetch = useCallback(async () => {
    if (!supabase || !hasLink) {
      setLoaded(true);
      return;
    }
    const { data } = await supabase.from("trainer_comments").select("*").order("created_at", { ascending: false });
    setComments((data || []).map(fromRow));
    setLoaded(true);
  }, [hasLink]);

  useEffect(() => {
    if (authenticated && hasLink) refetch();
    else {
      setComments([]);
      setLoaded(true);
    }
  }, [authenticated, hasLink, refetch]);

  const markRead = useCallback(
    async (id: string) => {
      if (!supabase) return;
      await supabase.from("trainer_comments").update({ read_at: new Date().toISOString() }).eq("id", id);
      await refetch();
    },
    [refetch]
  );

  return { comments, loaded, markRead };
}
