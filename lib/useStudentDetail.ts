"use client";

import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import { StudentDayDetail, StudentWeightPoint } from "./types";

/**
 * Lado ENTRENADOR: detalle día por día de la semana de un alumno (potencia
 * Entrenamientos + Nutrición en la pantalla de detalle) y su evolución de
 * peso (últimas N semanas). Ambos calculados del lado del server -- ver
 * migration_2026-09-21e -- el entrenador nunca recibe filas crudas de
 * `days`/`user_settings`.
 */
export function useStudentDetail() {
  const [week, setWeek] = useState<StudentDayDetail[] | null>(null);
  const [weightHistory, setWeightHistory] = useState<StudentWeightPoint[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (studentId: string, weekStart: string) => {
    if (!supabase) return;
    setLoading(true);
    const [{ data: weekData, error: weekError }, { data: weightData, error: weightError }] = await Promise.all([
      supabase.rpc("get_student_week_detail", { p_student_id: studentId, p_week_start: weekStart }),
      supabase.rpc("get_student_weight_history", { p_student_id: studentId, p_weeks: 8 }),
    ]);
    setWeek(weekError ? null : (weekData as StudentDayDetail[]));
    setWeightHistory(weightError ? null : (weightData as StudentWeightPoint[]));
    setLoading(false);
  }, []);

  return { week, weightHistory, loading, load };
}
