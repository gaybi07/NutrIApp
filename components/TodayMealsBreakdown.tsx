"use client";

import { DayEntry, MealKey, MealItem, MEAL_LABELS } from "@/lib/types";
import { getMealItems, applyMealItems } from "@/lib/calculations";
import { countDigits, MAX_DIGITS, normalizeNumberInput } from "@/lib/inputLimits";
import { Collapsible } from "@/components/Collapsible";
import { SECTION_HELP } from "@/lib/helpText";

const MEAL_ORDER: MealKey[] = ["des", "alm", "mer", "cen"];

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

  if (mealsWithItems.length === 0) return null;

  const updateItem = (meal: MealKey, itemId: string, patch: Partial<MealItem>) => {
    const items = getMealItems(entry, meal).map((item) => (item.id === itemId ? { ...item, ...patch } : item));
    onUpsert(applyMealItems(entry, meal, items));
  };

  const removeItem = (meal: MealKey, itemId: string) => {
    const items = getMealItems(entry, meal).filter((item) => item.id !== itemId);
    onUpsert(applyMealItems(entry, meal, items));
  };

  return (
    <Collapsible eyebrow="Hoy" title="Detalle de comidas" info={SECTION_HELP.detalleComidas}>
      <div className="flex flex-col gap-3">
        {mealsWithItems.map(({ meal, items }) => (
          <div key={meal}>
            <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-textMuted">{MEAL_LABELS[meal]}</div>
            <div className="flex flex-col gap-1.5">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-1.5 rounded-lg border border-border bg-bg/50 px-2 py-1.5">
                  <span className="min-w-0 flex-1 truncate text-[12px] text-text">{item.nombre}</span>
                  <input
                    type="number"
                    max="999999"
                    value={item.kcal}
                    onChange={(e) => {
                      if (countDigits(e.target.value) <= MAX_DIGITS) updateItem(meal, item.id, { kcal: normalizeNumberInput(e.target) });
                    }}
                    className="w-16 rounded-md border border-border bg-surface px-1.5 py-1 text-right font-mono text-[11px]"
                  />
                  <span className="font-mono text-[8.5px] uppercase text-textMuted">kcal</span>
                  <input
                    type="number"
                    max="999999"
                    value={item.protein}
                    onChange={(e) => {
                      if (countDigits(e.target.value) <= MAX_DIGITS) updateItem(meal, item.id, { protein: normalizeNumberInput(e.target) });
                    }}
                    className="w-14 rounded-md border border-border bg-surface px-1.5 py-1 text-right font-mono text-[11px]"
                  />
                  <span className="font-mono text-[8.5px] uppercase text-textMuted whitespace-nowrap">g prot</span>
                  <button
                    type="button"
                    onClick={() => removeItem(meal, item.id)}
                    aria-label={`Borrar ${item.nombre}`}
                    className="rounded-full border border-rust/50 px-1.5 py-0.5 font-mono text-[12px] leading-none text-rust"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Collapsible>
  );
}
