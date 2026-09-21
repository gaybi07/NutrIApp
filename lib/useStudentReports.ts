"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import { Report } from "./types";

function fromRow(row: Record<string, unknown>): Report {
  return {
    id: row.id as string,
    trainerId: row.trainer_id as string,
    studentId: row.student_id as string,
    periodStart: row.period_start as string,
    periodEnd: row.period_end as string,
    status: row.status as Report["status"],
    metrics: (row.metrics as Record<string, unknown>) || {},
    trainerComment: (row.trainer_comment as string) ?? null,
    generatedAt: (row.generated_at as string) ?? null,
    sentAt: (row.sent_at as string) ?? null,
    createdAt: row.created_at as string,
  };
}

/**
 * Lado ENTRENADOR: historial de reportes semanales de un alumno. Generar
 * calcula todo sin IA (RPC generate_student_report, reusa
 * get_student_metrics + un conteo de incidencias) -- si ya existe un
 * reporte de esa semana, lo regenera (recalcula los números, conserva el
 * comentario manual) en vez de duplicar.
 */
export function useStudentReports(studentId: string) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  const refetch = useCallback(async () => {
    if (!supabase) {
      setLoaded(true);
      return;
    }
    const { data } = await supabase
      .from("reports")
      .select("*")
      .eq("student_id", studentId)
      .order("period_start", { ascending: false });
    setReports((data || []).map(fromRow));
    setLoaded(true);
  }, [studentId]);

  useEffect(() => {
    setLoaded(false);
    refetch();
  }, [refetch]);

  const generate = useCallback(
    async (periodStart: string) => {
      if (!supabase) return;
      setBusy(true);
      await supabase.rpc("generate_student_report", { p_student_id: studentId, p_period_start: periodStart });
      await refetch();
      setBusy(false);
    },
    [studentId, refetch]
  );

  const saveComment = useCallback(
    async (reportId: string, trainerComment: string) => {
      if (!supabase) return;
      setBusy(true);
      await supabase.from("reports").update({ trainer_comment: trainerComment }).eq("id", reportId);
      await refetch();
      setBusy(false);
    },
    [refetch]
  );

  const send = useCallback(
    async (reportId: string) => {
      if (!supabase) return;
      setBusy(true);
      await supabase.from("reports").update({ status: "enviado", sent_at: new Date().toISOString() }).eq("id", reportId);
      await refetch();
      setBusy(false);
    },
    [refetch]
  );

  return { reports, loaded, busy, generate, saveComment, send };
}

/** Lado ALUMNO: reportes que su entrenador ya le envió -- la RLS
 * (`status = 'enviado'`) ya filtra los borradores del lado del server. */
export function useMyReports(authenticated: boolean, hasLink: boolean) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refetch = useCallback(async () => {
    if (!supabase || !hasLink) {
      setLoaded(true);
      return;
    }
    const { data } = await supabase.from("reports").select("*").order("period_start", { ascending: false });
    setReports((data || []).map(fromRow));
    setLoaded(true);
  }, [hasLink]);

  useEffect(() => {
    if (authenticated && hasLink) refetch();
    else {
      setReports([]);
      setLoaded(true);
    }
  }, [authenticated, hasLink, refetch]);

  return { reports, loaded };
}
