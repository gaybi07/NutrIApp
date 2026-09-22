"use client";

import { useEffect, useState } from "react";
import { DayEntry, MealKey, MealItem, MEAL_LABELS } from "@/lib/types";
import { getMealItems, applyMealItems, unitsToGrams } from "@/lib/calculations";
import { countDigits, MAX_DIGITS, normalizeNumberInput } from "@/lib/inputLimits";
import { useFoods } from "@/lib/useFoods";

const MEAL_ORDER: MealKey[] = ["des", "alm", "mer", "cen", "col"];

export type MealsEditorInventoryDelta = {
  itemId: string;
  delta: number;
  fallback?: NonNullable<MealItem["fuenteSnapshot"]> & { unit: NonNullable<MealItem["fuenteUnidad"]> };
};

/** ~4 kcal/g es un promedio razonable para una comida mixta (ni pura grasa
 * ni pura fibra) — sirve como estimación de partida para alimentos viejos
 * que no tienen gramos guardados, así el campo no queda vacío. */
const ESTIMATED_KCAL_PER_GRAM = 4;

export function getMealsWithItems(entry: DayEntry) {
  return MEAL_ORDER.map((meal) => ({ meal, items: getMealItems(entry, meal) })).filter((m) => m.items.length > 0);
}

/** Grilla editable de alimentos por comida (gramos/kcal/proteína), usada
 * tanto para "Hoy" como para cualquier día de la semana que se elija — la
 * lógica es la misma, solo cambia qué DayEntry se le pasa. */
