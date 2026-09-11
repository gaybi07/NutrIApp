"use client";

import { BarChart, Bar, XAxis, YAxis, ReferenceLine, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts";
import { DayEntry } from "@/lib/types";
import { dayTotal, dayProt, dayCarbs, dayFat, macroTargets } from "@/lib/calculations";
import { SECTION_HELP } from "@/lib/helpText";
import { InfoHint } from "@/components/InfoHint";

const DOW = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
const COLORS = { protein: "#8A9A7C", carbs: "#C9A227", fat: "#7C93A3" };

function MacroStat({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-textMuted">{label}</div>
      <div className="font-display text-base leading-tight text-text">
        {value}g <span className="font-mono text-[10px] text-textMuted">/ {target}g</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full border border-border bg-bg/60">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export function MacrosTab({
  entry,
  goal,
  proteinTarget,
  weekDates,
  weekDays,
  onLogMeal,
}: {
  entry: DayEntry;
  goal: number;
  proteinTarget: number;
  weekDates: string[];
  weekDays: (DayEntry | null)[];
  onLogMeal: () => void;
}) {
  const targets = macroTargets(goal, proteinTarget);
  const consumedKcal = dayTotal(entry);
  const protein = dayProt(entry);
  const carbs = dayCarbs(entry);
  const fat = dayFat(entry);

  const pieData = [
    { name: "Proteína", value: protein * 4, color: COLORS.protein },
    { name: "Carbohidratos", value: carbs * 4, color: COLORS.carbs },
    { name: "Grasas", value: fat * 9, color: COLORS.fat },
  ].filter((slice) => slice.value > 0);

  const weekMacroData = weekDates.map((fecha, i) => {
    const d = weekDays[i];
    const dow = DOW[new Date(`${fecha}T00:00:00`).getDay()];
    if (!d) return { dow, protein: 0, carbs: 0, fat: 0 };
    return { dow, protein: dayProt(d) * 4, carbs: dayCarbs(d) * 4, fat: dayFat(d) * 9 };
  });

  const proteinWeekData = weekDates.map((fecha, i) => {
    const d = weekDays[i];
    const dow = DOW[new Date(`${fecha}T00:00:00`).getDay()];
    return { dow, protein: d ? dayProt(d) : 0 };
  });

  return (
    <div>
      <section className="mb-4 rounded-2xl border border-gold/40 bg-surface p-3">
        <div className="mb-3 flex items-center font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
          Hoy · Macros
          <InfoHint text={SECTION_HELP.macros} label="Qué es la sección Macros" />
        </div>
        <div className="mb-3 grid grid-cols-3 gap-3">
          <MacroStat label="Proteína" value={protein} target={targets.proteinG} color={COLORS.protein} />
          <MacroStat label="Carbohidratos" value={carbs} target={targets.carbsG} color={COLORS.carbs} />
          <MacroStat label="Grasas" value={fat} target={targets.fatG} color={COLORS.fat} />
        </div>
        <div className="mb-3 font-mono text-[11px] text-textMuted">
          {consumedKcal.toLocaleString("es-AR")} de {goal.toLocaleString("es-AR")} kcal hoy
        </div>
        <button
          type="button"
          onClick={onLogMeal}
          className="w-full rounded-xl border border-gold/60 bg-gold px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-bg"
        >
          + Cargar comida
        </button>
      </section>

      <div className="mb-4 rounded-xl border border-border bg-surface p-4">
        <div className="mb-3 font-mono text-[10px] uppercase tracking-wide text-textMuted">Reparto de macros de hoy</div>
        {pieData.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={2} isAnimationActive={false}>
                {pieData.map((slice) => (
                  <Cell key={slice.name} fill={slice.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#242220", border: "1px solid #3A362F", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#EDE7DA" }}
                formatter={(value: number) => `${Math.round(value)} kcal`}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-4 text-center text-[12px] text-textMuted">
            Todavía no cargaste comidas hoy.
          </div>
        )}
        <div className="mt-2 flex flex-wrap justify-center gap-3 font-mono text-[9px] text-textMuted">
          <span className="flex items-center gap-1"><i className="inline-block h-[7px] w-[7px] rounded-full" style={{ background: COLORS.protein }} />Proteína</span>
          <span className="flex items-center gap-1"><i className="inline-block h-[7px] w-[7px] rounded-full" style={{ background: COLORS.carbs }} />Carbohidratos</span>
          <span className="flex items-center gap-1"><i className="inline-block h-[7px] w-[7px] rounded-full" style={{ background: COLORS.fat }} />Grasas</span>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-border bg-surface p-4">
        <div className="mb-3 flex justify-between font-mono text-[10px] uppercase tracking-wide text-textMuted">
          <span>Macros de la semana</span>
          <span>objetivo {goal.toLocaleString("es-AR")} kcal</span>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={weekMacroData} margin={{ left: -20, right: 0, top: 5, bottom: 0 }}>
            <XAxis dataKey="dow" tick={{ fill: "#9C958A", fontSize: 9, fontFamily: "JetBrains Mono" }} axisLine={{ stroke: "#3A362F" }} tickLine={false} />
            <YAxis tick={{ fill: "#9C958A", fontSize: 9, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "#242220", border: "1px solid #3A362F", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#EDE7DA" }} />
            <ReferenceLine y={goal} stroke="#C9A227" strokeDasharray="4 4" label={{ value: `objetivo ${goal}`, fill: "#C9A227", fontSize: 9, position: "right" }} />
            <Bar dataKey="protein" stackId="a" fill={COLORS.protein} />
            <Bar dataKey="carbs" stackId="a" fill={COLORS.carbs} />
            <Bar dataKey="fat" stackId="a" fill={COLORS.fat} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-2 flex flex-wrap gap-3 font-mono text-[9px] text-textMuted">
          <span className="flex items-center gap-1"><i className="inline-block h-[7px] w-[7px] rounded-full" style={{ background: COLORS.protein }} />Proteína</span>
          <span className="flex items-center gap-1"><i className="inline-block h-[7px] w-[7px] rounded-full" style={{ background: COLORS.carbs }} />Carbohidratos</span>
          <span className="flex items-center gap-1"><i className="inline-block h-[7px] w-[7px] rounded-full" style={{ background: COLORS.fat }} />Grasas</span>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-border bg-surface p-4">
        <div className="mb-3 font-mono text-[10px] uppercase tracking-wide text-textMuted">Proteína vs objetivo</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={proteinWeekData} margin={{ left: -20, right: 0, top: 5, bottom: 0 }}>
            <XAxis dataKey="dow" tick={{ fill: "#9C958A", fontSize: 9, fontFamily: "JetBrains Mono" }} axisLine={{ stroke: "#3A362F" }} tickLine={false} />
            <YAxis tick={{ fill: "#9C958A", fontSize: 9, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "#242220", border: "1px solid #3A362F", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#EDE7DA" }} />
            <ReferenceLine y={proteinTarget} stroke="#8A9A7C" strokeDasharray="4 4" label={{ value: `obj. ${proteinTarget}g`, fill: "#8A9A7C", fontSize: 9, position: "right" }} />
            <Bar dataKey="protein" fill={COLORS.protein} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
