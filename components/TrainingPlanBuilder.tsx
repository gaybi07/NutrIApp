"use client";

import { useEffect, useMemo, useState } from "react";
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
 *
 * Carrusel horizontal de 7 días + panel de edición del día seleccionado
 * debajo -- variante elegida por el usuario sobre el prototipo (ver
 * design-scratch/prototype-planificador-semanal.html, variante C).
 */
export function TrainingPlanBuilder({ studentId }: { studentId: string }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = useMemo(() => {
    const monday = isoMonday(fmtDate(new Date()));
    return fmtDate(addDays(monday, weekOffset * 7));
  }, [weekOffset]);
  const weekDates = useMemo(() => WEEKDAYS_LMV.map((_, i) => fmtDate(addDays(new Date(`${weekStart}T00:00:00`), i))), [weekStart]);

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

  // Arranca en el día de hoy si cae dentro de la semana que se está viendo;
  // si no, el lunes.
  const todayIso = fmtDate(new Date());
  const [selected, setSelected] = useState(0);
  useEffect(() => {
    const idx = weekDates.indexOf(todayIso);
    setSelected(idx >= 0 ? idx : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  const weekLabel = `${weekStart} al ${fmtDate(addDays(new Date(`${weekStart}T00:00:00`), 6))}`;
  const selectedWeekday = WEEKDAYS_LMV[selected];
  const selectedFecha = weekDates[selected];
  const selectedSession = sessionByFecha.get(selectedFecha);
  const selectedExecution = selectedSession ? executionsBySession[selectedSession.id] : undefined;

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
        <>
          {/* Carrusel: un vistazo a toda la semana, tocar un día lo selecciona
              para editar/ver detalle abajo -- no hay 7 selects a la vez. */}
          <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1.5">
            {WEEKDAYS_LMV.map((weekday, i) => {
              const fecha = weekDates[i];
              const routine = days[weekday] ? publishedRoutines.find((r) => r.id === days[weekday]) : undefined;
              const session = sessionByFecha.get(fecha);
              const badge = session ? STATUS_BADGE[session.status] : null;
              const isToday = fecha === todayIso;
              const isSelected = i === selected;
              return (
                <button
                  key={weekday}
                  type="button"
                  onClick={() => setSelected(i)}
                  className={`min-w-[108px] shrink-0 rounded-xl border p-2.5 text-left ${
                    isSelected ? "border-gold bg-gold/10" : isToday ? "border-gold/50 bg-gold/5" : "border-border bg-surface"
                  }`}
                >
                  <div className="font-mono text-[9px] uppercase tracking-wide text-textMuted">
                    {WEEKDAY_LABELS_SHORT[weekday]} {new Date(`${fecha}T00:00:00`).getDate()}
                  </div>
                  <div className={`mt-1.5 text-[12px] font-semibold leading-tight ${routine ? "text-text" : "text-textMuted"}`}>
                    {routine ? routine.nombre : "Descanso"}
                  </div>
                  {badge && (
                    <span className={`mt-1.5 inline-block rounded-full border px-1.5 py-0.5 font-mono text-[7.5px] uppercase tracking-wide ${badge.cls}`}>
                      {badge.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Panel de edición del día seleccionado */}
          <div className="mt-3 rounded-xl border border-dashed border-gold/40 bg-gold/5 p-3">
            <div className="mb-2 font-mono text-[9px] uppercase tracking-wide text-textMuted">
              Editar {WEEKDAY_LABELS_SHORT[selectedWeekday]} {new Date(`${selectedFecha}T00:00:00`).getDate()}
            </div>
            <select
              value={days[selectedWeekday] ?? ""}
              onChange={(e) => setDay(selectedWeekday, e.target.value || null)}
              className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-[13px]"
            >
              <option value="">— Descanso —</option>
              {publishedRoutines.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
            </select>

            {selectedSession?.status === "completada" && selectedExecution && (
              <div className="mt-3 border-t border-dashed border-border pt-2 text-[11px]">
                <div className="mb-1.5 font-mono text-[8.5px] uppercase tracking-wide text-textMuted">
                  Planificado vs. hecho de verdad
                  {selectedExecution.duracionMinutos ? ` · ${selectedExecution.duracionMinutos} min` : ""}
                </div>
                {selectedSession.routineSnapshot.map((planned, idx) => {
                  const real = selectedExecution.ejercicios[idx];
                  return (
                    <div key={idx} className="mb-1 flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-text">{planned.nombre}</span>
                      <span className="shrink-0 text-textMuted">
                        {planned.series}x{planned.repeticiones}
                        {planned.peso ? `@${planned.peso}kg` : ""}
                        {real ? (
                          <>
                            {" → "}
                            <span className="text-sage">
                              {real.series}x{real.repeticiones}
                              {real.peso ? `@${real.peso}kg` : ""}
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
        </>
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
