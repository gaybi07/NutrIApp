"use client";

import { ReactNode } from "react";
import { DndContext } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { BarChart, Bar, XAxis, YAxis, ReferenceLine, ResponsiveContainer, Tooltip } from "recharts";
import { DayEntry, INTENSITY_STYLES, Routine, TrainingSchedule, Weekday, ActividadBlockId, DEFAULT_ACTIVIDAD_ORDER, ACTIVIDAD_BLOCK_LABELS, resolveOrder, WorkoutSuggestion, MuscleGroup, GoalMode, AssignedSession, ExerciseEntry } from "@/lib/types";
import { estimateTrainingCalories, getTrainingSessions, totalVolume, computeTrainingGoal } from "@/lib/calculations";
import { useSectionOrder } from "@/lib/useSectionOrder";
import { SortableSection } from "@/components/SortableSection";
import { SECTION_HELP } from "@/lib/helpText";
import { RoutineManager } from "@/components/RoutineManager";
import { TrainingIndicators } from "@/components/TrainingIndicators";
import { TrainingGoal } from "@/components/TrainingGoal";
import { MuscleGroupVolume } from "@/components/MuscleGroupVolume";
import { DailySteps } from "@/components/DailySteps";
import { Collapsible, BareSectionContext } from "@/components/Collapsible";
import { BlurLock, LockedCollapsible } from "@/components/BlurLock";
import { LiveWorkout } from "@/components/LiveWorkout";
import { Award, Lock } from "lucide-react";

const DOW = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
const STEPS_COLOR = "#8A9A7C";
const TRAINING_COLOR = "#C9A227";
const SLEEP_COLOR = "#7C93A3";
const VOLUME_COLOR = "#B5533C";
const SLEEP_TARGET_HOURS = 8;

function weekRow(fecha: string, d: DayEntry | null, valueFn: (d: DayEntry) => number) {
  const dow = DOW[new Date(`${fecha}T00:00:00`).getDay()];
  return { dow, value: d ? valueFn(d) : 0 };
}

function WeekBarChart({
  title,
  data,
  color,
  unit,
  referenceValue,
  referenceLabel,
  neonClass,
}: {
  title: string;
  data: { dow: string; value: number }[];
  color: string;
  unit: string;
  referenceValue?: number;
  referenceLabel?: string;
  neonClass?: string;
}) {
  return (
    <Collapsible eyebrow="Semana" title={title}>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ left: -20, right: 0, top: 5, bottom: 0 }}>
          <XAxis dataKey="dow" tick={{ fill: "rgb(var(--color-text-muted))", fontSize: 9, fontFamily: "JetBrains Mono" }} axisLine={{ stroke: "rgb(var(--color-border))" }} tickLine={false} />
          <YAxis tick={{ fill: "rgb(var(--color-text-muted))", fontSize: 9, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: "rgb(var(--color-surface))", border: "1px solid rgb(var(--color-border))", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "rgb(var(--color-text))" }}
            formatter={(value: number) => `${value.toLocaleString("es-AR")} ${unit}`}
            cursor={{ fill: "rgb(var(--color-accent) / 0.10)" }}
          />
          {referenceValue != null && (
            <ReferenceLine
              y={referenceValue}
              stroke={color}
              strokeDasharray="4 4"
              label={{ value: referenceLabel, fill: color, fontSize: 9, position: "right" }}
              className={neonClass}
            />
          )}
          <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} className={neonClass} />
        </BarChart>
      </ResponsiveContainer>
    </Collapsible>
  );
}

const SESSION_STATUS_LABEL: Record<AssignedSession["status"], { text: string; className: string }> = {
  planificada: { text: "Planificada", className: "text-textMuted" },
  movida: { text: "Reprogramada", className: "text-gold" },
  en_curso: { text: "En curso", className: "text-gold" },
  completada: { text: "✓ Completada", className: "text-sage" },
  vencida: { text: "No hecha", className: "text-rust" },
  cancelada: { text: "Cancelada", className: "text-textMuted" },
};

