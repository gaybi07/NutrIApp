"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import { MealKey, MEAL_LABELS } from "@/lib/types";

interface SelectionRow {
  week_start: string;
  selections: Record<string, Partial<Record<MealKey, string>>>;
  feedback: Record<string, Partial<Record<MealKey, { motivo?: string; sugerencia?: string }>>>;
  comentario: string | null;
  sent_at: string | null;
}

const MEAL_ORDER: MealKey[] = ["des", "alm", "mer", "cen", "col"];
const DOW = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function dayLabel(fecha: string) {
  const d = new Date(`${fecha}T00:00:00`);
  return `${DOW[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}

/**
 * Lado NUTRICIONISTA: lo que el paciente eligió de sus opciones para una semana, con el motivo y los cambios que
 * sugiere (plan_selections, migration_2026-10-06). Se muestra arriba del armado del plan.
 */
export function StudentPlanSelections({ studentId, weekStarts }: { studentId: string; weekStarts: string[] }) {
  const [rows, setRows] = useState<SelectionRow[] | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("plan_selections")
      .select("week_start, selections, feedback, comentario, sent_at")
      .eq("student_id", studentId)
      .eq("disciplina", "nutricion")
      .in("week_start", weekStarts)
      .order("week_start")
      .then(({ data, error }) => setRows(error ? [] : ((data as SelectionRow[]) || [])));
  }, [studentId, weekStarts]);

  if (!rows || rows.length === 0) return null;

  return (
    <div className="mb-4 space-y-3">
      {rows.map((row) => (
        <div key={row.week_start} className="rounded-xl border border-gold/40 bg-gold/5 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-gold">Lo que eligió el paciente · semana del {dayLabel(row.week_start)}</div>
            {row.sent_at && (
              <div className="font-mono text-[9px] text-textMuted">
                enviado {new Date(row.sent_at).toLocaleDateString("es-AR", { day: "numeric", month: "numeric" })}
              </div>
            )}
          </div>
          {row.comentario && <div className="mt-1.5 rounded-lg border border-border bg-bg/40 px-2.5 py-1.5 text-[12px] text-text">“{row.comentario}”</div>}
          <div className="mt-2 space-y-2">
            {Object.keys(row.selections)
              .sort()
              .map((fecha) => (
                <div key={fecha}>
                  <div className="font-mono text-[9px] uppercase tracking-wide text-textMuted">{dayLabel(fecha)}</div>
                  <div className="mt-0.5 space-y-1">
                    {MEAL_ORDER.filter((meal) => row.selections[fecha]?.[meal]).map((meal) => {
                      const fb = row.feedback?.[fecha]?.[meal];
                      return (
                        <div key={meal} className="text-[12px] text-text">
                          <span className="text-textMuted">{MEAL_LABELS[meal]}:</span> <span className="font-semibold">{row.selections[fecha][meal]}</span>
                          {fb?.motivo && <div className="pl-3 text-[11px] text-textMuted">Por qué: {fb.motivo}</div>}
                          {fb?.sugerencia && <div className="pl-3 text-[11px] text-gold">Sugiere: {fb.sugerencia}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
