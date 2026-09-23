"use client";

import { useMemo, useState } from "react";
import { Weekday, WEEKDAY_LABELS_SHORT } from "@/lib/types";
import { isoMonday, fmtDate, addDays } from "@/lib/calculations";
import { useTrainerRoutines } from "@/lib/useTrainerLink";
import { useTrainingPlan, useStudentAssignedSessions, useStudentExecutions } from "@/lib/useTrainingPlans";

const WEEKDAYS_LMV: Weekday[] = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  planificada: { label: "planificada", cls: "border-border text-textMuted" },
  movida: { label: "movida", cls: "border-gold/50 text-gold" },
  en_curso: { label: "en curso", cls: "border-gold bg-gold/15 text-gold" },
  completada: { label: "completada", cls: "border-sage/50 bg-sage/10 text-sage" },
  vencida: { label: "vencida", cls: "border-rust/50 bg-rust/10 text-rust" },
  cancelada: { label: "cancelada", cls: "border-border text-textMuted" },
};

/**
 * Lado Profe: armar y publicar la rutina de cada día de la semana para UN
 * alumno. "Publicar" llama a publish_training_plan (RPC) -- eso es lo que
 * de verdad crea las AssignedSession que el alumno ve en LiveWorkout;
 * guardar borrador no alcanza. Republicar una semana ya publicada es el
 * flujo normal para editarla: la función no pisa lo que el alumno ya
 * movió/empezó/completó (ver comentario en la migración).
 */
export function TrainingPlanBuilder({ studentId }: { studentId: string }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = useMemo(() => {
    const monday = isoMonday(fmtDate(new Date()));
    return fmtDate(addDays(monday, weekOffset * 7));
  }, [weekOffset]);

  const { routines, loaded: routinesLoaded } = useTrainerRoutines(true, true);
  const publishedRoutines = useMemo(() => routines.filter((r) => (r.status ?? "publicada") === "publicada"), [routines]);

  const { days, loaded: planLoaded, busy, status, setDay, saveDraft, publish } = useTrainingPlan(true, studentId, weekStart);
  const { sessions } = useStudentAssignedSessions(true, studentId, weekStart);
  const sessionByFecha = useMemo(() => {
    const map = new Map<string, (typeof sessions)[number]>();
    sessions.forEach((s) => map.set(s.fechaPlanificada, s));
    return map;
  }, [sessions]);
  const completedSessionIds = useMemo(() => sessions.filter((s) => s.status === "completada").map((s) => s.id), [sessions]);
  const { executionsBySession } = useStudentExecutions(true, completedSessionIds);
  const [expandedFecha, setExpandedFecha] = useState<string | null>(null);

  const weekLabel = `${weekStart} al ${fmtDate(addDays(new Date(`${weekStart}T00:00:00`), 6))}`;

  if (!routinesLoaded || !planLoaded) {
    return <div className="text-[12px] text-textMuted">Cargando planificador...</div>;
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setWeekOffset((o) => o - 1)}
          className="rounded-full border border-border px-2 py-1 font-mono text-[11px] text-textMuted"
        >
          ‹
        </button>
        <div className="text-center">
          <div className="font-mono text-[10px] uppercase tracking-wide text-textMuted">Semana del {weekLabel}</div>
          <div className={`font-mono text-[9px] uppercase tracking-wide ${weekOffset === 0 ? "text-gold" : "text-textMuted"}`}>
            {weekOffset === 0 ? "esta semana" : weekOffset > 0 ? `en ${weekOffset} semana${weekOffset > 1 ? "s" : ""}` : "semana pasada"}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setWeekOffset((o) => o + 1)}
          className="rounded-full border border-border px-2 py-1 font-mono text-[11px] text-textMuted"
        >
          ›
        </button>
      </div>

      {publishedRoutines.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-3 text-[12px] text-textMuted">
          Todavía no tenés ninguna rutina publicada — creá una primero para poder asignarla.
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {WEEKDAYS_LMV.map((weekday, i) => {
            const fecha = fmtDate(addDays(new Date(`${weekStart}T00:00:00`), i));
            const session = sessionByFecha.get(fecha);
            const badge = session ? STATUS_BADGE[session.status] : null;
            const execution = session ? executionsBySession[session.id] : undefined;
            const canExpand = session?.status === "completada" && execution;
            const expanded = expandedFecha === fecha;
            return (
              <div key={weekday}>
                <div
                  className={`flex items-center gap-2 rounded-lg border px-2 py-2 ${
                    days[weekday] ? "border-gold/40 bg-gold/5" : "border-border bg-bg/40"
                  }`}
                >
                  <div className="w-9 shrink-0 font-mono text-[10px] uppercase tracking-wide text-textMuted">
                    {WEEKDAY_LABELS_SHORT[weekday]}
                  </div>
                  <select
                    value={days[weekday] ?? ""}
                    onChange={(e) => setDay(weekday, e.target.value || null)}
                    className="min-w-0 flex-1 rounded-md border border-border bg-surface px-1.5 py-1 text-[12px]"
                  >
                    <option value="">— Descanso —</option>
                    {publishedRoutines.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nombre}
                      </option>
                    ))}
                  </select>
                  {badge && (
                    <button
                      type="button"
                      disabled={!canExpand}
                      onClick={() => setExpandedFecha(expanded ? null : fecha)}
                      className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[8.5px] uppercase tracking-wide ${badge.cls} ${canExpand ? "cursor-pointer" : ""}`}
                    >
                      {badge.label}
                      {canExpand ? (expanded ? " ▾" : " ▸") : ""}
                    </button>
                  )}
                </div>
                {expanded && execution && session && (
                  <div className="mt-1 ml-9 rounded-lg border border-dashed border-gold/40 bg-gold/5 p-2 text-[11px]">
                    <div className="mb-1 font-mono text-[8.5px] uppercase tracking-wide text-textMuted">
                      Planificado vs. hecho de verdad{execution.duracionMinutos ? ` · ${execution.duracionMinutos} min` : ""}
                    </div>
                    {session.routineSnapshot.map((planned, idx) => {
                      const real = execution.ejercicios[idx];
                      return (
                        <div key={idx} className="mb-1 flex items-center justify-between gap-2">
                          <span className="min-w-0 truncate text-text">{planned.nombre}</span>
                          <span className="shrink-0 text-textMuted">
                            {planned.series}x{planned.repeticiones}{planned.peso ? `@${planned.peso}kg` : ""}
                            {real ? (
                              <>
                                {" → "}
                                <span className="text-sage">
                                  {real.series}x{real.repeticiones}{real.peso ? `@${real.peso}kg` : ""}
                                </span>
                              </>
                            ) : (
                              <span className="text-rust"> → no lo hizo</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => saveDraft()}
          className="flex-1 rounded-lg border border-border bg-bg/60 p-2.5 font-mono text-[11px] uppercase tracking-wide text-textMuted disabled:opacity-50"
        >
          Guardar borrador
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => publish()}
          className="flex-1 rounded-lg bg-gold p-2.5 font-sans text-[13px] font-bold text-bg disabled:opacity-50"
        >
          Publicar
        </button>
      </div>
      {status && <div className="mt-2 text-center font-mono text-[11px] text-textMuted">{status}</div>}
      <div className="mt-2 text-center font-mono text-[9px] text-textMuted">
        Publicar de nuevo no pisa los días que tu alumno ya movió o completó.
      </div>
    </div>
  );
}
