"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import { BodyMeasurement, MEASUREMENT_FIELDS } from "@/lib/bodyGoal";

/** Mediciones corporales propias (body_measurements, migration_2026-10-14). Sin la migración, lista vacía. */
export function useBodyMeasurements(authenticated: boolean) {
  const [items, setItems] = useState<BodyMeasurement[]>([]);

  const refetch = useCallback(async () => {
    if (!supabase) return;
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return;
    const { data, error } = await supabase
      .from("body_measurements")
      .select("*")
      .eq("user_id", userId)
      .order("fecha", { ascending: true });
    if (error || !data) return;
    setItems(
      data.map((r) => {
        const m: BodyMeasurement = { fecha: r.fecha as string };
        for (const f of MEASUREMENT_FIELDS) {
          const v = (r as Record<string, unknown>)[f];
          if (v != null) (m as Record<string, unknown>)[f] = Number(v);
        }
        return m;
      })
    );
  }, []);

  useEffect(() => {
    if (authenticated) refetch();
  }, [authenticated, refetch]);

  /** Guarda (o pisa) la medición de un día. Devuelve un mensaje de error, o null si salió bien. */
  const save = useCallback(
    async (m: BodyMeasurement): Promise<string | null> => {
      if (!supabase) return "No hay sesión.";
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) return "No hay sesión.";
      // No pisa lo ya cargado ese mismo día: se suma a la medición existente.
      const existing = items.find((x) => x.fecha === m.fecha);
      const merged: Record<string, unknown> = { ...existing, ...Object.fromEntries(Object.entries(m).filter(([, v]) => v != null)) };
      const row: Record<string, unknown> = { user_id: userId, fecha: m.fecha };
      for (const f of MEASUREMENT_FIELDS) row[f] = merged[f] ?? null;
      const { error } = await supabase.from("body_measurements").upsert(row);
      if (error) return error.message;
      await refetch();
      return null;
    },
    [refetch, items]
  );

  return { items, save, refetch };
}
