"use client";

import { useMemo, useState } from "react";
import { InventoryItem, MealKey, MEAL_LABELS, WeekPlan } from "@/lib/types";
import { isoMonday, addDays, fmtDate } from "@/lib/calculations";
import { Recipe, RECIPES } from "@/lib/recipes";
import { SECTION_HELP } from "@/lib/helpText";
import { InfoHint } from "@/components/InfoHint";

const DOW_FULL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MEAL_KEYS: MealKey[] = ["des", "alm", "mer", "cen"];

function shortTitle(title: string) {
  return title.length > 24 ? `${title.slice(0, 22)}…` : title;
}

/** Los 7 días de la semana calendario siguiente a la actual (lunes a domingo). */
export function getNextWeekDates(): string[] {
  const thisMonday = isoMonday(fmtDate(new Date()));
  const nextMonday = addDays(thisMonday, 7);
  return [...Array(7)].map((_, i) => fmtDate(addDays(nextMonday, i)));
}

/** Cuántas comidas ya están elegidas para la semana que viene — para mostrar en el botón de entrada. */
export function countPlannedMeals(weekPlan: WeekPlan): number {
  const dates = getNextWeekDates();
  let count = 0;
  for (const fecha of dates) {
    const dayPlan = weekPlan[fecha];
    if (!dayPlan) continue;
    count += MEAL_KEYS.filter((meal) => dayPlan[meal]).length;
  }
  return count;
}

export function WeekPlanner({
  items,
  weekPlan,
  onSave,
}: {
  items: InventoryItem[];
  weekPlan: WeekPlan;
  onSave: (plan: WeekPlan) => void;
}) {
  const [pickerFor, setPickerFor] = useState<{ fecha: string; meal: MealKey } | null>(null);

  const nextWeekDates = useMemo(() => getNextWeekDates(), []);

  const assign = (fecha: string, meal: MealKey, recipeTitle: string | null) => {
    const next: WeekPlan = { ...weekPlan };
    const dayPlan = { ...(next[fecha] || {}) };
    if (recipeTitle) dayPlan[meal] = recipeTitle;
    else delete dayPlan[meal];
    if (Object.keys(dayPlan).length > 0) next[fecha] = dayPlan;
    else delete next[fecha];
    onSave(next);
    setPickerFor(null);
  };

  const selectedRecipes = useMemo(() => {
    const list: Recipe[] = [];
    for (const fecha of nextWeekDates) {
      const dayPlan = weekPlan[fecha];
      if (!dayPlan) continue;
      for (const meal of MEAL_KEYS) {
        const title = dayPlan[meal];
        if (!title) continue;
        const recipe = RECIPES.find((r) => r.title === title);
        if (recipe) list.push(recipe);
      }
    }
    return list;
  }, [weekPlan, nextWeekDates]);

  const shoppingList = useMemo(() => {
    const totals = new Map<string, { name: string; quantity: number; unit: InventoryItem["unit"] }>();
    for (const recipe of selectedRecipes) {
      for (const ing of recipe.ingredients) {
        const key = `${ing.name}|${ing.unit}`;
        const existing = totals.get(key);
        if (existing) existing.quantity += ing.quantity;
        else totals.set(key, { ...ing });
      }
    }
    return Array.from(totals.values())
      .map((needed) => {
        const stock = items.find((item) => item.unit === needed.unit && (item.name.includes(needed.name) || needed.name.includes(item.name)));
        const have = stock ? stock.quantity : 0;
        return { ...needed, missing: Math.max(0, needed.quantity - have) };
      })
      .filter((entry) => entry.missing > 0);
  }, [selectedRecipes, items]);

  const plannedCount = selectedRecipes.length;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center font-display text-xl leading-none -tracking-[0.04em]">
          Semana que viene
          <InfoHint text={SECTION_HELP.planificador} label="Qué es el Planificador" />
        </div>
        <div className="rounded-full border border-border bg-bg/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted">
          {plannedCount} {plannedCount === 1 ? "comida" : "comidas"}
        </div>
      </div>

      <div className="space-y-2">
        {nextWeekDates.map((fecha) => {
          const date = new Date(`${fecha}T00:00:00`);
          const dayPlan = weekPlan[fecha] || {};
          return (
            <div key={fecha} className="rounded-xl border border-border bg-bg/40 p-2.5">
              <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-gold">
                {DOW_FULL[date.getDay()]} {date.getDate()} {MONTHS[date.getMonth()]}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {MEAL_KEYS.map((meal) => {
                  const recipeTitle = dayPlan[meal];
                  return (
                    <button
                      key={meal}
                      type="button"
                      onClick={() => setPickerFor({ fecha, meal })}
                      className={`rounded-lg border px-2 py-1.5 text-left font-mono text-[9.5px] uppercase tracking-wide ${
                        recipeTitle ? "border-sage/50 bg-sage/10 text-sage" : "border-dashed border-border text-textMuted"
                      }`}
                    >
                      <div className="text-[8.5px] opacity-70">{MEAL_LABELS[meal]}</div>
                      <div className="mt-0.5 normal-case tracking-normal text-[11px]">
                        {recipeTitle ? shortTitle(recipeTitle) : "+ Elegir"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 rounded-xl border border-gold/30 bg-gold/10 p-3">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-gold">Lista de compras de la semana</div>
        {plannedCount === 0 ? (
          <div className="text-[12px] text-textMuted">Elegí recetas para los días de la semana que viene para ver qué te falta comprar.</div>
        ) : shoppingList.length === 0 ? (
          <div className="text-[12px] text-sage">Ya tenés todo lo que necesitás en el inventario ✓</div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {shoppingList.map((entry) => (
              <span
                key={`${entry.name}-${entry.unit}`}
                className="rounded-full border border-border bg-bg px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-text"
              >
                {entry.missing}
                {entry.unit === "u." ? " u." : entry.unit} {entry.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {pickerFor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm" onClick={() => setPickerFor(null)}>
          <div
            className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="font-display text-lg text-text">
              {MEAL_LABELS[pickerFor.meal]} · {DOW_FULL[new Date(`${pickerFor.fecha}T00:00:00`).getDay()]}
            </div>
            <div className="mt-3 space-y-2">
              {weekPlan[pickerFor.fecha]?.[pickerFor.meal] && (
                <button
                  type="button"
                  onClick={() => assign(pickerFor.fecha, pickerFor.meal, null)}
                  className="w-full rounded-lg border border-rust/50 bg-rust/10 px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wide text-rust"
                >
                  Quitar comida elegida
                </button>
              )}
              {RECIPES.map((recipe) => (
                <button
                  key={recipe.title}
                  type="button"
                  onClick={() => assign(pickerFor.fecha, pickerFor.meal, recipe.title)}
                  className="w-full rounded-lg border border-border bg-bg/40 p-2.5 text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold">{recipe.title}</div>
                    <div className="font-mono text-[9px] uppercase tracking-wide text-gold">{recipe.time}</div>
                  </div>
                  <div className="mt-1 font-mono text-[9px] uppercase tracking-wide text-textMuted">
                    {recipe.kcal} kcal · {recipe.protein}g prot
                  </div>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setPickerFor(null)}
              className="mt-3 w-full rounded-lg border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-textMuted"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
