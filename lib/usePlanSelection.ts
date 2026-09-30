"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import { MealKey, WeekPlan } from "./types";

export interface PlanFeedbackEntry {
  motivo?: string;
  sugerencia?: string;
}
export type PlanFeedback = Record<string, Partial<Record<MealKey, PlanFeedbackEntry>>>;

const draftKey = (weekStart: string) => `registro:planfeedback:${weekStart}`;

/**
 * Lado PACIENTE: el feedback que deja sobre las opciones que eligió de la semana que viene
 * (por qué la eligió, qué cambio sugiere) y el envío a la Nutricionista. El borrador vive en
 * localStorage; "Enviar" lo sube a `plan_selections` (migration_2026-10-06).
 */
export function usePlanSelection(authenticated: boolean, hasLink: boolean, weekStart: string) {
  const [feedback, setFeedbackState] = useState<PlanFeedback>({});
  const [comentario, setComentarioState] = useState("");
  const [sentAt, setSentAt] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!authenticated || !hasLink || loadedFor.current === weekStart) return;
    loadedFor.current = weekStart;
    // 1) borrador local
    try {
      const raw = localStorage.getItem(draftKey(weekStart));
      if (raw) {
        const parsed = JSON.parse(raw) as { feedback?: PlanFeedback; comentario?: string };
        setFeedbackState(parsed.feedback || {});
        setComentarioState(parsed.comentario || "");
      }
    } catch {
      // sin localStorage: arranca vacío
    }
    // 2) lo ya enviado (si existe) pisa el borrador
    if (!supabase) return;
    supabase
      .from("plan_selections")
      .select("feedback, comentario, sent_at")
      .eq("week_start", weekStart)
      .eq("disciplina", "nutricion")
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setFeedbackState((data.feedback as PlanFeedback) || {});
        setComentarioState((data.comentario as string) || "");
        setSentAt((data.sent_at as string) || null);
      });
  }, [authenticated, hasLink, weekStart]);

  const persistDraft = useCallback(
    (nextFeedback: PlanFeedback, nextComentario: string) => {
      try {
        localStorage.setItem(draftKey(weekStart), JSON.stringify({ feedback: nextFeedback, comentario: nextComentario }));
      } catch {
        // ignorar
      }
    },
    [weekStart]
  );

  const setFeedbackFor = useCallback(
    (fecha: string, meal: MealKey, entry: PlanFeedbackEntry) => {
      setFeedbackState((prev) => {
        const next: PlanFeedback = { ...prev, [fecha]: { ...(prev[fecha] || {}), [meal]: entry } };
        persistDraft(next, comentario);
        return next;
      });
    },
    [persistDraft, comentario]
  );

  const setComentario = useCallback(
    (value: string) => {
      setComentarioState(value);
      persistDraft(feedback, value);
    },
    [persistDraft, feedback]
  );

  /** Sube la selección (`weekPlan` de esas 7 fechas) + el feedback a la Nutricionista. */
  const send = useCallback(
    async (weekPlan: WeekPlan, weekDates: string[]) => {
      if (!supabase) return false;
      setSending(true);
      setError("");
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) throw new Error("No hay sesión.");
        const selections: Record<string, Record<string, string>> = {};
        for (const fecha of weekDates) {
          const day = weekPlan[fecha];
          if (day) selections[fecha] = day as Record<string, string>;
        }
        const now = new Date().toISOString();
        const { error: upsertError } = await supabase.from("plan_selections").upsert(
          {
            student_id: userId,
            week_start: weekStart,
            disciplina: "nutricion",
            selections,
            feedback,
            comentario: comentario.trim() || null,
            status: "enviado",
            sent_at: now,
            updated_at: now,
          },
          { onConflict: "student_id,week_start,disciplina" }
        );
        if (upsertError) throw new Error(upsertError.message);
        setSentAt(now);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo enviar.");
        return false;
      } finally {
        setSending(false);
      }
    },
    [weekStart, feedback, comentario]
  );

  return { feedback, setFeedbackFor, comentario, setComentario, sentAt, sending, error, send };
}
