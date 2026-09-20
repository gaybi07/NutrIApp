"use client";

import { ReactNode } from "react";
import { DndContext } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { BarChart, Bar, XAxis, YAxis, ReferenceLine, ResponsiveContainer, Tooltip } from "recharts";
import { DayEntry, MacrosBlockId, DEFAULT_MACROS_ORDER, resolveOrder, GoalMode } from "@/lib/types";
import { dayTotal, dayProt, dayCarbs, dayFat, dayFiber, dayCaloricDensity, macroTargets, FoodTrainingInsight } from "@/lib/calculations";
import { FoodTrainingInsights } from "@/components/FoodTrainingInsights";
import { classifyIngredient, FOOD_GROUP_LABELS, FoodGroup } from "@/lib/foodGroups";
import { useSectionOrder } from "@/lib/useSectionOrder";
import { SortableSection } from "@/components/SortableSection";
import { SECTION_HELP } from "@/lib/helpText";
import { RankingCard } from "@/components/RankingCard";
import { Ledger } from "@/components/Ledger";
import { Collapsible } from "@/components/Collapsible";

const DOW = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
// Colores fijos de macros de la guía de diseño — iguales en Claro y Oscuro
// (no usan tokens de tema) para que Proteína/Carbohidratos/Grasas/Fibra se
// reconozcan siempre por el mismo color en cualquier gráfico de la app.
// Carbohidratos usa la variable --color-carbs en vez de un hex fijo porque
// en Neón necesita seguir siendo el verde de acento (como toda la vida),
// no el ámbar nuevo de Oscuro/Claro — ver globals.css.
const COLORS = { protein: "#3B82F6", carbs: "rgb(var(--color-carbs))", fat: "#8B5CF6", fiber: "#EC4899" };
const FOOD_GROUPS_ORDER: FoodGroup[] = ["proteina_animal", "proteina_vegetal", "verdura", "fruta", "lacteo", "cereal", "grasa"];

/** Por qué el reparto de carbos/grasas de abajo cambia según el modo -- ver
 * el comentario de `macroTargets()` en lib/calculations.ts para el detalle
 * de los porcentajes. */
const MACRO_FOCUS_MESSAGE: Record<GoalMode, string> = {
  perder: "Estás en déficit: priorizamos proteína alta para cuidar el músculo, con más carbohidratos que grasas para sostener el rendimiento.",
  recomponer: "En mantenimiento: reparto parejo entre carbohidratos y grasas.",
  aumentar: "En volumen: más carbohidratos — son el combustible principal para entrenar fuerte.",
};

/** Un gráfico chico (110px) de barras por día de la semana, con línea de
 * objetivo opcional -- usado varias veces seguidas dentro de "Reporte
 * semanal" para que cada macro tenga su propio vistazo corto, en vez de
 * un solo gráfico apilado gigante o varias tarjetas sueltas para abrir
 * una por una. */