/**
 * Solo lectura -- lo que el Entrenador planificó para la semana ACTUAL
 * (assigned_sessions ya viene filtrado a esa semana desde
 * useMyAssignedSessions), y un aviso si ya armó la que viene. Distinto del
 * "Hoy · Entrenamiento" de arriba, que solo muestra/permite arrancar la
 * sesión de hoy.
 */
function WeekTrainingPlanCard({ weekSessions, nextWeekReady }: { weekSessions: AssignedSession[]; nextWeekReady: boolean }) {
  const sorted = [...weekSessions].sort((a, b) => a.fechaPlanificada.localeCompare(b.fechaPlanificada));
  return (
    <Collapsible eyebrow="Semana" title="Plan de la semana (Entrenador)">
      {nextWeekReady && (
        <div className="mb-2 rounded-lg border border-dashed border-sage/50 bg-sage/5 px-3 py-2 text-center font-mono text-[10px] uppercase tracking-wide text-sage">
          Tu Entrenador ya armó la semana que viene ✓
        </div>
      )}
      {sorted.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-3 text-[12px] text-textMuted">
          Tu Entrenador todavía no publicó nada para esta semana.
        </div>
      ) : (
        <div className="space-y-1.5">
          {sorted.map((s) => {
            const date = new Date(`${s.fechaPlanificada}T00:00:00`);
            const statusInfo = SESSION_STATUS_LABEL[s.status];
            return (
              <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-bg/30 px-2.5 py-1.5">
                <div className="min-w-0">
                  <div className="font-mono text-[9px] uppercase tracking-wide text-textMuted">
                    {DOW[date.getDay()]} {date.getDate()}/{date.getMonth() + 1}
                  </div>
                  <div className="truncate text-[12px] text-text">
                    {s.routineNombre} <span className="text-textMuted">· {s.routineSnapshot.length} ejercicios</span>
                  </div>
                </div>
                <span className={`shrink-0 font-mono text-[9px] uppercase tracking-wide ${statusInfo.className}`}>{statusInfo.text}</span>
              </div>
            );
          })}
        </div>
      )}
    </Collapsible>
  );
}

