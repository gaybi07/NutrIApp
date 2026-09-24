"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import { DayMealOptions, Weekday } from "./types";

interface NutritionPlan {
  id: string;
  trainerId: string;
  studentId: string;
  weekStart: string;
  days: Partial<Record<Weekday, DayMealOptions>>;
  status: "borrador" | "publicado";
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function planFromRow(row: Record<string, unknown>): NutritionPlan {
  return {
    id: row.id as string,
    trainerId: row.trainer_id as string,
    studentId: row.student_id as string,
    weekStart: row.week_start as string,
    days: (row.days as Partial<Record<Weekday, DayMealOptions>>) || {},
    status: row.status as NutritionPlan["status"],
    publishedAt: (row.published_at as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/**
 * Lado NUTRICIONISTA: el Plan Nutricional (Meal Options por día) de UN
 * paciente puntual, para UNA semana. Calcado de `useTrainingPlan`
 * (lib/useTrainingPlans.ts) pero:
 * - `days` guarda `DayMealOptions` (comida -> Meal Options[]) en vez de un
 *   id de TrainerRoutine -- no hay biblioteca que elegir, el Nutricionista
 *   escribe las opciones directo.
 * - `publish()` NO llama a `publish_training_plan` (esa RPC arma
 *   `assigned_sessions` a partir de `trainer_routines`, no aplica acá) --
 *   para nutrición, `training_plans` ES el objeto congelado (ticket 01: se
 *   evalúa por semana completa, no por día), así que publicar es solo un
 *   update de estado.
 * - Fijo en `disciplina: "nutricion"` -- este hook es exclusivo de
 *   nutrición, a diferencia de `useTrainingPlan` que sigue siendo
 *   fuerza-only.
 */
export function useNutritionPlan(authenticated: boolean, studentId: string | null, weekStart: string) {
  const [plan, setPlan] = useState<NutritionPlan | null>(null);
  const [days, setDays] = useState<Partial<Record<Weekday, DayMealOptions>>>({});
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const refetch = useCallback(async () => {
    if (!supabase || !studentId) {
      setPlan(null);
      setDays({});
      setLoaded(true);
      return;
    }
    const { data } = await supabase
      .from("training_plans")
      .select("*")
      .eq("student_id", studentId)
      .eq("week_start", weekStart)
      .eq("disciplina", "nutricion")
      .maybeSingle();
    const found = data ? planFromRow(data) : null;
    setPlan(found);
    setDays(found?.days || {});
    setLoaded(true);
  }, [studentId, weekStart]);

  useEffect(() => {
    if (authenticated && studentId) refetch();
    else {
      setPlan(null);
      setDays({});
      setLoaded(true);
    }
  }, [authenticated, studentId, refetch]);

  const setDay = useCallback((weekday: Weekday, dayMealOptions: DayMealOptions | null) => {
    setDays((prev) => {
      const next = { ...prev };
      if (dayMealOptions && Object.keys(dayMealOptions).length > 0) next[weekday] = dayMealOptions;
      else delete next[weekday];
      return next;
    });
  }, []);

  const saveDraft = useCallback(async (): Promise<string | null> => {
    if (!supabase || !studentId) return null;
    setBusy(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      return null;
    }
    const { data, error } = await supabase
      .from("training_plans")
      .upsert(
        { trainer_id: user.id, student_id: studentId, week_start: weekStart, days, disciplina: "nutricion" },
        { onConflict: "trainer_id,student_id,week_start,disciplina" }
      )
      .select("id")
      .single();
    setBusy(false);
    if (error) {
      setStatus(error.message);
      return null;
    }
    setStatus("Borrador guardado ✓");
    await refetch();
    return (data?.id as string) ?? null;
  }, [studentId, weekStart, days, refetch]);

  const publish = useCallback(async () => {
    setBusy(true);
    setStatus("Publicando...");
    const planId = await saveDraft();
    if (!planId || !supabase) {
      setBusy(false);
      return;
    }
    const { error } = await supabase
      .from("training_plans")
      .update({ status: "publicado", published_at: new Date().toISOString() })
      .eq("id", planId);
    setBusy(false);
    if (error) {
      setStatus(error.message);
      return;
    }
    setStatus("Semana publicada ✓ — tu paciente ya la puede ver");
    await refetch();
  }, [saveDraft, refetch]);

  return { plan, days, loaded, busy, status, setDay, saveDraft, publish };
}