function MiniWeekChart({
  title,
  data,
  color,
  unit,
  referenceValue,
  neonClass,
}: {
  title: string;
  data: { dow: string; value: number }[];
  color: string;
  unit: string;
  referenceValue?: number;
  neonClass?: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="font-mono text-[10px] uppercase tracking-wide text-textMuted">{title}</div>
        {referenceValue != null && (
          <span className="font-mono text-[9px] uppercase tracking-wide text-textMuted">
            obj. {referenceValue.toLocaleString("es-AR")}
            {unit}
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={110}>
        <BarChart data={data} margin={{ left: -20, right: 0, top: 5, bottom: 0 }}>
          <XAxis dataKey="dow" tick={{ fill: "rgb(var(--color-text-muted))", fontSize: 8.5, fontFamily: "JetBrains Mono" }} axisLine={{ stroke: "rgb(var(--color-border))" }} tickLine={false} />
          <YAxis tick={{ fill: "rgb(var(--color-text-muted))", fontSize: 8.5, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} width={28} />
          <Tooltip
            contentStyle={{ background: "rgb(var(--color-surface))", border: "1px solid rgb(var(--color-border))", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "rgb(var(--color-text))" }}
            formatter={(value: number) => `${value.toLocaleString("es-AR")}${unit}`}
            cursor={{ fill: "rgb(var(--color-accent) / 0.10)" }}
          />
          {referenceValue != null && <ReferenceLine y={referenceValue} stroke={color} strokeDasharray="4 4" />}
          <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} className={neonClass} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MacroStat({ label, value, target, color, neonClass }: { label: string; value: number; target: number; color: string; neonClass?: string }) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-textMuted">{label}</div>
      <div className="font-sans font-bold text-base leading-tight text-text">
        {value}g <span className="font-sans text-[10px] text-textMuted">/ {target}g</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full border border-border bg-bg/60">
        <div className={`h-full rounded-full transition-all ${neonClass || ""}`} style={{ width: `${pct}%`, background: color }} />
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
  weightKg,
  tdeeFallback,
  onUpsert,
  order,
  onReorder,
  hidden,
  onHide,
  foodTrainingInsight,
  goalMode,
}: {
  entry: DayEntry;
  goal: number;
  proteinTarget: number;
  weekDates: string[];
  weekDays: (DayEntry | null)[];
  onLogMeal: () => void;
  weightKg: number;
  tdeeFallback: number;
  onUpsert: (entry: DayEntry) => void;
  order?: MacrosBlockId[];
  onReorder: (next: MacrosBlockId[]) => void;
  hidden?: MacrosBlockId[];
  onHide: (id: MacrosBlockId) => void;
  foodTrainingInsight: FoodTrainingInsight;
  goalMode?: GoalMode;
}) {
  const blockOrder = resolveOrder(order, DEFAULT_MACROS_ORDER);
  const drag = useSectionOrder(blockOrder, onReorder);
  const visibleOrder = blockOrder.filter((id) => !(hidden || []).includes(id));
  const targets = macroTargets(goal, proteinTarget, goalMode);
  const consumedKcal = dayTotal(entry);
  const protein = dayProt(entry);
  const carbs = dayCarbs(entry);
  const fat = dayFat(entry);
  const fiber = dayFiber(entry);

  const kcalWeekData = weekDates.map((fecha, i) => {
    const d = weekDays[i];
    const dow = DOW[new Date(`${fecha}T00:00:00`).getDay()];
    return { dow, value: d ? dayTotal(d) : 0 };
  });

  const proteinWeekData = weekDates.map((fecha, i) => {
    const d = weekDays[i];
    const dow = DOW[new Date(`${fecha}T00:00:00`).getDay()];
    return { dow, value: d ? dayProt(d) : 0 };
  });

  const carbsWeekData = weekDates.map((fecha, i) => {
    const d = weekDays[i];
    const dow = DOW[new Date(`${fecha}T00:00:00`).getDay()];
    return { dow, value: d ? dayCarbs(d) : 0 };
  });

  const fatWeekData = weekDates.map((fecha, i) => {
    const d = weekDays[i];
    const dow = DOW[new Date(`${fecha}T00:00:00`).getDay()];
    return { dow, value: d ? dayFat(d) : 0 };
  });

  const fiberWeekData = weekDates.map((fecha, i) => {
    const d = weekDays[i];
    const dow = DOW[new Date(`${fecha}T00:00:00`).getDay()];
    return { dow, value: d ? dayFiber(d) : 0 };
  });

  // Densidad calórica (kcal/g) -- señal de qué tan concentrados en calorías
  // vienen los alimentos elegidos, no solo cuánto se comió. Solo cuenta
  // días con al menos un alimento con gramos cargados (ver
  // dayCaloricDensity); el resto queda en 0.
  const densityWeekData = weekDates.map((fecha, i) => {
    const d = weekDays[i];
    const dow = DOW[new Date(`${fecha}T00:00:00`).getDay()];
    const density = d ? dayCaloricDensity(d) : null;
    return { dow, value: density != null ? Math.round(density * 10) / 10 : 0 };
  });

  const diversity = FOOD_GROUPS_ORDER.reduce((acc, group) => {
    acc[group] = new Set<string>();
    return acc;
  }, {} as Record<FoodGroup, Set<string>>);
  for (const d of weekDays) {
    if (!d?.alimentos) continue;
    for (const alimento of d.alimentos) {
      const group = classifyIngredient(alimento);
      if (group === "otro") continue;
      diversity[group].add(alimento.toLowerCase());
    }
  }

  const resumenBlock = (
      <Collapsible eyebrow="Hoy" title="Macros" info={SECTION_HELP.macros} defaultOpen>
        {goalMode && (
          <div className="mb-3 rounded-lg border border-border bg-bg/40 px-2.5 py-2 text-[11px] text-textMuted">
            {MACRO_FOCUS_MESSAGE[goalMode]}
          </div>
        )}
        <div className="mb-3 grid grid-cols-2 gap-3">
          <MacroStat label="Proteína" value={protein} target={targets.proteinG} color={COLORS.protein} neonClass="chart-neon-a" />
          <MacroStat label="Carbohidratos" value={carbs} target={targets.carbsG} color={COLORS.carbs} />
          <MacroStat label="Grasas" value={fat} target={targets.fatG} color={COLORS.fat} neonClass="chart-neon-c" />
          <MacroStat label="Fibra" value={fiber} target={targets.fiberG} color={COLORS.fiber} neonClass="chart-neon-d" />
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
      </Collapsible>
  );

  // RankingCard dice "Semana" en su eyebrow -- tiene que rankear los días
  // de la semana seleccionada (weekDays), no el historial completo (days)
  // como pasaba antes, que hacía que cambiar de semana con el selector no
  // tuviera ningún efecto visible en esta tarjeta.
  const weekDaysPresent = weekDays.filter((d): d is DayEntry => d !== null);
  const rankingBlock = <RankingCard days={weekDaysPresent} weightKg={weightKg} />;

  // Un gráfico corto por macro (kcal, proteína, carbohidratos, grasas,
  // fibra) más uno de densidad calórica -- todos juntos en un solo reporte
  // en vez de tarjetas sueltas para abrir una por una. Los objetivos de
  // carbos/grasas/fibra ya salen de macroTargets(), que varía según el
  // modo (déficit/recomposición/volumen) -- ver ese comentario para el
  // detalle. Por ahora el foco está puesto en déficit (menos grasas, llegar
  // a la proteína objetivo); los demás modos se van a revisar más adelante.
  const reporteSemanalBlock = (
    <Collapsible eyebrow="Semana" title="Reporte semanal" info={SECTION_HELP.semana}>
      <div className="space-y-3">
        <MiniWeekChart title="Kcal por día" data={kcalWeekData} color="#f5f1e8" unit=" kcal" referenceValue={goal} />
        <div className="border-t border-dashed border-border" />
        <MiniWeekChart title="Proteína" data={proteinWeekData} color={COLORS.protein} unit="g" referenceValue={proteinTarget} neonClass="chart-neon-a" />
        <div className="border-t border-dashed border-border" />
        <MiniWeekChart title="Carbohidratos" data={carbsWeekData} color={COLORS.carbs} unit="g" referenceValue={targets.carbsG} />
        <div className="border-t border-dashed border-border" />
        <MiniWeekChart title="Grasas" data={fatWeekData} color={COLORS.fat} unit="g" referenceValue={targets.fatG} neonClass="chart-neon-c" />
        <div className="border-t border-dashed border-border" />
        <MiniWeekChart title="Fibra" data={fiberWeekData} color={COLORS.fiber} unit="g" referenceValue={targets.fiberG} neonClass="chart-neon-d" />
        <div className="border-t border-dashed border-border" />
        <div>
          <MiniWeekChart title="Densidad calórica" data={densityWeekData} color="#8A9A7C" unit=" kcal/g" />
          <div className="mt-1.5 text-[10px] text-textMuted">
            Más alto = comida más concentrada en calorías (frituras, ultraprocesados). Más bajo = alimentos con más agua/fibra
            (verduras, frutas, proteínas magras). En 0 los días sin gramos cargados todavía.
          </div>
        </div>
      </div>
    </Collapsible>
  );

  const diversidadBlock = (
      <Collapsible eyebrow="Semana" title="Diversidad">
        <div className="mb-3 text-[11px] text-textMuted">Cuántos alimentos distintos comiste de cada grupo — variar suma, no solo repetir lo mismo.</div>
        <div className="space-y-2.5">
          {FOOD_GROUPS_ORDER.map((group) => {
            const items = Array.from(diversity[group]);
            return (
              <div key={group}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-wide text-textMuted">{FOOD_GROUP_LABELS[group]}</span>
                  <span className="font-mono text-[10px] text-gold">{items.length}</span>
                </div>
                {items.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {items.slice(0, 8).map((item) => (
                      <span key={item} className="rounded-full border border-border bg-bg/60 px-2 py-0.5 font-mono text-[9px] text-text">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-textMuted">Ninguno esta semana.</div>
                )}
              </div>
            );
          })}
        </div>
      </Collapsible>
  );

  const tablaBlock = (
    <Ledger weekDates={weekDates} weekDays={weekDays} goal={goal} tdeeFallback={tdeeFallback} onUpsert={onUpsert} variant="nutricion" />
  );

  const blocks: Record<MacrosBlockId, ReactNode> = {
    resumen: resumenBlock,
    ranking: rankingBlock,
    reporte: reporteSemanalBlock,
    cruceEntreno: <FoodTrainingInsights insight={foodTrainingInsight} openOnDesktop />,
    diversidad: diversidadBlock,
    tabla: tablaBlock,
  };

  return (
    <DndContext sensors={drag.sensors} collisionDetection={drag.collisionDetection} onDragStart={drag.handleDragStart} onDragEnd={drag.handleDragEnd} onDragCancel={drag.handleDragCancel}>
      <SortableContext items={visibleOrder} strategy={verticalListSortingStrategy}>
        <div className="min-w-0 space-y-4 lg:columns-2 lg:gap-4 lg:space-y-0 xl:columns-3">
        {visibleOrder.map((blockId) => (
          <SortableSection key={blockId} id={blockId} onHide={() => onHide(blockId)} dragDisabledOnDesktop>
            {blocks[blockId]}
          </SortableSection>
        ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
