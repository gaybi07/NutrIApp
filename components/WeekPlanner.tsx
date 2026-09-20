"use client";

import { useEffect, useMemo, useState } from "react";
import { InventoryItem, MealKey, MEAL_LABELS, WeekPlan } from "@/lib/types";
import { isoMonday, addDays, fmtDate } from "@/lib/calculations";
import { Recipe, RECIPES } from "@/lib/recipes";
import { inventoryKey } from "@/lib/useInventory";
import { useMealMemory, MealMemoryEntry } from "@/lib/useMealMemory";
import { SECTION_HELP } from "@/lib/helpText";
import { InfoHint } from "@/components/InfoHint";

const DOW_FULL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MEAL_KEYS: MealKey[] = ["des", "alm", "mer", "cen", "col"];
// La colación es lo único opcional -- estas 4 son las que cuentan para
// "¿ya planificaste el día?" (el ✓/N-sobre-4 de cada fila y el aviso de
// "falta planificar" del grupo).
const REQUIRED_MEAL_KEYS: MealKey[] = ["des", "alm", "mer", "cen"];
const MAX_PICKER_SUGGESTIONS = 6;
const MAX_PERSONAL_SUGGESTIONS = 4;

// Sentinel guardado en el mismo lugar que un título de receta -- para no
// tener que sumar una estructura de datos paralela (ni una migración) solo
// para marcar "esto no lo voy a planificar" (ej. viaje, día que como afuera).
// No matchea ninguna receta real, así que no suma nada a la lista de
// compras ni se puede confundir con un título elegido de verdad.
export const SKIP_MEAL = "__skip__";
function isFilled(value: string | undefined): boolean {
  return !!value && value !== SKIP_MEAL;
}
function isSkipped(value: string | undefined): boolean {
  return value === SKIP_MEAL;
}

// Match más permisivo que un simple includes() para nombres compuestos --
// "milanesas con puré" vs. "milanesa de carne" no son substring uno del
// otro, pero comparten la palabra con la que vale la pena avisar ("milanesa"
// / "milanesas", singular/plural). Se compara palabra por palabra (>= 4
// letras, para no engancharse con "de"/"con"/etc.) además del substring
// directo entre las dos frases completas.
function fuzzyNameMatch(a: string, b: string): boolean {
  if (a.includes(b) || b.includes(a)) return true;
  const wordsA = a.split(" ").filter((w) => w.length >= 4);
  const wordsB = b.split(" ").filter((w) => w.length >= 4);
  return wordsA.some((wa) => wordsB.some((wb) => wa.includes(wb) || wb.includes(wa)));
}

function shortTitle(title: string) {
  return title.length > 24 ? `${title.slice(0, 22)}…` : title;
}

/** Los 7 días de la semana calendario siguiente a la actual (lunes a domingo). */
export function getNextWeekDates(): string[] {
  const thisMonday = isoMonday(fmtDate(new Date()));
  const nextMonday = addDays(thisMonday, 7);
  return [...Array(7)].map((_, i) => fmtDate(addDays(nextMonday, i)));
}

/** Cuántas comidas ya están elegidas (con receta de verdad, sin contar las marcadas "no planificar") para la semana que viene — para mostrar en el botón de entrada. */
export function countPlannedMeals(weekPlan: WeekPlan): number {
  const dates = getNextWeekDates();
  let count = 0;
  for (const fecha of dates) {
    const dayPlan = weekPlan[fecha];
    if (!dayPlan) continue;
    count += MEAL_KEYS.filter((meal) => isFilled(dayPlan[meal])).length;
  }
  return count;
}

/** Si ya se tocó algo de la semana que viene (comida elegida o marcada
 * "no planificar") -- a diferencia de countPlannedMeals, una semana toda
 * marcada como "no planificar" (ej. un viaje) cuenta como resuelta, para no
 * seguir avisando "falta planificar" cuando en realidad ya se decidió que
 * no hace falta. */
export function hasWeekActivity(weekPlan: WeekPlan): boolean {
  const dates = getNextWeekDates();
  for (const fecha of dates) {
    const dayPlan = weekPlan[fecha];
    if (!dayPlan) continue;
    if (REQUIRED_MEAL_KEYS.some((meal) => dayPlan[meal] !== undefined)) return true;
  }
  return false;
}

