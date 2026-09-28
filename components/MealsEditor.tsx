"use client";

import { useEffect, useState } from "react";
import { DayEntry, MealKey, MEAL_LABELS } from "@/lib/types";
import { getMealItems, applyMealItems, tagGroup } from "@/lib/calculations";
import { useMealPreparations } from "@/lib/useMealPreparations";
import { MealItemsList, MealItemsInventoryDelta } from "@/components/MealItemsList";

const MEAL_ORDER: MealKey[] = ["des", "alm", "mer", "cen", "col"];

export type MealsEditorInventoryDelta = MealItemsInventoryDelta;

/** ~4 kcal/g es un promedio razonable para una comida mixta (ni pura grasa
 * ni pura fibra) — sirve como estimación de partida para alimentos viejos
 * que no tienen gramos guardados, así el campo no queda vacío. */
const ESTIMATED_KCAL_PER_GRAM = 4;

export function getMealsWithItems(entry: DayEntry) {
  return MEAL_ORDER.map((meal) => ({ meal, items: getMealItems(entry, meal) })).filter((m) => m.items.length > 0);
}

/** Grilla editable de alimentos por comida (gramos/kcal/proteína), usada
 * tanto para "Hoy" como para cualquier día de la semana que se elija — la
 * lógica es la misma, solo cambia qué DayEntry se le pasa. El detalle de
 * cada item (gramos/kcal/etc., preparaciones agrupadas) vive en
 * MealItemsList.tsx, reusado también por AiEntryForm.tsx en "Ya cargado". */
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
  // Colapsado por comida (Desayuno/Almuerzo/...), tipo acordeón -- si no, con
  // las 5 comidas del día abiertas a la vez queda todo "despegado" en una
  // lista larguísima. Arranca todo cerrado; al abrir una comida se cierra
  // cualquier otra que estuviera abierta, así el bloque nunca crece más de
  // una comida por vez.
  const [openMeal, setOpenMeal] = useState<MealKey | null>(null);
  const toggleMeal = (meal: MealKey) => setOpenMeal((prev) => (prev === meal ? null : meal));
  const { save: savePreparation } = useMealPreparations();

  // Nombrar retroactivamente lo que ya está cargado suelto en una comida --
  // todos los items sin grupo de esa comida pasan a compartir un grupoId
  // nuevo y se muestran colapsados de ahí en más.
  const groupLooseItems = (meal: MealKey) => {
    const nombre = window.prompt("¿Cómo se llama esta preparación?");
    if (!nombre || !nombre.trim()) return;
    const items = getMealItems(entry, meal);
    const loose = items.filter((item) => !item.grupoId);
    const grouped = items.filter((item) => item.grupoId);
    const tagged = tagGroup(loose, nombre.trim());
    onUpsert(applyMealItems(entry, meal, [...grouped, ...tagged]));
    savePreparation(
      nombre.trim(),
      "",
      loose.map((item) => ({ nombre: item.nombre, cantidad: item.gramos ?? 1, unidad: (item.gramos != null ? "g" : "u.") as "g" | "u." })),
      meal
    );
  };

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
                <MealItemsList entry={entry} meal={meal} onUpsert={onUpsert} onInventoryDelta={onInventoryDelta} />
                {items.filter((item) => !item.grupoId).length > 1 && (
                  <button
                    type="button"
                    onClick={() => groupLooseItems(meal)}
                    className="mt-0.5 rounded-lg border border-dashed border-gold/40 px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-wide text-gold"
                  >
                    + Agregar a preparaciones
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
