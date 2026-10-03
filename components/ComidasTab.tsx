"use client";

import { DndContext } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
  DayEntry,
  DayMealOptions,
  InventoryItem,
  MealOption,
  Weekday,
  MealKey,
  MEAL_LABELS,
  WeekPlan,
  ComidasBlockId,
  DEFAULT_COMIDAS_ORDER,
  resolveOrder,
} from "@/lib/types";
import { HouseholdInfo } from "@/lib/useHousehold";
import { useSectionOrder } from "@/lib/useSectionOrder";
import { SortableSection } from "@/components/SortableSection";
import { countPlannedMeals, hasWeekActivity, SKIP_MEAL } from "@/components/WeekPlanner";
import { TodayMeals, WeekAlmanaque } from "@/components/PlanAlmanaque";
import { btn } from "@/components/buttonStyles";
import { ShoppingListCard } from "@/components/ShoppingListCard";

const MEAL_KEYS: MealKey[] = ["des", "alm", "mer", "cen", "col"];
const DOW_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/**
 * Solo lectura -- lo planificado para la semana que se está mirando con las
 * flechas "‹ Semana anterior / Semana siguiente ›" del header (weekDates,
 * calculado en app/page.tsx a partir de weekOffset). A diferencia del
 * Planificador (que siempre arma/importa la semana QUE VIENE), esto muestra
 * cualquier semana -- pasada, actual o futura -- tal como haya quedado en
 * weekPlan (propio o ya importado del Nutricionista).
 */
