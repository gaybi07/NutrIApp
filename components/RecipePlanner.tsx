"use client";

import { useMemo, useState } from "react";
import { InventoryItem, MealKey, MEAL_LABELS, GoalMode } from "@/lib/types";
import { SECTION_HELP } from "@/lib/helpText";
import { Collapsible } from "@/components/Collapsible";
import { Cuisine, RECIPES, CUISINE_FILTERS as FILTERS } from "@/lib/recipes";

const PAGE_SIZE = 3;

/** Qué priorizar en cada receta según tu objetivo actual (calculadora) --
 * usa datos que la receta ya trae (kcal/proteína), no hace falta agregar
 * nada nuevo por receta. Sin objetivo cargado, prioriza igual que "perder"
 * (liviano, alto en proteína por caloría) porque es la opción más segura
 * por default. */
function goalScore(recipe: (typeof RECIPES)[number], modo?: GoalMode): number {
  const densidad = recipe.protein / Math.max(1, recipe.kcal);
  if (modo === "aumentar") return recipe.kcal;
  if (modo === "recomponer") return recipe.protein;
  return densidad * 1000;
}

const GOAL_CAPTION: Record<GoalMode, string> = {
  perder: "Tu objetivo es bajar de peso — priorizamos recetas con más proteína por caloría.",
  aumentar: "Tu objetivo es subir (volumen) — priorizamos recetas con más energía.",
  recomponer: "Tu objetivo es recomponer — priorizamos recetas con más proteína total.",
};

function missingCount(recipe: (typeof RECIPES)[number], available: string[]) {
  return recipe.ingredients.filter((ingredient) => !available.some((item) => item.includes(ingredient.name) || ingredient.name.includes(item))).length;
}

/** Devuelve 3 recetas de `pool` empezando en `offset`, dando la vuelta al
 * principio si no alcanzan -- así "Más sugerencias" siempre trae algo
 * distinto (o vuelve a empezar) en vez de quedarse pegado en las mismas 3. */
function pageOf<T>(pool: T[], offset: number): T[] {
  if (pool.length === 0) return [];
  const result: T[] = [];
  for (let i = 0; i < Math.min(PAGE_SIZE, pool.length); i++) result.push(pool[(offset + i) % pool.length]);
  return result;
}

