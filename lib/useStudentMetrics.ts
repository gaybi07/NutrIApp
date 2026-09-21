"use client";

import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import { isoMonday, fmtDate } from "@/lib/calculations";
import { StudentMetrics } from "./types";

/**
 * Lado ENTRENADOR: métricas mínimas de un alumno puntual, para la semana
 * actual (calculadas del lado del server -- RPC `get_student_metrics`, ver
 * migration_2026-09-21d). Carga bajo demanda por alumno (no todas de una),
 * para no pedir de más a quien tiene muchos alumnos vinculados.
 */
export function useStudentMetrics() {
  const [metricsByStudent, setMetricsByStudent] = useState<Record<string, StudentMetrics | null>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const load = useCallback(async (studentId: string) => {
    if (!supabase) return;
    setLoadingId(studentId);
    const weekStart = fmtDate(isoMonday(fmtDate(new Date())));
    const { data, error } = await supabase.rpc("get_student_metrics", {
      p_student_id: studentId,
      p_week_start: weekStart,
    });
    setMetricsByStudent((prev) => ({ ...prev, [studentId]: error ? null : (data as StudentMetrics) }));
    setLoadingId(null);
  }, []);

  return { metricsByStudent, loadingId, load };
}
