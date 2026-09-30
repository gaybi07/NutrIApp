"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/browser";

/** Puntos del cliente: suma del libro de puntos (points_ledger, migration_2026-10-10). Sin la migración, 0. */
export function useMyPoints(authenticated: boolean) {
  const [total, setTotal] = useState(0);
  const [byObjective, setByObjective] = useState<Record<string, number>>({});

  const refetch = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from("points_ledger").select("objective_id, puntos");
    if (error || !data) return;
    let sum = 0;
    const map: Record<string, number> = {};
    for (const row of data) {
      sum += Number(row.puntos) || 0;
      if (row.objective_id) map[row.objective_id as string] = (map[row.objective_id as string] || 0) + (Number(row.puntos) || 0);
    }
    setTotal(sum);
    setByObjective(map);
  }, []);

  useEffect(() => {
    if (authenticated) refetch();
  }, [authenticated, refetch]);

  return { total, byObjective, refetch };
}
