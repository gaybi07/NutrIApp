"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import { BodyMeasurement } from "@/lib/bodyGoal";

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
      .select("fecha, peso, grasa_pct, cintura, cadera, pecho, brazo, muslo")
      .eq("user_id", userId)
      .order("fecha", { ascending: true });
    if (error || !data) return;
    setItems(
      data.map((r) => ({
        fecha: r.fecha as string,
        peso: r.peso == null ? undefined : Number(r.peso),
        grasa_pct: r.grasa_pct == null ? undefined : Number(r.grasa_pct),
        cintura: r.cintura == null ? undefined : Number(r.cintura),
        cadera: r.cadera == null ? undefined : Number(r.cadera),
        pecho: r.pecho == null ? undefined : Number(r.pecho),
        brazo: r.brazo == null ? undefined : Number(r.brazo),
        muslo: r.muslo == null ? undefined : Number(r.muslo),
      }))
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
      const { error } = await supabase.from("body_measurements").upsert({
        user_id: userId,
        fecha: m.fecha,
        peso: m.peso ?? null,
        grasa_pct: m.grasa_pct ?? null,
        cintura: m.cintura ?? null,
        cadera: m.cadera ?? null,
        pecho: m.pecho ?? null,
        brazo: m.brazo ?? null,
        muslo: m.muslo ?? null,
      });
      if (error) return error.message;
      await refetch();
      return null;
    },
    [refetch]
  );

  return { items, save, refetch };
}
