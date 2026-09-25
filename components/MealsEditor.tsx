"use client";

import { useEffect, useState } from "react";
import { DayEntry, MealKey, MealItem, MEAL_LABELS } from "@/lib/types";
import { getMealItems, applyMealItems, unitsToGrams, groupMealItems, tagGroup, sumMealItems } from "@/lib/calculations";
import { countDigits, MAX_DIGITS, normalizeNumberInput } from "@/lib/inputLimits";
import { useFoods } from "@/lib/useFoods";
import { useMealPreparations } from "@/lib/useMealPreparations";

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
  // Grupos ("preparaciones" ya nombradas, ver grupoId en MealItem) que están
  // desglosados -- por defecto todos colapsados, cada uno se abre por separado.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const toggleGroup = (grupoId: string) => setOpenGroups((prev) => ({ ...prev, [grupoId]: !prev[grupoId] }));
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

  const updateItem = (meal: MealKey, itemId: string, patch: Partial<MealItem>) => {
    const items = getMealItems(entry, meal).map((item) => (item.id === itemId ? { ...item, ...patch } : item));
    onUpsert(applyMealItems(entry, meal, items));
  };

  // Reescala kcal/proteína/carbos/grasas/fibra en la misma proporción al
  // cambiar la cantidad -- así no hay que recalcular todo a mano si comiste
  // más o menos de lo que se había cargado. Sirve tanto para "Gramos" (el
  // caso normal) como para "Unidades" (items por unidad cargados desde la
  // Alacena, ej. 1 milanesa) -- la única diferencia entre los dos es CUÁL
  // campo guarda la cantidad "de verdad" (gramos vs. fuenteCantidad) y cómo
  // se deriva el otro; antes eran dos funciones casi idénticas
  // (updateGramos/updateUnidades) copiadas una de la otra.
  const updateQuantity = (meal: MealKey, itemId: string, newValue: number) => {
    const items = getMealItems(entry, meal).map((item) => {
      if (item.id !== itemId) return item;
      const isUnitBased = item.fuenteUnidad === "u.";
      // Para items cargados desde la Alacena, la cantidad "de verdad" contra
      // la que se compara es siempre fuenteCantidad (en gramos o en
      // unidades, según corresponda) -- para el resto (IA, manual, etc.) no
      // hay fuenteCantidad, así que se usa "gramos" como siempre.
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
      if (!oldValue || oldValue <= 0 || newValue <= 0) return { ...item, ...patchedFuente, gramos: newGramos };
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
    onUpsert(applyMealItems(entry, meal, items));
  };

  // Tarjeta editable de un solo item -- se usa tanto para un item suelto
  // como para cada item dentro de una preparación ya desglosada (mismos
  // campos, nada cambia salvo de dónde se llama).
  const renderItemCard = (item: MealItem, meal: MealKey) => (
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
                  if (countDigits(e.target.value) <= MAX_DIGITS) updateQuantity(meal, item.id, normalizeNumberInput(e.target));
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
                if (countDigits(e.target.value) <= MAX_DIGITS) updateQuantity(meal, item.id, normalizeNumberInput(e.target));
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
  );

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
            {groupMealItems(items).map((group) => {
              if (!group.grupoId) return renderItemCard(group.items[0], meal);
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
                  {groupOpen && (
                    <div className="flex flex-col gap-1.5 border-t border-gold/30 p-1.5">
                      {group.items.map((item) => renderItemCard(item, meal))}
                    </div>
                  )}
                </div>
              );
            })}
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
