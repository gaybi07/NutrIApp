"use client";

import { ReactNode } from "react";
import { DndContext } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { BarChart, Bar, XAxis, YAxis, ReferenceLine, ResponsiveContainer, Tooltip } from "recharts";
import { DayEntry, INTENSITY_STYLES, Routine, TrainingSchedule, ActividadBlockId, DEFAULT_ACTIVIDAD_ORDER, resolveOrder } from "@/lib/types";
import { estimateTrainingCalories, getTrainingSessions, totalVolume } from "@/lib/calculations";
import { useSectionOrder } from "@/lib/useSectionOrder";
import { SortableSection } from "@/components/SortableSection";
import { SECTION_HELP } from "@/lib/helpText";
import { InfoHint } from "@/components/InfoHint";
import { ExerciseLogCard } from "@/components/ExerciseLogCard";
import { RoutineManager } from "@/components/RoutineManager";
import { DailySteps } from "@/components/DailySteps";

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
    <div className="mb-4 rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 font-mono text-[10px] uppercase tracking-wide text-textMuted">{title}</div>
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
    </div>
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
}) {
  const blockOrder = resolveOrder(order, DEFAULT_ACTIVIDAD_ORDER);
  const drag = useSectionOrder(blockOrder, onReorder);

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
      <section className="mb-4 rounded-2xl border border-gold/40 bg-surface p-3">
        <div className="mb-3 flex items-center font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
          Hoy · Actividad
          <InfoHint text={SECTION_HELP.actividad} label="Qué es la sección Actividad" />
        </div>
        <div className="mb-4 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-textMuted">Pasos</div>
            <div className="font-display text-base leading-tight text-text">{(entry.pasos || 0).toLocaleString("es-AR")}</div>
          </div>
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-textMuted">Quemadas entreno</div>
            <div className="font-display text-base leading-tight text-text">{trainingKcal.toLocaleString("es-AR")}</div>
          </div>
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-textMuted">Sueño</div>
            <div className="font-display text-base leading-tight text-text">{entry.suenoHoras ? `${entry.suenoHoras}h` : "—"}</div>
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
      </section>
    ),
    ejercicios: <ExerciseLogCard entry={entry} routines={routines} schedule={schedule} onSave={onUpsert} />,
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
    rutinas: <RoutineManager routines={routines} schedule={schedule} onSaveRoutines={onSaveRoutines} onSaveSchedule={onSaveSchedule} />,
  };

  return (
    <DndContext sensors={drag.sensors} collisionDetection={drag.collisionDetection} onDragEnd={drag.handleDragEnd}>
      <SortableContext items={blockOrder} strategy={verticalListSortingStrategy}>
        {blockOrder.map((blockId) => (
          <SortableSection key={blockId} id={blockId}>
            {blocks[blockId]}
          </SortableSection>
        ))}
      </SortableContext>
    </DndContext>
  );
}
