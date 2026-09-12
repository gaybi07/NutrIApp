"use client";

import { ComposedChart, Bar, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { DayEntry } from "@/lib/types";
import { dayGoal, estimateGasto } from "@/lib/calculations";

const DOW = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
const COLORS = { des: "#8A9A7C", alm: "#C9A227", mer: "#7C93A3", cen: "#B5533C" };

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
  const data = weekDates.map((fecha, i) => {
    const d = weekDays[i];
    const dow = DOW[new Date(`${fecha}T00:00:00`).getDay()];
    if (!d) return { dow, des: 0, alm: 0, mer: 0, cen: 0, trained: false, goal: goal, gasto: avgGasto };
    return {
      dow,
      des: d.desK,
      alm: d.almK,
      mer: d.merK,
      cen: d.cenK,
      trained: d.entreno,
      goal: dayGoal(d, goal, avgGasto),
      gasto: estimateGasto(d, avgGasto),
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
            tick={{ fill: "#9C958A", fontSize: 9, fontFamily: "JetBrains Mono" }}
            axisLine={{ stroke: "#3A362F" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#9C958A", fontSize: 9, fontFamily: "JetBrains Mono" }}
            axisLine={false}
            tickLine={false}
            domain={yDomain}
          />
          <Tooltip
            contentStyle={{ background: "#242220", border: "1px solid #3A362F", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#EDE7DA" }}
            cursor={{ fill: "rgba(201,162,39,0.10)" }}
          />
          <Bar dataKey="des" stackId="a" fill={COLORS.des} />
          <Bar dataKey="alm" stackId="a" fill={COLORS.alm} />
          <Bar dataKey="mer" stackId="a" fill={COLORS.mer} />
          <Bar dataKey="cen" stackId="a" fill={COLORS.cen} radius={[3, 3, 0, 0]} />
          <Line type="monotone" dataKey="goal" name="Objetivo diario" stroke="#EDE7DA" strokeWidth={2} dot={{ r: 2.5, fill: "#EDE7DA" }} strokeDasharray="4 3" />
          <Line type="monotone" dataKey="gasto" name="Gasto" stroke="#5FA8D3" strokeWidth={2} dot={{ r: 2.5, fill: "#5FA8D3" }} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex gap-3 flex-wrap mt-2 font-mono text-[9px] text-textMuted">
        <span className="flex items-center gap-1"><i className="w-[7px] h-[7px] rounded-full inline-block" style={{ background: COLORS.des }} />Desayuno</span>
        <span className="flex items-center gap-1"><i className="w-[7px] h-[7px] rounded-full inline-block" style={{ background: COLORS.alm }} />Almuerzo</span>
        <span className="flex items-center gap-1"><i className="w-[7px] h-[7px] rounded-full inline-block" style={{ background: COLORS.mer }} />Merienda</span>
        <span className="flex items-center gap-1"><i className="w-[7px] h-[7px] rounded-full inline-block" style={{ background: COLORS.cen }} />Cena</span>
        <span className="flex items-center gap-1"><i className="w-[10px] h-[2px] inline-block" style={{ background: "#EDE7DA" }} />Objetivo diario</span>
        <span className="flex items-center gap-1"><i className="w-[10px] h-[2px] inline-block" style={{ background: "#5FA8D3" }} />Gasto</span>
      </div>
    </div>
  );
}
