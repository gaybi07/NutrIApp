"use client";

import { ComposedChart, Bar, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { DayEntry, TrainingSession, INTENSITY_STYLES } from "@/lib/types";
import { dayGoal, estimateGasto, dayDeficit, getTrainingSessions } from "@/lib/calculations";

const DOW = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
const COLORS = { des: "#8A9A7C", alm: "rgb(var(--color-accent))", mer: "#C9A227", cen: "#B5533C" };

type ChartRow = {
  dow: string;
  des: number;
  alm: number;
  mer: number;
  cen: number;
  pasos: number;
  sessions: TrainingSession[];
  goal: number;
  gasto: number;
  deficit: number;
};

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name?: string; value?: number; color?: string; dataKey?: string; payload: ChartRow }[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  const deficitPositive = row.deficit >= 0;

  return (
    <div style={{ background: "rgb(var(--color-surface))", border: "1px solid rgb(var(--color-border))", borderRadius: 8, padding: "8px 10px", minWidth: 150 }}>
      <div style={{ color: "rgb(var(--color-text))", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} style={{ color: entry.color, fontSize: 12 }}>
          {entry.name}: {Math.round(entry.value || 0).toLocaleString("es-AR")}
        </div>
      ))}
      <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px dashed rgb(var(--color-border))", fontSize: 11, color: "rgb(var(--color-text-muted))", display: "flex", flexDirection: "column", gap: 2 }}>
        <div>Pasos: {row.pasos.toLocaleString("es-AR")}</div>
        <div>
          {row.sessions.length === 0
            ? "No entrenó"
            : row.sessions.map((s) => `${INTENSITY_STYLES[s.intensidad].label} · ${s.minutos} min`).join(" + ")}
        </div>
        <div style={{ color: deficitPositive ? "rgb(var(--color-sage))" : "rgb(var(--color-rust))" }}>
          {deficitPositive ? "Déficit" : "Superávit"}: {deficitPositive ? "" : "-"}
          {Math.abs(row.deficit).toLocaleString("es-AR")} kcal
        </div>
      </div>
    </div>
  );
}

export function WeeklyChart({
  weekDates,
  weekDays,
  goal,
  avgGoal,
  avgGasto,
}: {
  weekDates: string[];
  weekDays: (DayEntry | null)[];
  goal: number;
  avgGoal: number;
  avgGasto: number;
}) {
  const data: ChartRow[] = weekDates.map((fecha, i) => {
    const d = weekDays[i];
    const dow = DOW[new Date(`${fecha}T00:00:00`).getDay()];
    if (!d) return { dow, des: 0, alm: 0, mer: 0, cen: 0, pasos: 0, sessions: [], goal, gasto: avgGasto, deficit: 0 };
    return {
      dow,
      des: d.desK,
      alm: d.almK,
      mer: d.merK,
      cen: d.cenK,
      pasos: d.pasos || 0,
      sessions: getTrainingSessions(d),
      goal: dayGoal(d, goal, avgGasto),
      gasto: estimateGasto(d, avgGasto),
      deficit: dayDeficit(d, avgGasto),
    };
  });

  // El dominio del eje Y no lo calcula solo Recharts cuando hay barras
  // apiladas + líneas sueltas — si no se fija a mano, la línea de objetivo
  // o gasto puede quedar recortada por arriba cuando supera el total de kcal
  // del día (ej. con mucha actividad, el objetivo ajustado sube por encima
  // de lo que efectivamente se comió).
  const maxValue = Math.max(
    ...data.map((row) => Math.max(row.des + row.alm + row.mer + row.cen, row.goal, row.gasto))
  );
  const yDomain: [number, number] = [0, Math.ceil((maxValue * 1.1) / 100) * 100];

  return (
    <div className="bg-surface border border-border rounded-xl p-4 mb-4">
      <div className="flex justify-between font-mono text-[10px] uppercase tracking-wide text-textMuted mb-3">
        <span>Kcal por día</span>
        <span>
          base {goal.toLocaleString("es-AR")} / objetivo prom. {avgGoal.toLocaleString("es-AR")}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <ComposedChart data={data} margin={{ left: -20, right: 0, top: 5, bottom: 0 }}>
          <XAxis
            dataKey="dow"
            tick={{ fill: "rgb(var(--color-text-muted))", fontSize: 9, fontFamily: "JetBrains Mono" }}
            axisLine={{ stroke: "rgb(var(--color-border))" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "rgb(var(--color-text-muted))", fontSize: 9, fontFamily: "JetBrains Mono" }}
            axisLine={false}
            tickLine={false}
            domain={yDomain}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgb(var(--color-accent) / 0.10)" }} />
          <Bar dataKey="des" name="Desayuno" stackId="a" fill={COLORS.des} className="chart-des" />
          <Bar dataKey="alm" name="Almuerzo" stackId="a" fill={COLORS.alm} />
          <Bar dataKey="mer" name="Merienda" stackId="a" fill={COLORS.mer} className="chart-mer" />
          <Bar dataKey="cen" name="Cena" stackId="a" fill={COLORS.cen} radius={[3, 3, 0, 0]} className="chart-cen" />
          <Line type="monotone" dataKey="goal" name="Objetivo diario" stroke="rgb(var(--color-text))" strokeWidth={2} dot={{ r: 2.5, fill: "rgb(var(--color-text))" }} strokeDasharray="4 3" />
          <Line type="monotone" dataKey="gasto" name="Gasto" stroke="#5FA8D3" strokeWidth={2} dot={{ r: 2.5, fill: "#5FA8D3" }} className="chart-gasto" />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex gap-3 flex-wrap mt-2 font-mono text-[9px] text-textMuted">
        <span className="flex items-center gap-1"><i className="chart-des w-[7px] h-[7px] rounded-full inline-block" style={{ background: COLORS.des }} />Desayuno</span>
        <span className="flex items-center gap-1"><i className="w-[7px] h-[7px] rounded-full inline-block" style={{ background: COLORS.alm }} />Almuerzo</span>
        <span className="flex items-center gap-1"><i className="chart-mer w-[7px] h-[7px] rounded-full inline-block" style={{ background: COLORS.mer }} />Merienda</span>
        <span className="flex items-center gap-1"><i className="chart-cen w-[7px] h-[7px] rounded-full inline-block" style={{ background: COLORS.cen }} />Cena</span>
        <span className="flex items-center gap-1"><i className="w-[10px] h-[2px] inline-block" style={{ background: "rgb(var(--color-text))" }} />Objetivo diario</span>
        <span className="flex items-center gap-1"><i className="chart-gasto w-[10px] h-[2px] inline-block" style={{ background: "#5FA8D3" }} />Gasto</span>
      </div>
    </div>
  );
}
