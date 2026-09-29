"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import { fmtDate, isoMonday } from "./calculations";

/**
 * Lado ENTRENADOR: qué alumnos YA tienen la semana ACTUAL cubierta con un
 * plan de fuerza publicado. Los que no están en este set son los que
 * necesitan que se les cargue/publique la rutina -- normalmente porque
 * pasó el domingo (último día de la semana anterior) sin haber armado la
 * siguiente a tiempo. RLS ya restringe a "trainer_id = auth.uid()", no
 * hace falta filtrar por trainer acá.
 */
export function useCurrentWeekCoverage(enabled: boolean, studentIds: string[]) {
  const [covered, setCovered] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const key = studentIds.join(",");

  const refetch = useCallback(async () => {
    if (!supabase || !enabled || studentIds.length === 0) {
      setCovered(new Set());
      setLoaded(true);
      return;
    }
    const weekStart = fmtDate(isoMonday(fmtDate(new Date())));
    const { data } = await supabase
      .from("training_plans")
      .select("student_id")
      .eq("disciplina", "fuerza")
      .eq("week_start", weekStart)
      .eq("status", "publicado")
      .in("student_id", studentIds);
    setCovered(new Set((data || []).map((r) => r.student_id as string)));
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { covered, loaded, refetch };
}
