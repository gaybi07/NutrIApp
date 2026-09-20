"use client";

import { DndContext } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
  DayEntry,
  InventoryCategory,
  InventoryItem,
  InventoryNutrition,
  PurchaseRecord,
  MealKey,
  WeekPlan,
  GoalMode,
  ComidasBlockId,
  DEFAULT_COMIDAS_ORDER,
  resolveOrder,
} from "@/lib/types";
import { ProductMemoryApi } from "@/lib/useProductMemory";
import { HouseholdInfo } from "@/lib/useHousehold";
import { useSectionOrder } from "@/lib/useSectionOrder";
import { SortableSection } from "@/components/SortableSection";
import { RecipePlanner } from "@/components/RecipePlanner";
import { CommonMealsCard } from "@/components/CommonMealsCard";
import { AlacenaCard } from "@/components/AlacenaCard";
import { HouseholdCard } from "@/components/HouseholdCard";
import { countPlannedMeals, hasWeekActivity } from "@/components/WeekPlanner";

export function ComidasTab({
  items,
  consumeAmounts,
  onUseRecipe,
  dailyGoal,
  consumedKcal,
  weekPlan,
  onOpenPlanificador,
  addStructuredItems,
  updateInventoryItem,
  applyInventoryReview,
  productMemory,
  replaceItems,
  order,
  onReorder,
  hidden,
  onHide,
  aiReviewLockedUntil,
  onAiReviewLockedUntilChange,
  todayEntry,
  onUpsertDay,
  household,
  householdLoaded,
  householdStatus,
  householdBusy,
  createHousehold,
  joinHousehold,
  leaveHousehold,
  getInviteCode,
  addPurchases,
  goalMode,
}: {
  items: InventoryItem[];
  consumeAmounts: (amounts: Array<{ id: string; quantity: number }>) => void;
  onUseRecipe: (recipe: { kcal: number; protein: number }, meal: MealKey) => void;
  dailyGoal: number;
  consumedKcal: number;
  goalMode?: GoalMode;
  weekPlan: WeekPlan;
  onOpenPlanificador: () => void;
  addStructuredItems: (entries: Array<{ name: string; quantity: number; unit: InventoryItem["unit"]; category?: InventoryCategory; nutritionPer100g?: InventoryNutrition }>) => void;
  updateInventoryItem: (id: string, patch: Partial<InventoryItem>) => void;
  applyInventoryReview: (corrections: Array<{ id: string; name: string; quantity: number; unit: InventoryItem["unit"]; category?: InventoryCategory; nutritionPer100g?: InventoryNutrition }>) => void;
  productMemory: ProductMemoryApi;
  replaceItems: (items: InventoryItem[]) => void;
  order?: ComidasBlockId[];
  onReorder: (next: ComidasBlockId[]) => void;
  hidden?: ComidasBlockId[];
  onHide: (id: ComidasBlockId) => void;
  aiReviewLockedUntil?: number;
  onAiReviewLockedUntilChange: (until: number) => void;
  todayEntry: DayEntry;
  onUpsertDay: (entry: DayEntry) => void;
  household: HouseholdInfo | null;
  householdLoaded: boolean;
  householdStatus: string;
  householdBusy: boolean;
  createHousehold: (name: string, importItems: InventoryItem[]) => Promise<void>;
  joinHousehold: (code: string) => Promise<void>;
  leaveHousehold: () => Promise<void>;
  getInviteCode: () => Promise<string | null>;
  addPurchases: (entries: Array<Omit<PurchaseRecord, "id">>) => void;
}) {
  const blockOrder = resolveOrder(order, DEFAULT_COMIDAS_ORDER);
  // "alacena" nunca se apaga -- mismo criterio que "hoy" en Inicio: es el
  // bloque central de la solapa, siempre visible y siempre abierto.
  const visibleOrder = blockOrder.filter((id) => id === "alacena" || !(hidden || []).includes(id));

  const drag = useSectionOrder(blockOrder, onReorder);

  return (
    <div>
      <DndContext sensors={drag.sensors} collisionDetection={drag.collisionDetection} onDragStart={drag.handleDragStart} onDragEnd={drag.handleDragEnd} onDragCancel={drag.handleDragCancel}>
        <SortableContext items={visibleOrder} strategy={verticalListSortingStrategy}>
          {/* Igual que Inicio: en PC los bloques se acomodan solos en columnas
              tipo mosaico en vez de una sola tira vertical -- el arrastre no
              tiene sentido ahí (el orden real lo decide el navegador
              acomodando alturas), por eso cada SortableSection de acá abajo
              pasa dragDisabledOnDesktop. */}
          <div className="min-w-0 space-y-4 lg:columns-2 lg:gap-4 lg:space-y-0 xl:columns-3">
          {visibleOrder.map((blockId) => (
            <SortableSection key={blockId} id={blockId} onHide={blockId === "alacena" ? undefined : () => onHide(blockId)} dragDisabledOnDesktop>
              {blockId === "hogar" && (
                <HouseholdCard
                  household={household}
                  loaded={householdLoaded}
                  status={householdStatus}
                  busy={householdBusy}
                  localItems={items}
                  create={createHousehold}
                  join={joinHousehold}
                  leave={leaveHousehold}
                  getInviteCode={getInviteCode}
                />
              )}
              {blockId === "alacena" && (
                <AlacenaCard
                  items={items}
                  replaceItems={replaceItems}
                  updateItem={updateInventoryItem}
                  applyReview={applyInventoryReview}
                  productMemory={productMemory}
                  addStructuredItems={addStructuredItems}
                  consumeAmounts={consumeAmounts}
                  aiReviewLockedUntil={aiReviewLockedUntil}
                  onAiReviewLockedUntilChange={onAiReviewLockedUntilChange}
                  todayEntry={todayEntry}
                  onUpsertDay={onUpsertDay}
                  addPurchases={addPurchases}
                  householdName={household?.name}
                />
              )}
              {blockId === "sugerencias" && (
                <RecipePlanner
                  items={items}
                  consumeAmounts={consumeAmounts}
                  onUseRecipe={onUseRecipe}
                  dailyGoal={dailyGoal}
                  consumedKcal={consumedKcal}
                  goalMode={goalMode}
                />
              )}
              {blockId === "comunes" && <CommonMealsCard />}
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
                          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">Planificador</div>
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
                        className="mt-3 w-full rounded-lg border border-gold/60 bg-gold px-3 py-2 font-sans text-[12px] font-bold text-bg"
                      >
                        Planificar la semana
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
                      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Planificador</div>
                      <div className="font-display text-xl leading-none -tracking-[0.04em]">Semana que viene</div>
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
