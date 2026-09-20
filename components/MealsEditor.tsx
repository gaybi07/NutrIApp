"use client";

import { useEffect, useState } from "react";
import { DayEntry, MealKey, MealItem, MEAL_LABELS } from "@/lib/types";
import { getMealItems, applyMealItems } from "@/lib/calculations";
import { countDigits, MAX_DIGITS, normalizeNumberInput } from "@/lib/inputLimits";

const MEAL_ORDER: MealKey[] = ["des", "alm", "mer", "cen", "col"];

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
}: {
  entry: DayEntry;
  onUpsert: (entry: DayEntry) => void;
  emptyMessage?: string;
}) {
  const mealsWithItems = getMealsWithItems(entry);
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