function WeekPlanSummaryCard({ weekDates, weekPlan }: { weekDates: string[]; weekPlan: WeekPlan }) {
  const first = new Date(`${weekDates[0]}T00:00:00`);
  const last = new Date(`${weekDates[weekDates.length - 1]}T00:00:00`);

  return (
    <section className="rounded-2xl border border-border bg-surface/70 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Plan semanal</div>
        <div className="font-mono text-[10px] text-textMuted">
          {first.getDate()}/{first.getMonth() + 1}–{last.getDate()}/{last.getMonth() + 1}
        </div>
      </div>
      <div className="space-y-1.5">
        {weekDates.map((fecha) => {
          const dayPlan = weekPlan[fecha] || {};
          const date = new Date(`${fecha}T00:00:00`);
          const entries = MEAL_KEYS.map((meal) => {
            const value = dayPlan[meal];
            if (!value || value === SKIP_MEAL) return null;
            return `${MEAL_LABELS[meal]}: ${value}`;
          }).filter((v): v is string => v !== null);
          return (
            <div key={fecha} className="rounded-lg border border-border/60 bg-bg/30 px-2.5 py-1.5">
              <div className="font-mono text-[9px] uppercase tracking-wide text-textMuted">
                {DOW_SHORT[date.getDay()]} {date.getDate()}/{date.getMonth() + 1}
              </div>
              {entries.length === 0 ? (
                <div className="mt-0.5 text-[11px] text-textMuted">Sin planificar</div>
              ) : (
                <div className="mt-0.5 text-[12px] text-text">{entries.join(" · ")}</div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function ComidasTab({
  weekPlan,
  weekDates,
  onOpenPlanificador,
  order,
  onReorder,
  hidden,
  onHide,
  household,
  hasNutricionistaLink,
  nutritionGoal,
  days,
  todayFecha,
  planThisWeek,
  planViewedWeek,
  planNextWeek,
  inventory,
  onAddPlannedMeal,
  onSkipMeal,
}: {
  weekPlan: WeekPlan;
  /** Registros reales, el día de hoy y el plan publicado por la Nutricionista (esta semana real y la
   * que se está mirando con las flechas) -- alimentan "Lo que te toca comer hoy" y el almanaque. */
  days: DayEntry[];
  todayFecha: string;
  planThisWeek: Partial<Record<Weekday, DayMealOptions>>;
  planViewedWeek: Partial<Record<Weekday, DayMealOptions>>;
  /** Plan de la Nutricionista de la semana que viene y lo que hay en la Alacena: alimentan la lista de compras. */
  planNextWeek: Partial<Record<Weekday, DayMealOptions>>;
  inventory: InventoryItem[];
  /** Carga la opción del plan elegida en "Lo que te toca comer" como comida de hoy. */
  onAddPlannedMeal: (meal: MealKey, option: MealOption) => string | void;
  onSkipMeal?: (meal: MealKey, skipped: boolean) => void;
  /** Las 7 fechas de la semana que se está mirando con las flechas de
   * arriba (◂ Semana anterior / Semana siguiente ▸) -- distinta de "la
   * semana que viene" que siempre usa el Planificador para armar/importar. */
  weekDates: string[];
  onOpenPlanificador: () => void;
  order?: ComidasBlockId[];
  onReorder: (next: ComidasBlockId[]) => void;
  hidden?: ComidasBlockId[];
  onHide: (id: ComidasBlockId) => void;
  /** Solo para el aviso de "nadie del grupo planificó todavía". */
  household: HouseholdInfo | null;
  /** Cambia el título/subtítulo de la tarjeta del Planificador -- con
   * Nutricionista vinculado, adentro ya no se "programa" nada a mano (ver
   * WeekPlanner), se ve directo lo que él/ella planificó. */
  hasNutricionistaLink?: boolean;
  /** Objetivo diario que puso el Nutricionista (promedio de la semana
   * actual real, no la que se esté navegando) -- null sin vínculo o sin
   * plan publicado todavía. */
  nutritionGoal?: { kcalPromedio: number; proteinPromedio: number } | null;
}) {
  const blockOrder = resolveOrder(order, DEFAULT_COMIDAS_ORDER);
  const visibleOrder = blockOrder.filter((id) => !(hidden || []).includes(id));

  const drag = useSectionOrder(blockOrder, onReorder);

  const hasViewedPlan = Boolean(hasNutricionistaLink) && Object.keys(planViewedWeek).length > 0;
  const hasTodayPlan = Boolean(hasNutricionistaLink) && Object.keys(planThisWeek).length > 0;

  return (
    <div>
      {/* "Lo que te toca comer hoy" va siempre primero, abierto y fijo (no entra en el orden
          arrastrable ni se puede apagar), igual que "Hoy" en Inicio. */}
      {hasTodayPlan && <TodayMeals todayFecha={todayFecha} plan={planThisWeek} days={days} weekPlan={weekPlan} onAddPlanned={onAddPlannedMeal} onSkipMeal={onSkipMeal} />}
      {nutritionGoal && (
        <div className="mb-3 rounded-xl border border-gold/40 bg-gold/5 p-3">
          <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.15em] text-gold">Objetivo de tu Nutricionista</div>
          <div className="text-sm font-semibold text-text">{nutritionGoal.kcalPromedio} kcal/día</div>
          <div className="font-mono text-[10px] text-textMuted">{nutritionGoal.proteinPromedio}g proteína/día</div>
        </div>
      )}
      <DndContext sensors={drag.sensors} collisionDetection={drag.collisionDetection} onDragStart={drag.handleDragStart} onDragEnd={drag.handleDragEnd} onDragCancel={drag.handleDragCancel}>
        <SortableContext items={visibleOrder} strategy={verticalListSortingStrategy}>
          <div className="min-w-0 space-y-4 lg:columns-2 lg:gap-4 lg:space-y-0 xl:columns-3">
          {visibleOrder.map((blockId) => (
            <SortableSection key={blockId} id={blockId} onHide={() => onHide(blockId)} dragDisabledOnDesktop>
              {blockId === "plan-semana" &&
                (hasViewedPlan ? (
                  <WeekAlmanaque weekDates={weekDates} plan={planViewedWeek} days={days} todayFecha={todayFecha} weekPlan={weekPlan} />
                ) : (
                  <WeekPlanSummaryCard weekDates={weekDates} weekPlan={weekPlan} />
                ))}
              {blockId === "compras" && <ShoppingListCard items={inventory} weekPlan={weekPlan} planThisWeek={planThisWeek} planNextWeek={planNextWeek} onOpenPlanner={onOpenPlanificador} household={household} />}
              {blockId === "planificador" && (() => {
                const plannedCount = countPlannedMeals(weekPlan);
                // Ahora que el plan se comparte entre los del grupo (ver
                // useSharedWeekPlan), "0 comidas" con un grupo armado quiere
                // decir que todavía nadie de los dos lo armó -- vale la pena
                // avisar, en vez de que cada uno se entere recién al abrir
                // el planificador.
                const pending = !!household && !hasWeekActivity(weekPlan);
                if (pending) {
                  return (
                    <section className="mb-4 rounded-xl border-2 border-rust/50 bg-surface p-3 shadow-[0_0_24px_-6px_rgba(239,68,68,0.45)]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">
                            {hasNutricionistaLink ? "Nutricionista" : "Planificador"}
                          </div>
                          <h2 className="font-display text-lg text-text">Semana que viene</h2>
                        </div>
                        <div className="shrink-0 rounded-full border border-rust/50 bg-rust/15 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-rust">
                          Pendiente
                        </div>
                      </div>
                      <div className="mt-2 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-[11px] text-textMuted">
                        Todavía nadie del grupo planificó las comidas de la semana que viene.
                      </div>
                      <button
                        type="button"
                        onClick={onOpenPlanificador}
                        className="mt-3 w-full rounded-lg border border-gold/60 bg-gold px-3 py-2 font-sans text-[12px] font-bold text-white"
                      >
                        {hasNutricionistaLink ? "Ver plan del Nutricionista" : "Planificar la semana"}
                      </button>
                    </section>
                  );
                }
                return (
                  <button
                    type="button"
                    onClick={onOpenPlanificador}
                    className="mb-4 flex w-full items-center justify-between gap-2 rounded-2xl border border-border bg-surface/70 p-3 text-left shadow-[0_0_0_1px_rgba(58,54,47,0.4)]"
                  >
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
                        {hasNutricionistaLink ? "Nutricionista" : "Planificador"}
                      </div>
                      <div className="font-display text-xl leading-none -tracking-[0.04em]">
                        {hasNutricionistaLink ? "Ver plan de la semana" : "Semana que viene"}
                      </div>
                    </div>
                    <div className="rounded-full border border-border bg-bg/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted">
                      {plannedCount} comidas
                    </div>
                  </button>
                );
              })()}
            </SortableSection>
          ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
