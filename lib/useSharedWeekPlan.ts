"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import { WeekPlan } from "./types";

/**
 * Plan de la semana que viene compartido entre los integrantes del grupo
 * (households.week_plan, ver migration_2026-09-20) -- mismo hook/refetch/
 * realtime que useSharedInventory.ts, pero para una sola columna jsonb en
 * vez de una tabla de filas.
 */
export function useSharedWeekPlan(householdId: string | null) {
  const [weekPlan, setWeekPlan] = useState<WeekPlan>({});
  const [loaded, setLoaded] = useState(false);

  const refetch = useCallback(async () => {
    if (!supabase || !householdId) {
      setWeekPlan({});
      setLoaded(true);
      return;
    }
    const { data } = await supabase.from("households").select("week_plan").eq("id", householdId).maybeSingle();
    setWeekPlan((data?.week_plan as WeekPlan) || {});
    setLoaded(true);
  }, [householdId]);

  useEffect(() => {
    setLoaded(false);
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!householdId) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") refetch();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [householdId, refetch]);

  useEffect(() => {
    if (!supabase || !householdId) return;
    const client = supabase;
    const channel = client
      .channel(`household-weekplan-${householdId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "households", filter: `id=eq.${householdId}` },
        () => refetch()
      )
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }, [householdId, refetch]);

  const savePlan = useCallback(
    async (next: WeekPlan) => {
      if (!supabase || !householdId) return;
      setWeekPlan(next);
      await supabase.from("households").update({ week_plan: next, week_plan_updated_at: new Date().toISOString() }).eq("id", householdId);
    },
    [householdId]
  );

  return { weekPlan, loaded, savePlan };
}
