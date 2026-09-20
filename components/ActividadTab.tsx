"use client";

import { ReactNode } from "react";
import { DndContext } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { BarChart, Bar, XAxis, YAxis, ReferenceLine, ResponsiveContainer, Tooltip } from "recharts";
import { DayEntry, INTENSITY_STYLES, Routine, TrainingSchedule, Weekday, ActividadBlockId, DEFAULT_ACTIVIDAD_ORDER, resolveOrder, WorkoutSuggestion, MuscleGroup, GoalMode } from "@/lib/types";
import { estimateTrainingCalories, getTrainingSessions, totalVolume, computeTrainingGoal } from "@/lib/calculations";
import { useSectionOrder } from "@/lib/useSectionOrder";
import { SortableSection } from "@/components/SortableSection";
import { SECTION_HELP } from "@/lib/helpText";
import { RoutineManager } from "@/components/RoutineManager";
import { TrainingIndicators } from "@/components/TrainingIndicators";
import { TrainingGoal } from "@/components/TrainingGoal";
import { MuscleGroupVolume } from "@/components/MuscleGroupVolume";
import { DailySteps } from "@/components/DailySteps";
import { Collapsible } from "@/components/Collapsible";
import { LiveWorkout } from "@/components/LiveWorkout";

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

export function ActividadTab({
  entry,
  weekDates,
  weekDays,
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
  muscleGroupTrend,
  goalMode,
}: {
  entry: DayEntry;
  weekDates: string[];
  weekDays: (DayEntry | null)[];
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
    (id) => (id === "resumen" || !(hidden || []).includes(id)) && !(id === "objetivoEntreno" && !trainingGoalPreview)
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
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onLogTraining}
            className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] ${
              sessions.length > 0 ? `intensity-${intensidad}` : "bg-sage text-bg border-sage/60"
            }`}
            style={sessions.length > 0 ? { background: trainingStyle.background, color: trainingStyle.color, borderColor: trainingStyle.background } : undefined}
          >
            {sessions.length > 0 && <span className="h-2 w-2 rounded-full bg-current opacity-70" />}
            {sessions.length > 0 ? trainingLabel : "+ Pasos y entrenamiento"}
          </button>
          <button
            type="button"
            onClick={onLogSleep}
            className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] ${
              entry.suenoHoras ? "bg-[#7C93A3] text-bg border-[#7C93A3]/60" : "bg-transparent text-textMuted border-border"
            }`}
          >
            {entry.suenoHoras ? `${entry.suenoHoras}h dormidas` : "+ Sueño"}
          </button>
        </div>
        <LiveWorkout
          entry={entry}
          routines={routines}
          schedule={schedule}
          onFinish={onUpsert}
          onSaveSchedule={onSaveSchedule}
          onCreateAndAssignRoutine={onCreateAndAssignRoutine}
          suggestions={workoutSuggestions}
          onSaveSuggestions={onSaveWorkoutSuggestions}
        />
      </Collapsible>
    ),
    objetivoEntreno: trainingGoalPreview ? <TrainingGoal goal={trainingGoalPreview} openOnDesktop /> : null,
    indicadoresEntreno: <TrainingIndicators routines={routines} workoutSuggestions={workoutSuggestions} />,
    pasosEditar: <DailySteps weekDates={weekDates} weekDays={weekDays} onUpsert={onUpsert} />,
    pasosChart: <WeekBarChart title="Pasos de la semana" data={stepsData} color={STEPS_COLOR} unit="pasos" neonClass="chart-neon-a" />,
    entrenoChart: <WeekBarChart title="Calorías quemadas entrenando" data={trainingData} color={TRAINING_COLOR} unit="kcal" neonClass="chart-neon-b" />,
    suenoChart: (
      <WeekBarChart
        title="Sueño de la semana"
        data={sleepData}
        color={SLEEP_COLOR}
        unit="hs"
        referenceValue={SLEEP_TARGET_HOURS}
        referenceLabel={`recomendado ${SLEEP_TARGET_HOURS}h`}
        neonClass="chart-neon-c"
      />
    ),
    volumenChart: <WeekBarChart title="Volumen entrenado (series × reps × peso)" data={volumeData} color={VOLUME_COLOR} unit="kg" neonClass="chart-neon-d" />,
    volumenGrupos: <MuscleGroupVolume trend={muscleGroupTrend} modo={goalMode} openOnDesktop />,
    rutinas: <RoutineManager routines={routines} schedule={schedule} onSaveRoutines={onSaveRoutines} onSaveSchedule={onSaveSchedule} />,
  };

  return (
    <>
      {isApprovedTrainer && (
        <div className="mb-3 flex items-center gap-1.5 rounded-full border border-gold/50 bg-gold/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide text-gold">
          🏅 Sos entrenador certificado
        </div>
      )}
      <DndContext sensors={drag.sensors} collisionDetection={drag.collisionDetection} onDragStart={drag.handleDragStart} onDragEnd={drag.handleDragEnd} onDragCancel={drag.handleDragCancel}>
      <SortableContext items={visibleOrder} strategy={verticalListSortingStrategy}>
        <div className="min-w-0 space-y-4 lg:columns-2 lg:gap-4 lg:space-y-0 xl:columns-3">
        {visibleOrder.map((blockId) => (
          <SortableSection key={blockId} id={blockId} onHide={blockId === "resumen" ? undefined : () => onHide(blockId)} dragDisabledOnDesktop>
            {blocks[blockId]}
          </SortableSection>
        ))}
        </div>
      </SortableContext>
    </DndContext>
    </>
  );
}
