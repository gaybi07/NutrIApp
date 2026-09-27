"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import { DayMealOptions, Weekday } from "./types";

/**
 * Lado PACIENTE: el Plan Nutricional publicado para MÍ (auth.uid()), para
 * UNA semana puntual -- espejo de `useNutritionPlan.ts` (lado
 * Nutricionista) pero de solo lectura y sin filtrar por `student_id`
 * (lo resuelve la policy RLS "student can view own published training
 * plans", migration_2026-09-25_fix_disciplina_policies.sql). `hasLink` en
 * false corta la consulta de una -- mismo patrón guard que
 * useMyAssignedSessions -- así alguien sin Nutricionista vinculado nunca
 * dispara un request nuevo.
 */
export function useMyNutritionPlan(authenticated: boolean, hasLink: boolean, weekStart: string) {
  const [days, setDays] = useState<Partial<Record<Weekday, DayMealOptions>>>({});
  const [loaded, setLoaded] = useState(false);

  const refetch = useCallback(async () => {
    if (!supabase || !hasLink) {
      setDays({});
      setLoaded(true);
      return;
    }
    const { data } = await supabase
      .from("training_plans")
      .select("days")
      .eq("week_start", weekStart)
      .eq("disciplina", "nutricion")
      .eq("status", "publicado")
      .maybeSingle();
    setDays((data?.days as Partial<Record<Weekday, DayMealOptions>>) || {});
    setLoaded(true);
  }, [hasLink, weekStart]);

  useEffect(() => {
    if (authenticated) refetch();
    else {
      setDays({});
      setLoaded(true);
    }
  }, [authenticated, refetch]);

  return { days, loaded };
}
