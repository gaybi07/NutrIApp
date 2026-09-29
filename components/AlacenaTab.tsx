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
  GoalMode,
  AlacenaBlockId,
  DEFAULT_ALACENA_ORDER,
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

/**
 * "Qué tengo" -- separada de Comidas ("qué voy a comer") a pedido del
 * usuario: antes convivían en una sola solapa y se sentía mezclado. Arranca
 * mostrando la Alacena (que a su vez abre directo en la vista de cocina,
 * ver AlacenaCard) y las sugerencias de recetas, que dependen del stock de
 * acá mismo.
 */
export function AlacenaTab({
  items,
  consumeAmounts,
  onUseRecipe,
  dailyGoal,
  consumedKcal,
  goalMode,
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
}: {
  items: InventoryItem[];
  consumeAmounts: (amounts: Array<{ id: string; quantity: number }>) => void;
  onUseRecipe: (recipe: { kcal: number; protein: number }, meal: MealKey) => void;
  dailyGoal: number;
  consumedKcal: number;
  goalMode?: GoalMode;
  addStructuredItems: (entries: Array<{ name: string; quantity: number; unit: InventoryItem["unit"]; category?: InventoryCategory; nutritionPer100g?: InventoryNutrition }>) => void;
  updateInventoryItem: (id: string, patch: Partial<InventoryItem>) => void;
  applyInventoryReview: (corrections: Array<{ id: string; name: string; quantity: number; unit: InventoryItem["unit"]; category?: InventoryCategory; nutritionPer100g?: InventoryNutrition }>) => void;
  productMemory: ProductMemoryApi;
  replaceItems: (items: InventoryItem[]) => void;
  order?: AlacenaBlockId[];
  onReorder: (next: AlacenaBlockId[]) => void;
  hidden?: AlacenaBlockId[];
  onHide: (id: AlacenaBlockId) => void;
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
  const blockOrder = resolveOrder(order, DEFAULT_ALACENA_ORDER);
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
            </SortableSection>
          ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