export function RecipePlanner({
  items,
  consumeAmounts,
  onUseRecipe,
  dailyGoal,
  consumedKcal,
  goalMode,
}: {
  items: InventoryItem[];
  consumeAmounts: (amounts: Array<{ id: string; quantity: number }>) => void;
  onUseRecipe: (recipe: (typeof RECIPES)[number], meal: MealKey) => void;
  dailyGoal: number;
  consumedKcal: number;
  goalMode?: GoalMode;
}) {
  const remainingKcal = Math.max(0, dailyGoal - consumedKcal);
  const [cuisineFilter, setCuisineFilter] = useState<Cuisine | "todas">("todas");
  const [view, setView] = useState<"alacena" | "ideas">("alacena");
  const [selectedRecipe, setSelectedRecipe] = useState<(typeof RECIPES)[number] | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<MealKey | null>(null);
  const [pantryOffset, setPantryOffset] = useState(0);
  const [ideasOffset, setIdeasOffset] = useState(0);

  const changeCuisine = (id: Cuisine | "todas") => {
    setCuisineFilter(id);
    setPantryOffset(0);
    setIdeasOffset(0);
  };

  const selectMeal = (meal: MealKey) => {
    setSelectedMeal(meal);
    setPantryOffset(0);
    setIdeasOffset(0);
  };

  // Dos bolsas separadas: lo que ya podés cocinar con lo que tenés en la
  // Alacena (0 faltantes) vs. otras ideas que capaz requieren comprar algo --
  // pedido explícito de no mezclarlas en una sola lista (el selector de
  // arriba elige cuál de las dos se ve).
  const { pantryMatches, ideaMatches } = useMemo(() => {
    const available = items.map((item) => item.name.toLowerCase());
    const eligible = RECIPES.filter((recipe) => {
      if (selectedMeal && !recipe.meals.includes(selectedMeal)) return false;
      if (cuisineFilter !== "todas" && !recipe.tags.includes(cuisineFilter)) return false;
      return true;
    });
    const withScore = eligible.map((recipe) => ({ recipe, missing: missingCount(recipe, available), score: goalScore(recipe, goalMode) }));
    const pantry = withScore.filter((r) => r.missing === 0).sort((a, b) => b.score - a.score).map((r) => r.recipe);
    const ideas = withScore.filter((r) => r.missing > 0 && r.missing <= 2).sort((a, b) => b.score - a.score).map((r) => r.recipe);
    return { pantryMatches: pantry, ideaMatches: ideas };
  }, [items, cuisineFilter, selectedMeal, goalMode]);

  const pantrySuggestions = pageOf(pantryMatches, pantryOffset);
  const ideaSuggestions = pageOf(ideaMatches, ideasOffset);

  const getRecipeLines = (recipe: (typeof RECIPES)[number]) => recipe.ingredients.map((ingredient) => {
    const item = items.find((candidate) => candidate.unit === ingredient.unit && (candidate.name.includes(ingredient.name) || ingredient.name.includes(candidate.name)));
    return { ingredient, item, used: item ? Math.min(item.quantity, ingredient.quantity) : 0 };
  });

  const confirmRecipe = () => {
    if (!selectedRecipe || !selectedMeal) return;
    const lines = getRecipeLines(selectedRecipe);
    if (lines.some((line) => !line.item || line.item.quantity < line.ingredient.quantity)) return;
    consumeAmounts(lines.map((line) => ({ id: line.item!.id, quantity: line.ingredient.quantity })));
    onUseRecipe(selectedRecipe, selectedMeal);
    setSelectedRecipe(null);
  };

  const renderRecipeCard = (recipe: (typeof RECIPES)[number]) => (
    <div key={recipe.title} className="rounded-xl border border-border bg-bg/40 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold text-sm">{recipe.title}</div>
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-gold">{recipe.time}</div>
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        {recipe.tags.map((tag) => (
          <span key={tag} className="rounded-full border border-border bg-surface px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.10em] text-textMuted">
            {tag}
          </span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg border border-gold/20 bg-gold/10 p-2">
        <div><div className="font-mono text-[9px] uppercase text-textMuted">Aporte energético</div><div className="font-mono text-sm text-gold">{recipe.kcal} kcal</div></div>
        <div><div className="font-mono text-[9px] uppercase text-textMuted">Proteína</div><div className="font-mono text-sm text-sage">{recipe.protein} g</div></div>
      </div>
      <div className="mt-2 text-[12px] text-textMuted">{recipe.summary}</div>
      <button
        type="button"
        onClick={() => setSelectedRecipe(recipe)}
        className="mt-2 rounded-lg border border-sage/50 bg-sage/10 px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-sage"
      >
        Ver consumo y preparar
      </button>
    </div>
  );

  return (
    <Collapsible
      eyebrow="Recetas"
      title="Recetas"
      info={SECTION_HELP.recetas}
      badge={
        <div className="rounded-full border border-border bg-bg/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted">
          {pantryMatches.length + ideaMatches.length} sugerencias
        </div>
      }
    >
      <div className="mb-3 font-mono text-[11px] text-textMuted">
        Hoy llevás {consumedKcal.toLocaleString("es-AR")} de {dailyGoal.toLocaleString("es-AR")} kcal · te quedan{" "}
        <span className="text-sage">{remainingKcal.toLocaleString("es-AR")}</span> kcal
      </div>

      {goalMode && (
        <div className="mb-3 rounded-lg border border-gold/30 bg-gold/10 px-2.5 py-2 text-[11px] text-textMuted">
          🎯 {GOAL_CAPTION[goalMode]}
        </div>
      )}

      <div className="mb-3">
        <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.15em] text-textMuted">Tipo de cocina</label>
        <select value={cuisineFilter} onChange={(event) => changeCuisine(event.target.value as Cuisine | "todas")} className="w-full">
          <option value="todas">Todas las cocinas</option>
          {FILTERS.map((filter) => (
            <option key={filter.id} value={filter.id}>
              {filter.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3 rounded-xl border border-gold/30 bg-gold/10 p-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-gold mb-2">¿Para qué comida buscás?</div>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(MEAL_LABELS).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => selectMeal(key as MealKey)}
              className={`rounded-lg border px-2 py-2 text-[11px] font-semibold ${selectedMeal === key ? "border-gold bg-gold text-bg" : "border-border bg-bg/60 text-textMuted"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 && (
        <div className="mb-3 rounded-xl border border-dashed border-border p-3 text-[11px] text-textMuted">
          Cargá productos en Alacena para activar sugerencias reales.
        </div>
      )}

      {selectedMeal ? (
        <div>
          <div className="mb-3 inline-flex rounded-full border border-border bg-bg/60 p-0.5">
            <button
              type="button"
              onClick={() => setView("alacena")}
              className={`rounded-full px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-wide ${
                view === "alacena" ? "bg-gold text-bg" : "text-textMuted"
              }`}
            >
              Con tu alacena
              {pantryMatches.length > 0 ? ` (${pantryMatches.length})` : ""}
            </button>
            <button
              type="button"
              onClick={() => setView("ideas")}
              className={`rounded-full px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-wide ${
                view === "ideas" ? "bg-gold text-bg" : "text-textMuted"
              }`}
            >
              Otras ideas
              {ideaMatches.length > 0 ? ` (${ideaMatches.length})` : ""}
            </button>
          </div>

          {view === "alacena" ? (
            <div>
              <div className="mb-2 flex items-center justify-end">
                {pantryMatches.length > PAGE_SIZE && (
                  <button
                    type="button"
                    onClick={() => setPantryOffset((prev) => (prev + PAGE_SIZE) % pantryMatches.length)}
                    className="font-mono text-[9px] uppercase tracking-wide text-gold underline"
                  >
                    Más sugerencias
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {pantrySuggestions.length > 0 ? (
                  pantrySuggestions.map(renderRecipeCard)
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-3 text-[12px] text-textMuted">
                    Con lo que tenés cargado hoy no completás ninguna receta entera — mirá "Otras ideas".
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-2 flex items-center justify-end">
                {ideaMatches.length > PAGE_SIZE && (
                  <button
                    type="button"
                    onClick={() => setIdeasOffset((prev) => (prev + PAGE_SIZE) % ideaMatches.length)}
                    className="font-mono text-[9px] uppercase tracking-wide text-gold underline"
                  >
                    Más sugerencias
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {ideaSuggestions.length > 0 ? (
                  ideaSuggestions.map(renderRecipeCard)
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-3 text-[12px] text-textMuted">
                    Probá con otros filtros para ver más ideas.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-3 text-[12px] text-textMuted">Elegí primero desayuno, almuerzo, merienda o cena para ver sugerencias.</div>
      )}
      {selectedRecipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm" onClick={() => setSelectedRecipe(null)}>
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="font-display text-xl text-text">{selectedRecipe.title}</div>
            <div className="mt-1 text-[11px] text-textMuted">Una porción. Revisá el inventario antes de descontar.</div>
            <label className="mt-3 block">¿Para qué comida?</label>
            <select value={selectedMeal || ""} onChange={(event) => setSelectedMeal(event.target.value as MealKey)} className="mt-1 w-full">
              {Object.entries(MEAL_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
            <div className="mt-2 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-[11px] text-textMuted">
              Se cargará como {selectedMeal ? MEAL_LABELS[selectedMeal].toLowerCase() : "comida seleccionada"}: {selectedRecipe.kcal} kcal y {selectedRecipe.protein} g de proteína.
            </div>
            <div className="mt-3 space-y-2">
              {getRecipeLines(selectedRecipe).map(({ ingredient, item, used }) => (
                <div key={ingredient.name} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg/40 p-2 text-[11px]">
                  <span className="text-text">{ingredient.name}: {ingredient.quantity} {ingredient.unit}</span>
                  <span className={item && item.quantity >= ingredient.quantity ? "text-sage" : "text-rust"}>
                    {item ? `${item.quantity} -> ${Math.max(0, item.quantity - used)} ${item.unit}` : "faltante"}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setSelectedRecipe(null)} className="rounded-lg border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-textMuted">Cancelar</button>
              <button
                type="button"
                onClick={confirmRecipe}
                disabled={getRecipeLines(selectedRecipe).some((line) => !line.item || line.item.quantity < line.ingredient.quantity)}
                className="rounded-lg border border-sage/50 bg-sage/10 px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-sage disabled:cursor-not-allowed disabled:opacity-40"
              >
                Confirmar consumo
              </button>
            </div>
          </div>
        </div>
      )}
    </Collapsible>
  );
}