export function ActividadTab({
  entry,
  weekDates,
  weekDays,
  onLogSteps,
  onLogTraining,
  onLogSleep,
  onUpsert,
  routines,
  schedule,
  onSaveRoutines,
  onSaveSchedule,
  order,
  onReorder,
  hidden,
  onHide,
  workoutSuggestions,
  onSaveWorkoutSuggestions,
  onCreateAndAssignRoutine,
  isApprovedTrainer,
  hasTrainerLink,
  assignedSession,
  onStartAssignedSession,
  onCompleteAssignedSession,
  weekSessions,
  nextWeekReady,
  trainingGoal,
  muscleGroupTrend,
  goalMode,
  basic,
  blurred,
  onUpgrade,
  lockedHint,
}: {
  /** Plan Básico: sin entrenamiento en vivo (basic) y con estos bloques bloqueados (colapsados, desenfocados al abrir). */
  basic?: boolean;
  blurred?: readonly ActividadBlockId[];
  onUpgrade?: () => void;
  /** Texto del candado (según si falta un plan o un Entrenador). */
  lockedHint?: string;
  entry: DayEntry;
  weekDates: string[];
  weekDays: (DayEntry | null)[];
  onLogSteps: () => void;
  onLogTraining: () => void;
  onLogSleep: () => void;
  onUpsert: (entry: DayEntry) => void;
  routines: Routine[];
  schedule: TrainingSchedule;
  onSaveRoutines: (routines: Routine[]) => void;
  onSaveSchedule: (schedule: TrainingSchedule) => void;
  order?: ActividadBlockId[];
  onReorder: (next: ActividadBlockId[]) => void;
  hidden?: ActividadBlockId[];
  onHide: (id: ActividadBlockId) => void;
  workoutSuggestions: Record<string, WorkoutSuggestion>;
  onSaveWorkoutSuggestions: (updates: Record<string, WorkoutSuggestion>) => void;
  onCreateAndAssignRoutine: (routine: Routine, weekday: Weekday) => void;
  /** Mostrar la insignia de "entrenador certificado" arriba de todo -- solo
   * cuando tu postulación (Ajustes > Ser entrenador) está aprobada. */
  isApprovedTrainer?: boolean;
  /** Todo esto es lado ALUMNO -- opcional y sin valor por defecto a
   * propósito: sin vínculo con un profe, cada uno de estos queda undefined
   * y LiveWorkout/RoutineManager se comportan exactamente igual que antes
   * (Autoentrenador). */
  hasTrainerLink?: boolean;
  assignedSession?: AssignedSession | null;
  onStartAssignedSession?: (sessionId: string) => void;
  onCompleteAssignedSession?: (sessionId: string, ejercicios: ExerciseEntry[], duracionMinutos?: number) => Promise<{ ok: boolean; error?: string }>;
  /** Todas las sesiones asignadas de la semana ACTUAL (lunes a domingo de
   * hoy) -- para el resumen de solo lectura "Plan de la semana", distinto
   * de `assignedSession` que es solo la de hoy. */
  weekSessions?: AssignedSession[];
  /** Ya hay un plan de fuerza publicado para la semana que viene -- se
   * avisa acá mismo, sin esperar a que llegue esa semana. */
  nextWeekReady?: boolean;
  /** Objetivo semanal que puso el Entrenador (sesiones + volumen
   * planificado, calculado de las sesiones asignadas de esta semana). */
  trainingGoal?: { sesionesSemana: number; volumenPlanificado: number } | null;
  muscleGroupTrend: Record<MuscleGroup, { actual: number; anterior: number }>;
  goalMode?: GoalMode;
}) {
  const blockOrder = resolveOrder(order, DEFAULT_ACTIVIDAD_ORDER);
  const drag = useSectionOrder(blockOrder, onReorder);
  const trainingGoalPreview = computeTrainingGoal(schedule, weekDays);
  // "resumen" (Hoy) nunca se apaga -- mismo criterio que "hoy" en Inicio.
  // "objetivoEntreno" solo se muestra si ya asignaste al menos un día en tu
  // rutina semanal (sin eso no hay objetivo que calcular).
  const visibleOrder = blockOrder.filter(
    (id) =>
      (id === "resumen" || !(hidden || []).includes(id)) &&
      !(id === "objetivoEntreno" && !trainingGoalPreview) &&
      !(id === "planSemanaFuerza" && !hasTrainerLink)
  );

  const sessions = getTrainingSessions(entry);
  const trainingKcal = estimateTrainingCalories(entry);
  const intensidad = sessions.length === 1 ? sessions[0].intensidad : entry.entreno ? "moderado" : "ninguno";
  const trainingStyle = INTENSITY_STYLES[intensidad];
  const trainingLabel = sessions.length > 1 ? `${sessions.length} entrenamientos` : trainingStyle.label;

  const stepsData = weekDates.map((fecha, i) => weekRow(fecha, weekDays[i], (d) => d.pasos || 0));
  const trainingData = weekDates.map((fecha, i) => weekRow(fecha, weekDays[i], (d) => estimateTrainingCalories(d)));
  const sleepData = weekDates.map((fecha, i) => weekRow(fecha, weekDays[i], (d) => d.suenoHoras || 0));
  const volumeData = weekDates.map((fecha, i) => weekRow(fecha, weekDays[i], (d) => totalVolume(d.ejercicios)));

  const blocks: Record<ActividadBlockId, ReactNode> = {
    resumen: (
      <Collapsible eyebrow="Hoy" title="Entrenamiento" info={SECTION_HELP.actividad} locked scrollable={false}>
        <div className="mb-4 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-textMuted">Pasos</div>
            <div className="font-sans font-bold text-base leading-tight text-text">{(entry.pasos || 0).toLocaleString("es-AR")}</div>
          </div>
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-textMuted">Quemadas entreno</div>
            <div className="font-sans font-bold text-base leading-tight text-text">{trainingKcal.toLocaleString("es-AR")}</div>
          </div>
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-textMuted">Sueño</div>
            <div className="font-sans font-bold text-base leading-tight text-text">{entry.suenoHoras ? `${entry.suenoHoras}h` : "—"}</div>
          </div>
        </div>
        {/* Pasos, entrenamiento y sueño cada uno con su propio botón --
            antes pasos y entrenamiento compartían uno solo que, apenas
            cargabas el entrenamiento, dejaba de mostrar los pasos del todo. */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={onLogSteps}
            className={`rounded-xl border px-2 py-2.5 font-mono text-[9.5px] uppercase tracking-wide ${
              entry.pasos ? "border-sage/60 bg-sage/10 text-sage" : "border-border bg-transparent text-textMuted"
            }`}
          >
            {entry.pasos ? `${entry.pasos.toLocaleString("es-AR")}` : "+ Pasos"}
          </button>
          <button
            type="button"
            onClick={onLogTraining}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-xl border px-2 py-2 font-mono text-[9.5px] uppercase tracking-wide ${
              sessions.length > 0 ? `intensity-${intensidad}` : "bg-sage text-bg border-sage/60"
            }`}
            style={sessions.length > 0 ? { background: trainingStyle.background, color: trainingStyle.color, borderColor: trainingStyle.background } : undefined}
          >
            {sessions.length > 0 ? (
              <>
                <span className="text-[7.5px] tracking-wide opacity-75">Entreno +</span>
                <span className="flex items-center gap-1 text-[10px] font-bold">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" />
                  {trainingLabel}
                </span>
              </>
            ) : (
              "+ Entreno"
            )}
          </button>
          <button
            type="button"
            onClick={onLogSleep}
            className={`rounded-xl border px-2 py-2.5 font-mono text-[9.5px] uppercase tracking-wide ${
              entry.suenoHoras ? "bg-[#7C93A3] text-bg border-[#7C93A3]/60" : "bg-transparent text-textMuted border-border"
            }`}
          >
            {entry.suenoHoras ? `${entry.suenoHoras}h` : "+ Sueño"}
          </button>
        </div>
        {!basic && (
          <LiveWorkout
            entry={entry}
            routines={routines}
            schedule={schedule}
            onFinish={onUpsert}
            onSaveSchedule={onSaveSchedule}
            onCreateAndAssignRoutine={onCreateAndAssignRoutine}
            suggestions={workoutSuggestions}
            onSaveSuggestions={onSaveWorkoutSuggestions}
            assignedSession={assignedSession}
            onStartAssignedSession={onStartAssignedSession}
            onCompleteAssignedSession={onCompleteAssignedSession}
          />
        )}
        {basic && (
          <div className="mt-3">
            <div className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-text">
              <Lock size={14} strokeWidth={1.8} /> Entrenamiento en vivo
            </div>
            <BlurLock active title="Entrenamiento en vivo" onUpgrade={onUpgrade || (() => {})} hint={lockedHint}>
              <LiveWorkout
                entry={entry}
                routines={routines}
                schedule={schedule}
                onFinish={onUpsert}
                onSaveSchedule={onSaveSchedule}
                onCreateAndAssignRoutine={onCreateAndAssignRoutine}
                suggestions={workoutSuggestions}
                onSaveSuggestions={onSaveWorkoutSuggestions}
                assignedSession={assignedSession}
                onStartAssignedSession={onStartAssignedSession}
                onCompleteAssignedSession={onCompleteAssignedSession}
              />
            </BlurLock>
          </div>
        )}
      </Collapsible>
    ),
    planSemanaFuerza: hasTrainerLink ? (
      <WeekTrainingPlanCard weekSessions={weekSessions || []} nextWeekReady={Boolean(nextWeekReady)} />
    ) : null,
    objetivoEntreno: trainingGoalPreview ? <TrainingGoal goal={trainingGoalPreview} openOnDesktop /> : null,
    pasosEditar: <DailySteps weekDates={weekDates} weekDays={weekDays} onUpsert={onUpsert} />,
    // Un solo reporte: indicadores, gráficos de la semana y volumen por grupo muscular, como secciones planas.
    reporte: (
      <Collapsible eyebrow="Semana" title="Reporte de entrenamiento" info={SECTION_HELP.actividad}>
        <BareSectionContext.Provider value={true}>
          <TrainingIndicators routines={routines} workoutSuggestions={workoutSuggestions} />
          <WeekBarChart title="Pasos" data={stepsData} color={STEPS_COLOR} unit="pasos" neonClass="chart-neon-a" />
          <WeekBarChart title="Calorías quemadas entrenando" data={trainingData} color={TRAINING_COLOR} unit="kcal" neonClass="chart-neon-b" />
          <WeekBarChart
            title="Sueño"
            data={sleepData}
            color={SLEEP_COLOR}
            unit="hs"
            referenceValue={SLEEP_TARGET_HOURS}
            referenceLabel={`recomendado ${SLEEP_TARGET_HOURS}h`}
            neonClass="chart-neon-c"
          />
          <WeekBarChart title="Volumen entrenado (series × reps × peso)" data={volumeData} color={VOLUME_COLOR} unit="kg" neonClass="chart-neon-d" />
          <MuscleGroupVolume trend={muscleGroupTrend} modo={goalMode} />
        </BareSectionContext.Provider>
      </Collapsible>
    ),
    rutinas: (
      <RoutineManager
        routines={routines}
        schedule={schedule}
        onSaveRoutines={onSaveRoutines}
        onSaveSchedule={onSaveSchedule}
        hasTrainerLink={hasTrainerLink}
      />
    ),
  };

  return (
    <>
      {isApprovedTrainer && (
        <div className="mb-3 flex items-center gap-1.5 rounded-full border border-gold/50 bg-gold/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide text-gold">
          <Award size={16} strokeWidth={1.8} className="shrink-0" /> Sos entrenador certificado
        </div>
      )}
      {trainingGoal && (
        <div className="mb-3 rounded-xl border border-gold/40 bg-gold/5 p-3">
          <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.15em] text-gold">Objetivo de tu Entrenador</div>
          <div className="text-sm font-semibold text-text">{trainingGoal.sesionesSemana} sesiones esta semana</div>
          <div className="font-mono text-[10px] text-textMuted">~{trainingGoal.volumenPlanificado.toLocaleString("es-AR")}kg de volumen planificado</div>
        </div>
      )}
      <DndContext sensors={drag.sensors} collisionDetection={drag.collisionDetection} onDragStart={drag.handleDragStart} onDragEnd={drag.handleDragEnd} onDragCancel={drag.handleDragCancel}>
      <SortableContext items={visibleOrder} strategy={verticalListSortingStrategy}>
        <div className="min-w-0 space-y-4 lg:columns-2 lg:gap-4 lg:space-y-0 xl:columns-3">
        {visibleOrder.map((blockId) => (
          <SortableSection key={blockId} id={blockId} onHide={blockId === "resumen" ? undefined : () => onHide(blockId)} dragDisabledOnDesktop>
            {blurred?.includes(blockId) && blocks[blockId] ? (
              <LockedCollapsible eyebrow="Entreno" title={ACTIVIDAD_BLOCK_LABELS[blockId]} onUpgrade={onUpgrade || (() => {})} hint={lockedHint}>
                {blocks[blockId]}
              </LockedCollapsible>
            ) : (
              blocks[blockId]
            )}
          </SortableSection>
        ))}
        </div>
      </SortableContext>
    </DndContext>
    </>
  );
}
