"use client";

import { useState } from "react";
import { DayEntry, MealKey, MealItem } from "@/lib/types";
import { getMealItems, applyMealItems, unitsToGrams, groupMealItems, sumMealItems } from "@/lib/calculations";
import { countDigits, MAX_DIGITS, normalizeNumberInput } from "@/lib/inputLimits";
import { useFoods } from "@/lib/useFoods";

export type MealItemsInventoryDelta = {
  itemId: string;
  delta: number;
  fallback?: NonNullable<MealItem["fuenteSnapshot"]> & { unit: NonNullable<MealItem["fuenteUnidad"]> };
};

/**
 * Lista editable de los alimentos de UNA comida puntual (gramos/kcal/
 * proteína/etc.), con preparaciones agrupadas y colapsables -- extraída de
 * MealsEditor.tsx para reusar la misma lógica (con sus arreglos de
 * reescalado de macros) tanto ahí como en el desglose de "Ya cargado" de
 * AiEntryForm.tsx. No incluye el acordeón por comida ni "+ Agregar a
 * preparaciones" -- eso sigue siendo decisión de quien la usa.
 */
export function MealItemsList({
  entry,
  meal,
  onUpsert,
  onInventoryDelta,
}: {
  entry: DayEntry;
  meal: MealKey;
  onUpsert: (entry: DayEntry) => void;
  onInventoryDelta?: (deltas: MealItemsInventoryDelta[]) => void;
}) {
  const items = getMealItems(entry, meal);
  const { gramsPerUnit } = useFoods();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const toggleGroup = (grupoId: string) => setOpenGroups((prev) => ({ ...prev, [grupoId]: !prev[grupoId] }));

  const updateItem = (itemId: string, patch: Partial<MealItem>) => {
    const next = getMealItems(entry, meal).map((item) => (item.id === itemId ? { ...item, ...patch } : item));
    onUpsert(applyMealItems(entry, meal, next));
  };

  // Reescala kcal/proteína/carbos/grasas/fibra en la misma proporción al
  // cambiar la cantidad -- así no hay que recalcular todo a mano si comiste
  // más o menos de lo que se había cargado. Sirve tanto para "Gramos" como
  // para "Unidades" (items por unidad cargados desde la Alacena).
  const updateQuantity = (itemId: string, newValue: number) => {
    const next = getMealItems(entry, meal).map((item) => {
      if (item.id !== itemId) return item;
      const isUnitBased = item.fuenteUnidad === "u.";
      const oldValue = item.fuenteCantidad ?? item.gramos;
      const canReconcile = Boolean(item.fuenteAlacenaId) && oldValue != null;
      if (canReconcile) {
        onInventoryDelta?.([
          {
            itemId: item.fuenteAlacenaId as string,
            delta: newValue - (oldValue as number),
            fallback: item.fuenteSnapshot ? { ...item.fuenteSnapshot, unit: item.fuenteUnidad as NonNullable<MealItem["fuenteUnidad"]> } : undefined,
          },
        ]);
      }
      const gpu = isUnitBased ? gramsPerUnit(item.nombre) : null;
      const newGramos = isUnitBased ? (gpu ? unitsToGrams(newValue, gpu) : item.gramos) : newValue;
      const patchedFuente = canReconcile ? { fuenteCantidad: newValue } : {};
      if (newValue <= 0) {
        // 0 a propósito -- 0 gramos son 0 de todo lo demás, no se deja
        // kcal/proteína viejas colgando (rompía el recálculo al volver a
        // poner una cantidad).
        return {
          ...item,
          ...patchedFuente,
          gramos: newGramos,
          kcal: 0,
          protein: 0,
          carbs: item.carbs != null ? 0 : item.carbs,
          fat: item.fat != null ? 0 : item.fat,
          fiber: item.fiber != null ? 0 : item.fiber,
        };
      }
      if (!oldValue || oldValue <= 0) {
        // No hay de dónde sacar una proporción -- queda para completar a mano.
        return { ...item, ...patchedFuente, gramos: newGramos };
      }
      const ratio = newValue / oldValue;
      return {
        ...item,
        ...patchedFuente,
        gramos: newGramos,
        kcal: Math.round(item.kcal * ratio),
        protein: Math.round(item.protein * ratio),
        carbs: item.carbs != null ? Math.round(item.carbs * ratio) : item.carbs,
        fat: item.fat != null ? Math.round(item.fat * ratio) : item.fat,
        fiber: item.fiber != null ? Math.round(item.fiber * ratio) : item.fiber,
      };
    });
    onUpsert(applyMealItems(entry, meal, next));
  };

  const removeItem = (itemId: string) => {
    const removed = items.find((item) => item.id === itemId);
    if (removed?.fuenteAlacenaId && removed.fuenteCantidad != null) {
      onInventoryDelta?.([
        {
          itemId: removed.fuenteAlacenaId,
          delta: -removed.fuenteCantidad,
          fallback: removed.fuenteSnapshot ? { ...removed.fuenteSnapshot, unit: removed.fuenteUnidad as NonNullable<MealItem["fuenteUnidad"]> } : undefined,
        },
      ]);
    }
    const next = items.filter((item) => item.id !== itemId);
    onUpsert(applyMealItems(entry, meal, next));
  };

  const renderItemCard = (item: MealItem) => (
    <div key={item.id} className="rounded-lg border border-border bg-bg/50 px-2 py-2">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="min-w-0 flex-1 truncate text-[12px] text-text">{item.nombre}</span>
        <button
          type="button"
          onClick={() => removeItem(item.id)}
          aria-label={`Borrar ${item.nombre}`}
          className="rounded-full border border-rust/50 px-1.5 py-0.5 font-mono text-[12px] leading-none text-rust"
        >
          ×
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <div>
          <div className="mb-0.5 font-mono text-[8px] uppercase tracking-wide text-textMuted">
            {item.fuenteUnidad === "u." ? "Unidades" : "Gramos"}
          </div>
          {item.fuenteUnidad === "u." ? (
            <>
              <input
                type="number"
                max="999"
                placeholder="—"
                value={item.fuenteCantidad ?? ""}
                onChange={(e) => {
                  if (e.target.value !== "" && countDigits(e.target.value) <= MAX_DIGITS) updateQuantity(item.id, normalizeNumberInput(e.target));
                }}
                className="w-full rounded-md border border-border bg-surface px-1.5 py-1 text-right font-mono text-[11px]"
              />
              {gramsPerUnit(item.nombre) && (
                <div className="mt-0.5 text-right font-mono text-[8px] text-textMuted">≈ {item.gramos ?? 0} g</div>
              )}
            </>
          ) : (
            <input
              type="number"
              max="9999"
              placeholder="—"
              value={item.gramos ?? ""}
              onChange={(e) => {
                if (e.target.value !== "" && countDigits(e.target.value) <= MAX_DIGITS) updateQuantity(item.id, normalizeNumberInput(e.target));
              }}
              className="w-full rounded-md border border-border bg-surface px-1.5 py-1 text-right font-mono text-[11px]"
            />
          )}
        </div>
        <div>
          <div className="mb-0.5 font-mono text-[8px] uppercase tracking-wide text-textMuted">Kcal</div>
          <input
            type="number"
            max="999999"
            value={item.kcal}
            onChange={(e) => {
              if (e.target.value !== "" && countDigits(e.target.value) <= MAX_DIGITS) updateItem(item.id, { kcal: normalizeNumberInput(e.target) });
            }}
            className="w-full rounded-md border border-border bg-surface px-1.5 py-1 text-right font-mono text-[11px]"
          />
        </div>
        <div>
          <div className="mb-0.5 font-mono text-[8px] uppercase tracking-wide text-textMuted">Proteína (g)</div>
          <input
            type="number"
            max="999999"
            value={item.protein}
            onChange={(e) => {
              if (e.target.value !== "" && countDigits(e.target.value) <= MAX_DIGITS) updateItem(item.id, { protein: normalizeNumberInput(e.target) });
            }}
            className="w-full rounded-md border border-border bg-surface px-1.5 py-1 text-right font-mono text-[11px]"
          />
        </div>
      </div>
      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
        <div>
          <div className="mb-0.5 font-mono text-[8px] uppercase tracking-wide text-textMuted">Carbos (g)</div>
          <input
            type="number"
            max="999999"
            value={item.carbs ?? 0}
            onChange={(e) => {
              if (e.target.value !== "" && countDigits(e.target.value) <= MAX_DIGITS) updateItem(item.id, { carbs: normalizeNumberInput(e.target) });
            }}
            className="w-full rounded-md border border-border bg-surface px-1.5 py-1 text-right font-mono text-[11px]"
          />
        </div>
        <div>
          <div className="mb-0.5 font-mono text-[8px] uppercase tracking-wide text-textMuted">Grasas (g)</div>
          <input
            type="number"
            max="999999"
            value={item.fat ?? 0}
            onChange={(e) => {
              if (e.target.value !== "" && countDigits(e.target.value) <= MAX_DIGITS) updateItem(item.id, { fat: normalizeNumberInput(e.target) });
            }}
            className="w-full rounded-md border border-border bg-surface px-1.5 py-1 text-right font-mono text-[11px]"
          />
        </div>
        <div>
          <div className="mb-0.5 font-mono text-[8px] uppercase tracking-wide text-textMuted">Fibra (g)</div>
          <input
            type="number"
            max="999999"
            value={item.fiber ?? 0}
            onChange={(e) => {
              if (e.target.value !== "" && countDigits(e.target.value) <= MAX_DIGITS) updateItem(item.id, { fiber: normalizeNumberInput(e.target) });
            }}
            className="w-full rounded-md border border-border bg-surface px-1.5 py-1 text-right font-mono text-[11px]"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-1.5">
      {groupMealItems(items).map((group) => {
        if (!group.grupoId) return renderItemCard(group.items[0]);
        const groupOpen = Boolean(openGroups[group.grupoId]);
        const totals = sumMealItems(group.items);
        return (
          <div key={group.grupoId} className="rounded-lg border border-gold/40 bg-gold/5">
            <button
              type="button"
              onClick={() => toggleGroup(group.grupoId as string)}
              className="flex w-full items-center justify-between gap-2 px-2 py-2 text-left"
            >
              <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-text">{group.grupoNombre}</span>
              <span className="shrink-0 font-mono text-[10px] text-textMuted">
                {Math.round(totals.kcal)} kcal {groupOpen ? "▲" : "▼"}
              </span>
            </button>
            {groupOpen && <div className="flex flex-col gap-1.5 border-t border-gold/30 p-1.5">{group.items.map((item) => renderItemCard(item))}</div>}
          </div>
        );
      })}
    </div>
  );
}
