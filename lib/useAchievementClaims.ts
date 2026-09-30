"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import { Achievement } from "./achievements";

/**
 * Reclama en la base los logros que la app detecta como cumplidos (claim_achievement). Los puntos los decide la base
 * según el tipo y se acreditan una sola vez por (tipo, clave); acá solo se evita reclamar dos veces lo mismo.
 */
export function useAchievementClaims(authenticated: boolean, achievements: Achievement[], onChanged: () => void) {
  const [claimed, setClaimed] = useState<Set<string>>(new Set());
  const inFlight = useRef<Set<string>>(new Set());
  const fetched = useRef(false);

  const refetch = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from("points_ledger").select("kind, clave").not("kind", "is", null);
    if (error || !data) return;
    setClaimed(new Set(data.map((r) => `${r.kind}|${r.clave}`)));
    fetched.current = true;
  }, []);

  useEffect(() => {
    if (authenticated) refetch();
  }, [authenticated, refetch]);

  useEffect(() => {
    if (!supabase || !authenticated || !fetched.current) return;
    const pending = achievements.filter((a) => a.done && !claimed.has(`${a.kind}|${a.clave}`) && !inFlight.current.has(`${a.kind}|${a.clave}`));
    if (pending.length === 0) return;
    (async () => {
      for (const a of pending) {
        inFlight.current.add(`${a.kind}|${a.clave}`);
        await supabase!.rpc("claim_achievement", { p_kind: a.kind, p_clave: a.clave });
      }
      await refetch();
      onChanged();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [achievements, claimed, authenticated]);

  return { claimed };
}
