"use client";

import { useState } from "react";
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
  ComidasSubTab,
  COMIDAS_SUBTAB_BLOCKS,
  DEFAULT_COMIDAS_ORDER,
  resolveOrder,
  mergeGroupOrder,
} from "@/lib/types";
import { ProductMemoryApi } from "@/lib/useProductMemory";
import { HouseholdInfo } from "@/lib/useHousehold";
import { useSectionOrder } from "@/lib/useSectionOrder";
import { SortableSection } from "@/components/SortableSection";
import { RecipePlanner } from "@/components/RecipePlanner";
import { CommonMealsCard } from "@/components/CommonMealsCard";
import { AlacenaCard } from "@/components/AlacenaCard";
import { HouseholdCard } from "@/components/HouseholdCard";
import { countPlannedMeals } from "@/components/WeekPlanner";
import { ShoppingLog } from "@/components/ShoppingLog";

const SUBTABS: { id: ComidasSubTab; label: string }[] = [
  { id: "alacena", label: "Alacena" },
  { id: "planificado", label: "Planificado" },
];

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
  const [subTab, setSubTab] = useState<ComidasSubTab>("alacena");
  const blockOrder = resolveOrder(order, DEFAULT_COMIDAS_ORDER);
  const groupIds = COMIDAS_SUBTAB_BLOCKS[subTab];
  const groupOrder = blockOrder.filter((id) => groupIds.includes(id));
  const visibleOrder = groupOrder.filter((id) => !(hidden || []).includes(id));

  const handleReorder = (nextGroup: ComidasBlockId[]) => onReorder(mergeGroupOrder(blockOrder, groupIds, nextGroup));
  const drag = useSectionOrder(groupOrder, handleReorder);

  return (
    <div>
      <div className="mb-4 flex gap-1 rounded-xl border border-border bg-surface/70 p-1">
        {SUBTABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id)}
            className={`flex-1 rounded-lg px-2 py-2 text-center font-mono text-[11px] uppercase tracking-[0.12em] transition-colors ${
              subTab === tab.id ? "bg-gold text-bg" : "text-textMuted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <DndContext sensors={drag.sensors} collisionDetection={drag.collisionDetection} onDragStart={drag.handleDragStart} onDragEnd={drag.handleDragEnd} onDragCancel={drag.handleDragCancel}>
        <SortableContext items={visibleOrder} strategy={verticalListSortingStrategy}>
          {/* Igual que Inicio: en PC los bloques se acomodan solos en columnas
              tipo mosaico en vez de una sola tira vertical -- el arrastre no
              tiene sentido ahí (el orden real lo decide el navegador
              acomodando alturas), por eso cada SortableSection de acá abajo
              pasa dragDisabledOnDesktop. */}
          <div className="min-w-0 space-y-4 lg:columns-2 lg:gap-4 lg:space-y-0 xl:columns-3">
          {visibleOrder.map((blockId) => (
            <SortableSection key={blockId} id={blockId} onHide={() => onHide(blockId)} dragDisabledOnDesktop>
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
              {blockId === "compras" && (
                <ShoppingLog addStructuredItems={addStructuredItems} addPurchases={addPurchases} productMemory={productMemory} />
              )}
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
            </SortableSection>
          ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
