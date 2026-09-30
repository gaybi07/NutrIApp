"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import { Disciplina, Objective } from "./types";

export function objectiveFromRow(row: Record<string, unknown>): Objective {
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    trainerId: row.trainer_id as string,
    disciplina: row.disciplina as Disciplina,
    tipo: row.tipo as Objective["tipo"],
    nombre: row.nombre as string,
    meta: Number(row.meta),
    unidad: (row.unidad as string) ?? "",
    direccion: row.direccion as Objective["direccion"],
    ventana: row.ventana as Objective["ventana"],
    diasPorSemana: Number(row.dias_por_semana ?? 5),
    semanasSeguidas: Number(row.semanas_seguidas ?? 2),
    ejercicio: (row.ejercicio as string) ?? null,
    fechaLimite: (row.fecha_limite as string) ?? null,
    estado: row.estado as Objective["estado"],
    logradoAt: (row.logrado_at as string) ?? null,
    mensajeLogro: (row.mensaje_logro as string) ?? null,
    createdAt: row.created_at as string,
  };
}

export type NewObjective = Pick<
  Objective,
  "tipo" | "nombre" | "meta" | "unidad" | "direccion" | "ventana" | "diasPorSemana" | "semanasSeguidas" | "ejercicio" | "fechaLimite"
>;

/** Lado PROFESIONAL: los objetivos que fijó para UN cliente (crear, archivar, dejar el mensaje cuando se logra). */
export function useStudentObjectives(studentId: string | null, disciplina: Disciplina) {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refetch = useCallback(async () => {
    if (!supabase || !studentId) {
      setLoaded(true);
      return;
    }
    const { data, error: fetchError } = await supabase
      .from("objectives")
      .select("*")
      .eq("student_id", studentId)
      .eq("disciplina", disciplina)
      .order("created_at", { ascending: false });
    if (fetchError) {
      // Sin la migración corrida la tabla no existe: no rompe nada, solo no hay objetivos.
      setError(fetchError.message);
      setObjectives([]);
    } else {
      setError("");
      setObjectives((data || []).map(objectiveFromRow));
    }
    setLoaded(true);
  }, [studentId, disciplina]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const create = useCallback(
    async (input: NewObjective) => {
      if (!supabase || !studentId) return false;
      setBusy(true);
      setError("");
      const { data: userData } = await supabase.auth.getUser();
      const trainerId = userData.user?.id;
      if (!trainerId) {
        setBusy(false);
        return false;
      }
      const { error: insertError } = await supabase.from("objectives").insert({
        student_id: studentId,
        trainer_id: trainerId,
        disciplina,
        tipo: input.tipo,
        nombre: input.nombre.trim(),
        meta: input.meta,
        unidad: input.unidad,
        direccion: input.direccion,
        ventana: input.ventana,
        dias_por_semana: input.diasPorSemana,
        semanas_seguidas: input.semanasSeguidas,
        ejercicio: input.ejercicio || null,
        fecha_limite: input.fechaLimite || null,
      });
      setBusy(false);
      if (insertError) {
        setError(insertError.message);
        return false;
      }
      await refetch();
      return true;
    },
    [studentId, disciplina, refetch]
  );

  const update = useCallback(
    async (id: string, patch: Record<string, unknown>) => {
      if (!supabase) return;
      const { error: updateError } = await supabase.from("objectives").update(patch).eq("id", id);
      if (updateError) setError(updateError.message);
      await refetch();
    },
    [refetch]
  );

  return { objectives, loaded, error, busy, create, archive: (id: string) => update(id, { estado: "archivado" }), setMessage: (id: string, mensaje: string) => update(id, { mensaje_logro: mensaje.trim() || null }), refetch };
}
