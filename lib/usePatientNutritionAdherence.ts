"use client";

import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabase/browser";

export interface NutritionAdherenceDay {
  fecha: string;
  plannedKcal: number;
  plannedProtein: number;
  actualKcal: number;
  actualProtein: number;
  pctSimilitud: number | null;
}

export interface NutritionAdherence {
  weekStart: string;
  hasPlan: boolean;
  adherenciaPromedio: number | null;
  dias: NutritionAdherenceDay[];
}

/**
 * Lado NUTRICIONISTA: qué tan parecido a lo planificado fue lo que el
 * paciente cargó de verdad esa semana (RPC get_patient_nutrition_adherence,
 * ver migration_2026-10-02) -- % día por día comparando kcal reales contra
 * la opción A de cada comida planificada ese weekday.
 */
export function usePatientNutritionAdherence() {
  const [byPatient, setByPatient] = useState<Record<string, NutritionAdherence | null>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const load = useCallback(async (patientId: string, weekStart: string) => {
    if (!supabase) return;
    setLoadingId(patientId);
    const { data, error } = await supabase.rpc("get_patient_nutrition_adherence", {
      p_student_id: patientId,
      p_week_start: weekStart,
    });
    setByPatient((prev) => ({ ...prev, [patientId]: error ? null : (data as NutritionAdherence) }));
    setLoadingId(null);
  }, []);

  return { byPatient, loadingId, load };
}
