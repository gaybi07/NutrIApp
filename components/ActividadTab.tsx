"use client";

import { BarChart, Bar, XAxis, YAxis, ReferenceLine, ResponsiveContainer, Tooltip } from "recharts";
import { DayEntry, INTENSITY_STYLES } from "@/lib/types";
import { estimateTrainingCalories, getTrainingSessions } from "@/lib/calculations";
import { SECTION_HELP } from "@/lib/helpText";
import { InfoHint } from "@/components/InfoHint";

const DOW = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
const STEPS_COLOR = "#8A9A7C";
const TRAINING_COLOR = "#C9A227";
const SLEEP_COLOR = "#7C93A3";
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
}: {
  title: string;
  data: { dow: string; value: number }[];
  color: string;
  unit: string;
  referenceValue?: number;
  referenceLabel?: string;
}) {
  return (
    <div className="mb-4 rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 font-mono text-[10px] uppercase tracking-wide text-textMuted">{title}</div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ left: -20, right: 0, top: 5, bottom: 0 }}>
          <XAxis dataKey="dow" tick={{ fill: "#9C958A", fontSize: 9, fontFamily: "JetBrains Mono" }} axisLine={{ stroke: "#3A362F" }} tickLine={false} />
          <YAxis tick={{ fill: "#9C958A", fontSize: 9, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: "#242220", border: "1px solid #3A362F", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#EDE7DA" }}
            formatter={(value: number) => `${value.toLocaleString("es-AR")} ${unit}`}
          />
          {referenceValue != null && (
            <ReferenceLine
              y={referenceValue}
              stroke={color}
              strokeDasharray="4 4"
              label={{ value: referenceLabel, fill: color, fontSize: 9, position: "right" }}
            />
          )}
          <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} />
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
}: {
  entry: DayEntry;
  weekDates: string[];
  weekDays: (DayEntry | null)[];
  onLogTraining: () => void;
}) {
  const sessions = getTrainingSessions(entry);
  const trainingKcal = estimateTrainingCalories(entry);
  const intensidad = sessions.length === 1 ? sessions[0].intensidad : entry.entreno ? "moderado" : "ninguno";
  const trainingStyle = INTENSITY_STYLES[intensidad];
  const trainingLabel = sessions.length > 1 ? `${sessions.length} entrenamientos` : trainingStyle.label;

  const stepsData = weekDates.map((fecha, i) => weekRow(fecha, weekDays[i], (d) => d.pasos || 0));
  const trainingData = weekDates.map((fecha, i) => weekRow(fecha, weekDays[i], (d) => estimateTrainingCalories(d)));
  const sleepData = weekDates.map((fecha, i) => weekRow(fecha, weekDays[i], (d) => d.suenoHoras || 0));

  return (
    <div>
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
        <button
          type="button"
          onClick={onLogTraining}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em]"
          style={
            sessions.length > 0
              ? { background: trainingStyle.background, color: trainingStyle.color, borderColor: trainingStyle.background }
              : { background: "#8A9A7C", color: "#1C1B18", borderColor: "rgba(138,154,124,0.6)" }
          }
        >
          {sessions.length > 0 && <span className="h-2 w-2 rounded-full bg-current opacity-70" />}
          {sessions.length > 0 ? trainingLabel : "+ Pasos, sueño y entrenamiento"}
        </button>
      </section>

      <WeekBarChart title="Pasos de la semana" data={stepsData} color={STEPS_COLOR} unit="pasos" />
      <WeekBarChart title="Calorías quemadas entrenando" data={trainingData} color={TRAINING_COLOR} unit="kcal" />
      <WeekBarChart
        title="Sueño de la semana"
        data={sleepData}
        color={SLEEP_COLOR}
        unit="hs"
        referenceValue={SLEEP_TARGET_HOURS}
        referenceLabel={`recomendado ${SLEEP_TARGET_HOURS}h`}
      />
    </div>
  );
}
