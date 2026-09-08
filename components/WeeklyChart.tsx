"use client";

import { BarChart, Bar, XAxis, YAxis, ReferenceLine, ResponsiveContainer, Tooltip } from "recharts";
import { DayEntry } from "@/lib/types";

const DOW = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
const COLORS = { des: "#8A9A7C", alm: "#C9A227", mer: "#7C93A3", cen: "#B5533C" };

export function WeeklyChart({
  weekDates,
  weekDays,
  goal,
  avgGasto,
}: {
  weekDates: string[];
  weekDays: (DayEntry | null)[];
  goal: number;
  avgGasto: number;
}) {
  const data = weekDates.map((fecha, i) => {
    const d = weekDays[i];
    const dow = DOW[new Date(`${fecha}T00:00:00`).getDay()];
    if (!d) return { dow, des: 0, alm: 0, mer: 0, cen: 0, trained: false };
    return { dow, des: d.desK, alm: d.almK, mer: d.merK, cen: d.cenK, trained: d.entreno };
  });

  return (
    <div className="bg-surface border border-border rounded-xl p-4 mb-4">
      <div className="flex justify-between font-mono text-[10px] uppercase tracking-wide text-textMuted mb-3">
        <span>Kcal por día</span>
        <span>
          obj. {goal.toLocaleString("es-AR")} / gasto prom. {avgGasto.toLocaleString("es-AR")}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ left: -20, right: 0, top: 5, bottom: 0 }}>
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
          />
          <Tooltip
            contentStyle={{ background: "#242220", border: "1px solid #3A362F", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#EDE7DA" }}
          />
          <ReferenceLine y={goal} stroke="#C9A227" strokeDasharray="4 4" label={{ value: `${goal}`, fill: "#C9A227", fontSize: 9, position: "right" }} />
          <ReferenceLine y={avgGasto} stroke="#8A9A7C" strokeDasharray="4 4" label={{ value: `gasto ${avgGasto}`, fill: "#8A9A7C", fontSize: 9, position: "left" }} />
          <Bar dataKey="des" stackId="a" fill={COLORS.des} />
          <Bar dataKey="alm" stackId="a" fill={COLORS.alm} />
          <Bar dataKey="mer" stackId="a" fill={COLORS.mer} />
          <Bar dataKey="cen" stackId="a" fill={COLORS.cen} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-3 flex-wrap mt-2 font-mono text-[9px] text-textMuted">
        <span className="flex items-center gap-1"><i className="w-[7px] h-[7px] rounded-full inline-block" style={{ background: COLORS.des }} />Desayuno</span>
        <span className="flex items-center gap-1"><i className="w-[7px] h-[7px] rounded-full inline-block" style={{ background: COLORS.alm }} />Almuerzo</span>
        <span className="flex items-center gap-1"><i className="w-[7px] h-[7px] rounded-full inline-block" style={{ background: COLORS.mer }} />Merienda</span>
        <span className="flex items-center gap-1"><i className="w-[7px] h-[7px] rounded-full inline-block" style={{ background: COLORS.cen }} />Cena</span>
      </div>
    </div>
  );
}
