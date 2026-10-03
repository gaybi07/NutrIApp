"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import { MealKey } from "./types";

export interface ExportedMeal {
  fecha: string;
  meal: MealKey;
  title: string;
  ingredients: { name: string; quantity: number; unit: "g" | "ml" | "u." }[] | null;
}

export interface HouseholdExportRow {
  user_id: string;
  nombre: string;
  items: ExportedMeal[];
  exported_at: string;
}

/**
 * Alacena compartida: cada integrante "exporta su parte" de una semana (household_week_selections, migration
 * 2026-10-07). La lista de compras del grupo se arma solo cuando exportaron todos. `memberCount` sale de
 * useHousehold; acá se cuentan las partes exportadas.
 */
export function useHouseholdExports(householdId: string | null, weekStart: string) {
  const [rows, setRows] = useState<HouseholdExportRow[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refetch = useCallback(async () => {
    if (!supabase || !householdId) {
      setRows([]);
      setLoaded(true);
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    setMyId(userData.user?.id ?? null);
    const { data, error: fetchError } = await supabase
      .from("household_week_selections")
      .select("user_id, nombre, items, exported_at")
      .eq("household_id", householdId)
      .eq("week_start", weekStart);
    if (fetchError) {
      // Sin la migración corrida la tabla no existe: no se rompe nada, solo no hay estado.
      setRows([]);
      setError(fetchError.message);
    } else {
      setRows((data as HouseholdExportRow[]) || []);
      setError("");
    }
    setLoaded(true);
  }, [householdId, weekStart]);

  useEffect(() => {
    refetch();
    // Para ver cuándo exporta el otro integrante sin recargar la página.
    const interval = setInterval(refetch, 30000);
    const onFocus = () => refetch();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [refetch]);

  const mine = rows.find((r) => r.user_id === myId) ?? null;

  const exportMine = useCallback(
    async (items: ExportedMeal[]) => {
      if (!supabase || !householdId) return false;
      setBusy(true);
      setError("");
      try {
        // getSession lee la sesión guardada (no hace una llamada a la red como getUser, que en algunos celulares se cuelga).
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;
        if (!user) throw new Error("No hay sesión: cerrá sesión y volvé a entrar.");
        const nombre = (user.email || "").split("@")[0] || "Integrante";
        const save = supabase.from("household_week_selections").upsert(
          {
            household_id: householdId,
            user_id: user.id,
            week_start: weekStart,
            nombre,
            items,
            exported_at: new Date().toISOString(),
          },
          { onConflict: "household_id,user_id,week_start" }
        );
        const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Tardó demasiado: revisá tu conexión y probá de nuevo.")), 20000));
        const { error: upsertError } = await Promise.race([save, timeout]);
        if (upsertError) throw new Error(upsertError.message);
        await refetch();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo exportar.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [householdId, weekStart, refetch]
  );

  return { rows, mine, myId, loaded, busy, error, exportMine, refetch };
}