export function MealsEditor({
  entry,
  onUpsert,
  emptyMessage,
  onInventoryDelta,
}: {
  entry: DayEntry;
  onUpsert: (entry: DayEntry) => void;
  emptyMessage?: string;
  /** Si un item viene de la Alacena (fuenteAlacenaId), editar sus gramos o
   * borrarlo debe ajustar el stock por la diferencia -- delta>0 es "comiste
   * más" (descontar), delta<0 es "comiste menos/borraste" (devolver). Sin
   * esto, el stock quedaba fijo en lo que se cargó la primera vez aunque
   * después se corrigiera la cantidad. */
  onInventoryDelta?: (deltas: MealsEditorInventoryDelta[]) => void;
}) {
  const mealsWithItems = getMealsWithItems(entry);
  const { gramsPerUnit } = useFoods();
  // Colapsado por comida (Desayuno/Almuerzo/...), tipo acordeón -- si no, con
  // las 5 comidas del día abiertas a la vez queda todo "despegado" en una
  // lista larguísima. Arranca todo cerrado; al abrir una comida se cierra
  // cualquier otra que estuviera abierta, así el bloque nunca crece más de
  // una comida por vez.
  const [openMeal, setOpenMeal] = useState<MealKey | null>(null);
  const toggleMeal = (meal: MealKey) => setOpenMeal((prev) => (prev === meal ? null : meal));

  // Los alimentos cargados antes de que existiera el campo "gramos" (o que la
  // IA no haya podido estimar) se completan solos con una estimación a
  // partir de las kcal — así el campo nunca queda en blanco, y desde ahí ya
  // se puede editar/recalcular con precisión.
  useEffect(() => {
    let next = entry;
    let changed = false;
    for (const meal of MEAL_ORDER) {
      const items = getMealItems(next, meal);
      if (items.length === 0) continue;
      const hasMissing = items.some((item) => item.gramos == null && item.kcal > 0);
      if (!hasMissing) continue;
      const patched = items.map((item) =>
        item.gramos == null && item.kcal > 0 ? { ...item, gramos: Math.round(item.kcal / ESTIMATED_KCAL_PER_GRAM) } : item
      );
      next = applyMealItems(next, meal, patched);
      changed = true;
    }
    if (changed) onUpsert(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry]);

  if (mealsWithItems.length === 0) {
    return emptyMessage ? (
      <div className="rounded-xl border border-dashed border-border p-3 text-[12px] text-textMuted">{emptyMessage}</div>
    ) : null;
  }

  const updateItem = (meal: MealKey, itemId: string, patch: Partial<MealItem>) => {
    const items = getMealItems(entry, meal).map((item) => (item.id === itemId ? { ...item, ...patch } : item));
    onUpsert(applyMealItems(entry, meal, items));
  };

  // Cambiar los gramos reescala kcal/proteína/carbos/grasas/fibra en la misma
  // proporción — así no hay que recalcular todo a mano si comiste más o
  // menos cantidad de lo que se había cargado. La primera vez que se carga
  // un valor (todavía no había gramos guardados) solo se guarda, sin reescalar.
  // Para items "por unidad" (fuenteUnidad === "u.", ej. 1 milanesa) este
  // campo no se usa -- ver updateUnidades más abajo, que es el que
  // reconcilia stock para ese caso (cierra el hueco dejado a propósito en
  // el arreglo del bug de la Alacena).
  const updateGramos = (meal: MealKey, itemId: string, newGramos: number) => {
    const items = getMealItems(entry, meal).map((item) => {
      if (item.id !== itemId) return item;
      const oldGramos = item.gramos;
      const canReconcile = item.fuenteAlacenaId && item.fuenteUnidad !== "u." && item.fuenteCantidad != null;
      if (canReconcile) {
        const delta = newGramos - (item.fuenteCantidad as number);
        onInventoryDelta?.([
          {
            itemId: item.fuenteAlacenaId as string,
            delta,
            fallback: item.fuenteSnapshot ? { ...item.fuenteSnapshot, unit: item.fuenteUnidad as NonNullable<MealItem["fuenteUnidad"]> } : undefined,
          },
        ]);
      }
      const patchedFuente = canReconcile ? { fuenteCantidad: newGramos } : {};
      if (!oldGramos || oldGramos <= 0 || newGramos <= 0) return { ...item, ...patchedFuente, gramos: newGramos };
      const ratio = newGramos / oldGramos;
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
    onUpsert(applyMealItems(entry, meal, items));
  };

  // Reescala igual que updateGramos, pero en unidades -- para items cargados
  // "por unidad" desde la Alacena (fuenteUnidad === "u."). Cierra el hueco
  // dejado a propósito al arreglar el bug de la Alacena: hasta que existía
  // el peso-por-unidad (tabla foods), editar la cantidad de estos items no
  // reconciliaba stock.
  const updateUnidades = (meal: MealKey, itemId: string, newUnidades: number) => {
    const items = getMealItems(entry, meal).map((item) => {
      if (item.id !== itemId) return item;
      const oldUnidades = item.fuenteCantidad ?? 0;
      if (item.fuenteAlacenaId) {
        onInventoryDelta?.([
          {
            itemId: item.fuenteAlacenaId,
            delta: newUnidades - oldUnidades,
            fallback: item.fuenteSnapshot ? { ...item.fuenteSnapshot, unit: "u." } : undefined,
          },
        ]);
      }
      const gpu = gramsPerUnit(item.nombre);
      const gramos = gpu ? unitsToGrams(newUnidades, gpu) : item.gramos;
      if (!oldUnidades || oldUnidades <= 0 || newUnidades <= 0) {
        return { ...item, fuenteCantidad: newUnidades, gramos };
      }
      const ratio = newUnidades / oldUnidades;
      return {
        ...item,
        fuenteCantidad: newUnidades,
        gramos,
        kcal: Math.round(item.kcal * ratio),
        protein: Math.round(item.protein * ratio),
        carbs: item.carbs != null ? Math.round(item.carbs * ratio) : item.carbs,
        fat: item.fat != null ? Math.round(item.fat * ratio) : item.fat,
        fiber: item.fiber != null ? Math.round(item.fiber * ratio) : item.fiber,
      };
    });
    onUpsert(applyMealItems(entry, meal, items));
  };

  const removeItem = (meal: MealKey, itemId: string) => {
    const removed = getMealItems(entry, meal).find((item) => item.id === itemId);
    if (removed?.fuenteAlacenaId && removed.fuenteCantidad != null) {
      onInventoryDelta?.([
        {
          itemId: removed.fuenteAlacenaId,
          delta: -removed.fuenteCantidad,
          fallback: removed.fuenteSnapshot ? { ...removed.fuenteSnapshot, unit: removed.fuenteUnidad as NonNullable<MealItem["fuenteUnidad"]> } : undefined,
        },
      ]);
    }
    const items = getMealItems(entry, meal).filter((item) => item.id !== itemId);
    onUpsert(applyMealItems(entry, meal, items));
  };

  return (
    <div className="flex flex-col gap-2">
      {mealsWithItems.map(({ meal, items }) => {
        const open = openMeal === meal;
        return (
        <div key={meal} className="rounded-lg border border-border/60 bg-bg/30">
          <div
            role="button"
            tabIndex={0}
            onClick={() => toggleMeal(meal)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                toggleMeal(meal);
              }
            }}
            className="flex cursor-pointer items-center justify-between gap-2 px-2.5 py-2"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-textMuted">
              {MEAL_LABELS[meal]} <span className="text-text/70">· {items.length}</span>
            </span>
            <span
              className="font-mono text-[10px] text-textMuted transition-transform"
              style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              ▾
            </span>
          </div>
          {open && (
          <div className="flex flex-col gap-1.5 px-2.5 pb-2.5">
            {items.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-bg/50 px-2 py-2">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span className="min-w-0 flex-1 truncate text-[12px] text-text">{item.nombre}</span>
                  <button
                    type="button"
                    onClick={() => removeItem(meal, item.id)}
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
                            if (countDigits(e.target.value) <= MAX_DIGITS) updateUnidades(meal, item.id, normalizeNumberInput(e.target));
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
                          if (countDigits(e.target.value) <= MAX_DIGITS) updateGramos(meal, item.id, normalizeNumberInput(e.target));
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
                        if (countDigits(e.target.value) <= MAX_DIGITS) updateItem(meal, item.id, { kcal: normalizeNumberInput(e.target) });
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
                        if (countDigits(e.target.value) <= MAX_DIGITS) updateItem(meal, item.id, { protein: normalizeNumberInput(e.target) });
                      }}
                      className="w-full rounded-md border border-border bg-surface px-1.5 py-1 text-right font-mono text-[11px]"
                    />
                  </div>
                </div>
                {/* Carbos/grasas/fibra no se mostraban acá -- si la IA
                    devolvía un valor absurdo (ej. un cero de más) no había
                    forma de corregirlo sin borrar y volver a cargar la
                    comida entera. */}
                <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                  <div>
                    <div className="mb-0.5 font-mono text-[8px] uppercase tracking-wide text-textMuted">Carbos (g)</div>
                    <input
                      type="number"
                      max="999999"
                      value={item.carbs ?? 0}
                      onChange={(e) => {
                        if (countDigits(e.target.value) <= MAX_DIGITS) updateItem(meal, item.id, { carbs: normalizeNumberInput(e.target) });
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
                        if (countDigits(e.target.value) <= MAX_DIGITS) updateItem(meal, item.id, { fat: normalizeNumberInput(e.target) });
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
                        if (countDigits(e.target.value) <= MAX_DIGITS) updateItem(meal, item.id, { fiber: normalizeNumberInput(e.target) });
                      }}
                      className="w-full rounded-md border border-border bg-surface px-1.5 py-1 text-right font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
        );
      })}
    </div>
  );
}
