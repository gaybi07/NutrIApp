"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import { fmtDate, isoMonday, addDays } from "./calculations";

/**
 * Lado ALUMNO: ¿ya hay un plan de fuerza publicado para la semana que viene?
 * Sirve para avisar "Tu Entrenador ya armó la semana que viene" en
 * ActividadTab -- mismo patrón que hasPlanToImport en WeekPlanner.tsx, pero
 * para fuerza (que no pasa por WeekPlan, va directo a assigned_sessions).
 */
export function useNextWeekTrainingPlan(authenticated: boolean, hasTrainerLink: boolean) {
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const refetch = useCallback(async () => {
    if (!supabase || !hasTrainerLink) {
      setReady(false);
      setLoaded(true);
      return;
    }
    const nextMonday = fmtDate(addDays(isoMonday(fmtDate(new Date())), 7));
    const { data } = await supabase
      .from("training_plans")
      .select("id")
      .eq("week_start", nextMonday)
      .eq("disciplina", "fuerza")
      .eq("status", "publicado")
      .maybeSingle();
    setReady(Boolean(data));
    setLoaded(true);
  }, [hasTrainerLink]);

  useEffect(() => {
    if (authenticated) refetch();
    else {
      setReady(false);
      setLoaded(true);
    }
  }, [authenticated, refetch]);

  return { ready, loaded, refetch };
}
