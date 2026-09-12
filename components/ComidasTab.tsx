"use client";

import { DndContext } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { InventoryItem, MealKey, WeekPlan, ComidasBlockId, DEFAULT_COMIDAS_ORDER, resolveOrder } from "@/lib/types";
import { useSectionOrder } from "@/lib/useSectionOrder";
import { SortableSection } from "@/components/SortableSection";
import { RecipePlanner } from "@/components/RecipePlanner";
import { CommonMealsCard } from "@/components/CommonMealsCard";
import { countPlannedMeals } from "@/components/WeekPlanner";
import { ShoppingLog } from "@/components/ShoppingLog";

export function ComidasTab({
  items,
  consumeAmounts,
  onUseRecipe,
  dailyGoal,
  consumedKcal,
  weekPlan,
  onOpenPlanificador,
  addInventoryText,
  replaceItems,
  order,
  onReorder,
}: {
  items: InventoryItem[];
  consumeAmounts: (amounts: Array<{ id: string; quantity: number }>) => void;
  onUseRecipe: (recipe: { kcal: number; protein: number }, meal: MealKey) => void;
  dailyGoal: number;
  consumedKcal: number;
  weekPlan: WeekPlan;
  onOpenPlanificador: () => void;
  addInventoryText: (text: string) => void;
  replaceItems: (items: InventoryItem[]) => void;
  order?: ComidasBlockId[];
  onReorder: (next: ComidasBlockId[]) => void;
}) {
  const blockOrder = resolveOrder(order, DEFAULT_COMIDAS_ORDER);
  const drag = useSectionOrder(blockOrder, onReorder);

  return (
    <DndContext sensors={drag.sensors} collisionDetection={drag.collisionDetection} onDragStart={drag.handleDragStart} onDragEnd={drag.handleDragEnd} onDragCancel={drag.handleDragCancel}>
      <SortableContext items={blockOrder} strategy={verticalListSortingStrategy}>
        {blockOrder.map((blockId) => (
          <SortableSection key={blockId} id={blockId}>
            {blockId === "recetas" && (
              <RecipePlanner
                items={items}
                consumeAmounts={consumeAmounts}
                onUseRecipe={onUseRecipe}
                dailyGoal={dailyGoal}
                consumedKcal={consumedKcal}
              />
            )}
            {blockId === "comunes" && <CommonMealsCard />}
            {blockId === "planificador" && (
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
                  {countPlannedMeals(weekPlan)} comidas
                </div>
              </button>
            )}
            {blockId === "compras" && <ShoppingLog items={items} addInventoryText={addInventoryText} replaceItems={replaceItems} />}
          </SortableSection>
        ))}
      </SortableContext>
    </DndContext>
  );
}