function DayPlanRow({
  fecha,
  dayPlan,
  onPick,
}: {
  fecha: string;
  dayPlan: Partial<Record<MealKey, string>>;
  onPick: (meal: MealKey) => void;
}) {
  const complete = REQUIRED_MEAL_KEYS.every((meal) => dayPlan[meal] !== undefined);
  const [open, setOpen] = useState(!complete);

  useEffect(() => {
    if (complete) setOpen(false);
  }, [complete]);

  const date = new Date(`${fecha}T00:00:00`);
  const resolvedCount = REQUIRED_MEAL_KEYS.filter((meal) => dayPlan[meal] !== undefined).length;

  return (
    <div className="rounded-xl border border-border bg-bg/40 p-2.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-gold">
          {DOW_FULL[date.getDay()]} {date.getDate()} {MONTHS[date.getMonth()]}
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-mono text-[9px] uppercase tracking-wide ${complete ? "text-sage" : "text-textMuted"}`}>
            {complete ? "✓" : `${resolvedCount}/${REQUIRED_MEAL_KEYS.length}`}
          </span>
          <span className="font-mono text-[10px] text-textMuted transition-transform" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
            ▾
          </span>
        </div>
      </button>
      {open && (
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          {MEAL_KEYS.map((meal) => {
            const value = dayPlan[meal];
            const filled = isFilled(value);
            const skipped = isSkipped(value);
            return (
              <button
                key={meal}
                type="button"
                onClick={() => onPick(meal)}
                className={`rounded-lg border px-2 py-1.5 text-left font-mono text-[9.5px] uppercase tracking-wide ${
                  filled
                    ? "border-sage/50 bg-sage/10 text-sage"
                    : skipped
                      ? "border-border bg-bg/20 text-textMuted line-through opacity-60"
                      : "border-dashed border-border text-textMuted"
                }`}
              >
                <div className="text-[8.5px] opacity-70 no-underline">
                  {MEAL_LABELS[meal]}
                  {meal === "col" && !filled && !skipped && " (opcional)"}
                </div>
                <div className="mt-0.5 normal-case tracking-normal text-[11px]">
                  {filled ? shortTitle(value as string) : skipped ? "✕ No planificado" : "+ Elegir"}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
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
  const [customText, setCustomText] = useState("");
  const [showExport, setShowExport] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const { memory: mealMemory } = useMealMemory();

  useEffect(() => {
    setCustomText("");
  }, [pickerFor]);

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

  // Comidas planificadas que NO son del catálogo (escritas a mano o elegidas
  // de "tu memoria") no tienen ingredientes con cantidad, así que no se
  // pueden sumar a shoppingList -- pero si el nombre coincide con algo de la
  // alacena y queda poco o nada, vale la pena avisar igual, aunque sea sin
  // número exacto (no sabemos cuánto necesita esa comida puntual).
  const reviewList = useMemo(() => {
    const titles = new Set<string>();
    for (const fecha of nextWeekDates) {
      const dayPlan = weekPlan[fecha];
      if (!dayPlan) continue;
      for (const meal of MEAL_KEYS) {
        const title = dayPlan[meal];
        if (!isFilled(title)) continue;
        if (RECIPES.some((r) => r.title === title)) continue;
        titles.add(title as string);
      }
    }
    return Array.from(titles)
      .map((title) => {
        const key = inventoryKey(title);
        const stock = items.find((item) => fuzzyNameMatch(key, inventoryKey(item.name)));
        if (!stock) return { title, note: "no está en tu alacena" };
        const lowThreshold = stock.unit === "u." ? 2 : 200;
        if (stock.quantity > lowThreshold) return null;
        return { title, note: `tenés ${stock.quantity}${stock.unit === "u." ? " u." : stock.unit}, puede no alcanzar` };
      })
      .filter((entry): entry is { title: string; note: string } => entry !== null);
  }, [weekPlan, nextWeekDates, items]);

  const plannedCount = selectedRecipes.length;
  const totalPlannedCount = useMemo(() => countPlannedMeals(weekPlan), [weekPlan]);

  const shoppingListText = useMemo(() => {
    if (shoppingList.length === 0 && reviewList.length === 0) return "";
    const start = new Date(`${nextWeekDates[0]}T00:00:00`);
    const end = new Date(`${nextWeekDates[6]}T00:00:00`);
    const header = `Lista de compras — semana del ${start.getDate()} ${MONTHS[start.getMonth()]} al ${end.getDate()} ${MONTHS[end.getMonth()]}`;
    const lines = shoppingList.map((entry) => `- ${entry.missing}${entry.unit === "u." ? " u." : entry.unit} ${entry.name}`);
    const reviewLines =
      reviewList.length > 0
        ? ["", "A revisar (sin cantidad exacta):", ...reviewList.map((entry) => `- ${entry.title} (${entry.note})`)]
        : [];
    return [header, "", ...lines, ...reviewLines].join("\n");
  }, [shoppingList, reviewList, nextWeekDates]);

  const copyShoppingList = async () => {
    if (!shoppingListText) return;
    try {
      await navigator.clipboard.writeText(shoppingListText);
      setCopyStatus("Copiado al portapapeles ✓ — pegalo donde lo necesites.");
    } catch {
      setCopyStatus("No pude copiar solo — seleccioná el texto de arriba a mano y copialo.");
    }
  };

  const personalSuggestions: MealMemoryEntry[] = useMemo(() => {
    if (!pickerFor) return [];
    return mealMemory.filter((h) => h.meal === pickerFor.meal && h.kcal > 0).slice(0, MAX_PERSONAL_SUGGESTIONS);
  }, [mealMemory, pickerFor]);

  const catalogSuggestions: Recipe[] = useMemo(() => {
    if (!pickerFor) return [];
    return RECIPES.filter((r) => r.meals.includes(pickerFor.meal)).slice(0, Math.max(0, MAX_PICKER_SUGGESTIONS - personalSuggestions.length));
  }, [pickerFor, personalSuggestions.length]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center font-display text-xl leading-none -tracking-[0.04em]">
          Semana que viene
          <InfoHint text={SECTION_HELP.planificador} label="Qué es el Planificador" />
        </div>
        <div className="rounded-full border border-border bg-bg/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted">
          {totalPlannedCount} {totalPlannedCount === 1 ? "comida" : "comidas"}
        </div>
      </div>

      <div className="space-y-2">
        {nextWeekDates.map((fecha) => (
          <DayPlanRow
            key={fecha}
            fecha={fecha}
            dayPlan={weekPlan[fecha] || {}}
            onPick={(meal) => setPickerFor({ fecha, meal })}
          />
        ))}
      </div>

      <div className="mt-3 rounded-xl border border-gold/30 bg-gold/10 p-3">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-gold">Lista de compras de la semana</div>
        {totalPlannedCount === 0 ? (
          <div className="text-[12px] text-textMuted">Elegí recetas para los días de la semana que viene para ver qué te falta comprar.</div>
        ) : shoppingList.length === 0 && reviewList.length === 0 ? (
          plannedCount === 0 ? (
            <div className="text-[12px] text-textMuted">
              Lo que elegiste es de tu memoria personal, sin lista de ingredientes — no hay nada que sumar todavía. Elegí
              alguna receta del catálogo para que se arme la lista.
            </div>
          ) : (
            <div className="text-[12px] text-sage">Ya tenés todo lo que necesitás en el inventario ✓</div>
          )
        ) : (
          <>
            {shoppingList.length > 0 && (
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
            {reviewList.length > 0 && (
              <div className={`flex flex-wrap gap-1.5 ${shoppingList.length > 0 ? "mt-2" : ""}`}>
                {reviewList.map((entry) => (
                  <span
                    key={entry.title}
                    className="rounded-full border border-rust/50 bg-rust/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-rust"
                  >
                    ⚠ Revisar: {entry.title} ({entry.note})
                  </span>
                ))}
              </div>
            )}
          </>
        )}

        {(shoppingList.length > 0 || reviewList.length > 0) && (
          <div className="mt-3 border-t border-dashed border-gold/30 pt-2.5">
            <button
              type="button"
              onClick={() => {
                setShowExport((prev) => !prev);
                setCopyStatus("");
              }}
              className="w-full rounded-lg border border-gold/60 bg-gold/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-gold"
            >
              {showExport ? "Ocultar" : "📤 Exportar lista"}
            </button>
            {showExport && (
              <div className="mt-2">
                <textarea
                  readOnly
                  rows={Math.min(20, shoppingListText.split("\n").length)}
                  value={shoppingListText}
                  onFocus={(event) => event.target.select()}
                  className="w-full font-mono text-[10px]"
                />
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={copyShoppingList}
                    className="rounded-lg border border-gold/60 bg-gold px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-bg"
                  >
                    Copiar texto
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(shoppingListText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-sage/50 bg-sage/10 px-3 py-2 text-center font-mono text-[10px] uppercase tracking-wide text-sage"
                  >
                    Enviar por WhatsApp
                  </a>
                </div>
                {copyStatus && <div className="mt-1.5 text-[11px] text-textMuted">{copyStatus}</div>}
              </div>
            )}
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
            <div className="mt-3">
              <label className="mb-1 block">Agregar algo distinto</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={customText}
                  onChange={(event) => setCustomText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && customText.trim()) assign(pickerFor.fecha, pickerFor.meal, customText.trim());
                  }}
                  placeholder="Ej: Tarta de jamón y queso"
                  className="flex-1"
                />
                <button
                  type="button"
                  disabled={!customText.trim()}
                  onClick={() => assign(pickerFor.fecha, pickerFor.meal, customText.trim())}
                  className="shrink-0 rounded-lg border border-gold/60 bg-gold px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-bg disabled:opacity-40"
                >
                  + Agregar
                </button>
              </div>
              <div className="mt-1 text-[10px] text-textMuted">
                No suma a la lista de compras (no sabemos los ingredientes de algo escrito a mano) — para eso, elegí una receta del catálogo de abajo.
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {(() => {
                const currentValue = weekPlan[pickerFor.fecha]?.[pickerFor.meal];
                if (isSkipped(currentValue)) {
                  return (
                    <button
                      type="button"
                      onClick={() => assign(pickerFor.fecha, pickerFor.meal, null)}
                      className="w-full rounded-lg border border-border px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wide text-textMuted"
                    >
                      Deshacer "no planificar"
                    </button>
                  );
                }
                return (
                  <>
                    {currentValue && (
                      <button
                        type="button"
                        onClick={() => assign(pickerFor.fecha, pickerFor.meal, null)}
                        className="w-full rounded-lg border border-rust/50 bg-rust/10 px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wide text-rust"
                      >
                        Quitar comida elegida
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => assign(pickerFor.fecha, pickerFor.meal, SKIP_MEAL)}
                      className="w-full rounded-lg border border-border bg-bg/40 px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wide text-textMuted"
                    >
                      No voy a planificar esto (ej. viaje)
                    </button>
                  </>
                );
              })()}

              {personalSuggestions.length === 0 && catalogSuggestions.length === 0 && (
                <div className="rounded-lg border border-dashed border-border p-3 text-[12px] text-textMuted">
                  Todavía no hay recetas ni comidas guardadas para {MEAL_LABELS[pickerFor.meal].toLowerCase()}.
                </div>
              )}

              {personalSuggestions.map((entry) => (
                <button
                  key={`mem-${entry.text}`}
                  type="button"
                  onClick={() => assign(pickerFor.fecha, pickerFor.meal, entry.text)}
                  className="w-full rounded-lg border border-sage/40 bg-sage/10 p-2.5 text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold">{entry.text}</div>
                    <div className="font-mono text-[9px] uppercase tracking-wide text-sage">tu memoria</div>
                  </div>
                  <div className="mt-1 font-mono text-[9px] uppercase tracking-wide text-textMuted">
                    {entry.kcal} kcal · {entry.protein}g prot
                  </div>
                </button>
              ))}

              {catalogSuggestions.map((recipe) => (
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
            {(personalSuggestions.length > 0 || catalogSuggestions.length > 0) && (
              <div className="mt-2 text-[10px] text-textMuted">
                Las recetas del catálogo suman a la lista de compras; lo de tu memoria no (no sabemos los ingredientes exactos).
              </div>
            )}
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
