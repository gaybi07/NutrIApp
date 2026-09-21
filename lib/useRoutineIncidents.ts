"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import { RoutineIncident, RoutineIncidentType } from "./types";

export interface RoutineIncidentInput {
  fecha: string;
  routineId: string;
  routineNombre: string;
  trainerRoutineId?: string | null;
  tipo: RoutineIncidentType;
  ejercicioNombre?: string | null;
  detalle?: string | null;
}

function fromRow(row: Record<string, unknown>): RoutineIncident {
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    trainerId: row.trainer_id as string,
    fecha: row.fecha as string,
    routineId: row.routine_id as string,
    routineNombre: row.routine_nombre as string,
    trainerRoutineId: (row.trainer_routine_id as string) ?? null,
    tipo: row.tipo as RoutineIncidentType,
    ejercicioNombre: (row.ejercicio_nombre as string) ?? null,
    detalle: (row.detalle as string) ?? null,
    vistoPorEntrenador: Boolean(row.visto_por_entrenador),
    createdAt: row.created_at as string,
  };
}

/**
 * Lado ALUMNO: guarda en un solo lote las incidencias juntadas durante una
 * sesión de LiveWorkout (omitidos, reemplazos, comentarios, series/
 * ejercicios fuera de plan) -- se llama una sola vez, al finalizar el
 * entrenamiento, igual que el resto de lo que se persiste en ese momento.
 * No hace nada si la lista viene vacía o si no hay `trainerId` (rutina
 * personal, sin entrenador a quien avisar).
 */
export function useRoutineIncidents() {
  const recordMany = useCallback(async (trainerId: string | undefined | null, incidents: RoutineIncidentInput[]) => {
    if (!supabase || !trainerId || incidents.length === 0) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("routine_incidents").insert(
      incidents.map((incident) => ({
        student_id: user.id,
        trainer_id: trainerId,
        fecha: incident.fecha,
        routine_id: incident.routineId,
        routine_nombre: incident.routineNombre,
        trainer_routine_id: incident.trainerRoutineId || null,
        tipo: incident.tipo,
        ejercicio_nombre: incident.ejercicioNombre || null,
        detalle: incident.detalle || null,
      }))
    );
  }, []);

  return { recordMany };
}

/** Lado ENTRENADOR: incidencias reportadas por sus alumnos vinculados, más
 * recientes primero, con "marcar como vista". */
export function useTrainerIncidents(authenticated: boolean, enabled: boolean) {
  const [incidents, setIncidents] = useState<RoutineIncident[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!supabase || !enabled) {
      setLoaded(true);
      return;
    }
    const { data } = await supabase
      .from("routine_incidents")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setIncidents((data || []).map(fromRow));
    setLoaded(true);
  }, [enabled]);

  useEffect(() => {
    if (authenticated && enabled) refetch();
    else setLoaded(true);
  }, [authenticated, enabled, refetch]);

  const markSeen = useCallback(
    async (id: string) => {
      if (!supabase) return;
      setBusyId(id);
      await supabase.from("routine_incidents").update({ visto_por_entrenador: true }).eq("id", id);
      await refetch();
      setBusyId(null);
    },
    [refetch]
  );

  return { incidents, loaded, busyId, markSeen };
}
