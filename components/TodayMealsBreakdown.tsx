"use client";

import { useEffect } from "react";
import { DayEntry, MealKey, MealItem, MEAL_LABELS } from "@/lib/types";
import { getMealItems, applyMealItems } from "@/lib/calculations";
import { countDigits, MAX_DIGITS, normalizeNumberInput } from "@/lib/inputLimits";
import { Collapsible } from "@/components/Collapsible";
import { SECTION_HELP } from "@/lib/helpText";

const MEAL_ORDER: MealKey[] = ["des", "alm", "mer", "cen"];

/** ~4 kcal/g es un promedio razonable para una comida mixta (ni pura grasa
 * ni pura fibra) — sirve como estimación de partida para alimentos viejos
 * que no tienen gramos guardados, así el campo no queda vacío. */
const ESTIMATED_KCAL_PER_GRAM = 4;

export function TodayMealsBreakdown({
  entry,
  onUpsert,
}: {
  entry: DayEntry;
  onUpsert: (entry: DayEntry) => void;
}) {
  const mealsWithItems = MEAL_ORDER.map((meal) => ({ meal, items: getMealItems(entry, meal) })).filter(
    (m) => m.items.length > 0
  );

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

  if (mealsWithItems.length === 0) return null;

  const updateItem = (meal: MealKey, itemId: string, patch: Partial<MealItem>) => {
    const items = getMealItems(entry, meal).map((item) => (item.id === itemId ? { ...item, ...patch } : item));
    onUpsert(applyMealItems(entry, meal, items));
  };

  // Cambiar los gramos reescala kcal/proteína/carbos/grasas/fibra en la misma
  // proporción — así no hay que recalcular todo a mano si comiste más o
  // menos cantidad de lo que se había cargado. La primera vez que se carga
  // un valor (todavía no había gramos guardados) solo se guarda, sin reescalar.
  const updateGramos = (meal: MealKey, itemId: string, newGramos: number) => {
    const items = getMealItems(entry, meal).map((item) => {
      if (item.id !== itemId) return item;
      const oldGramos = item.gramos;
      if (!oldGramos || oldGramos <= 0 || newGramos <= 0) return { ...item, gramos: newGramos };
      const ratio = newGramos / oldGramos;
      return {
        ...item,
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

  const removeItem = (meal: MealKey, itemId: string) => {
    const items = getMealItems(entry, meal).filter((item) => item.id !== itemId);
    onUpsert(applyMealItems(entry, meal, items));
  };

  return (
    <Collapsible eyebrow="Hoy" title="Editar comidas de hoy" info={SECTION_HELP.detalleComidas} defaultOpen>
      <div className="flex flex-col gap-3">
        {mealsWithItems.map(({ meal, items }) => (
          <div key={meal}>
            <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-textMuted">{MEAL_LABELS[meal]}</div>
            <div className="flex flex-col gap-1.5">
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
                      <div className="mb-0.5 font-mono text-[8px] uppercase tracking-wide text-textMuted">Gramos</div>
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
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Collapsible>
  );
}
