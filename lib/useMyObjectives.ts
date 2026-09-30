"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import { Objective } from "./types";
import { objectiveFromRow } from "./useObjectives";
import { ObjectiveCheck } from "./objectiveProgress";

/**
 * Lado CLIENTE: los objetivos que le fijaron sus profesionales, las marcas diarias de los que se marcan a mano
 * (agua, hábitos propios) y el registro del logro cuando la app detecta que se cumplió (mark_objective_achieved).
 */
export function useMyObjectives(authenticated: boolean, onPointsChanged?: () => void) {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [checks, setChecks] = useState<ObjectiveCheck[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refetch = useCallback(async () => {
    if (!supabase) {
      setLoaded(true);
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setLoaded(true);
      return;
    }
    const { data, error } = await supabase
      .from("objectives")
      .select("*")
      .eq("student_id", userId)
      .in("estado", ["activo", "logrado"])
      .order("created_at", { ascending: false });
    if (error) {
      // sin la migración corrida la tabla no existe: no hay objetivos y no pasa nada
      setObjectives([]);
      setLoaded(true);
      return;
    }
    const list = (data || []).map(objectiveFromRow);
    setObjectives(list);
    const manualIds = list.filter((o) => o.tipo === "agua" || o.tipo === "custom").map((o) => o.id);
    if (manualIds.length > 0) {
      const { data: checkRows } = await supabase.from("objective_checks").select("objective_id, fecha, valor, cumplido").in("objective_id", manualIds);
      setChecks(
        (checkRows || []).map((r) => ({ objectiveId: r.objective_id as string, fecha: r.fecha as string, valor: r.valor == null ? null : Number(r.valor), cumplido: Boolean(r.cumplido) }))
      );
    } else {
      setChecks([]);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (authenticated) refetch();
    else {
      setObjectives([]);
      setChecks([]);
      setLoaded(true);
    }
  }, [authenticated, refetch]);

  /** Marca (o desmarca) hoy para un objetivo manual. `valor` para agua (litros). */
  const saveCheck = useCallback(
    async (objectiveId: string, fecha: string, cumplido: boolean, valor?: number) => {
      if (!supabase) return;
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return;
      await supabase
        .from("objective_checks")
        .upsert({ objective_id: objectiveId, student_id: userId, fecha, cumplido, valor: valor ?? null }, { onConflict: "objective_id,fecha" });
      await refetch();
    },
    [refetch]
  );

  const markAchieved = useCallback(
    async (objectiveId: string) => {
      if (!supabase) return;
      await supabase.rpc("mark_objective_achieved", { p_objective_id: objectiveId });
      await refetch();
      onPointsChanged?.();
    },
    [refetch]
  );

  return { objectives, checks, loaded, saveCheck, markAchieved, refetch };
}
