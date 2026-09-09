"use client";

import { useMemo, useState } from "react";
import { InventoryItem, MealKey, MEAL_LABELS } from "@/lib/types";

type RecipeIngredient = { name: string; quantity: number; unit: InventoryItem["unit"] };

type Cuisine =
  | "asiatico"
  | "americano"
  | "frances"
  | "rapida"
  | "mediterraneo"
  | "saludable";

const FILTERS: { id: Cuisine; label: string }[] = [
  { id: "asiatico", label: "Asiático" },
  { id: "americano", label: "Americano" },
  { id: "frances", label: "Francés" },
  { id: "rapida", label: "Rápida" },
  { id: "mediterraneo", label: "Mediterránea" },
  { id: "saludable", label: "Saludable" },
];

const RECIPES: Array<{
  title: string;
  cuisine: Cuisine;
  tags: string[];
  ingredients: RecipeIngredient[];
  time: string;
  summary: string;
  kcal: number;
  protein: number;
}> = [
  {
    title: "Bowl de pollo con arroz y verduras",
    cuisine: "asiatico",
    tags: ["asiatico", "saludable", "rapida"],
    ingredients: [{ name: "pollo", quantity: 300, unit: "g" }, { name: "arroz", quantity: 80, unit: "g" }, { name: "brocoli", quantity: 150, unit: "g" }, { name: "cebolla", quantity: 80, unit: "g" }, { name: "salsa de soja", quantity: 15, unit: "ml" }],
    time: "20 min",
    summary: "Equilibrado, alto en proteína y muy práctico para el trabajo.",
    kcal: 620,
    protein: 48,
  },
  {
    title: "Salteado de tofu y vegetales",
    cuisine: "asiatico",
    tags: ["asiatico", "mediterraneo", "saludable"],
    ingredients: [{ name: "tofu", quantity: 200, unit: "g" }, { name: "pimiento", quantity: 100, unit: "g" }, { name: "cebolla", quantity: 80, unit: "g" }, { name: "espinaca", quantity: 80, unit: "g" }, { name: "soja", quantity: 15, unit: "ml" }],
    time: "18 min",
    summary: "Muy bueno si querés algo ligero y rico en vegetales.",
    kcal: 420,
    protein: 28,
  },
  {
    title: "Pollo al horno con papas y tomate",
    cuisine: "americano",
    tags: ["americano", "saludable"],
    ingredients: [{ name: "pollo", quantity: 300, unit: "g" }, { name: "papa", quantity: 300, unit: "g" }, { name: "tomate", quantity: 150, unit: "g" }, { name: "cebolla", quantity: 80, unit: "g" }],
    time: "35 min",
    summary: "Simple, contundente y fácil de repetir varias noches.",
    kcal: 680,
    protein: 52,
  },
  {
    title: "Tacos de pollo con ensalada",
    cuisine: "americano",
    tags: ["americano", "rapida"],
    ingredients: [{ name: "pollo", quantity: 250, unit: "g" }, { name: "tomate", quantity: 120, unit: "g" }, { name: "cebolla", quantity: 60, unit: "g" }, { name: "pimiento", quantity: 80, unit: "g" }],
    time: "15 min",
    summary: "Ideal para usar lo que tenés a mano y no complicarte.",
    kcal: 540,
    protein: 42,
  },
  {
    title: "Salmon con quinoa y espinaca",
    cuisine: "frances",
    tags: ["frances", "saludable"],
    ingredients: [{ name: "salmon", quantity: 250, unit: "g" }, { name: "quinoa", quantity: 80, unit: "g" }, { name: "espinaca", quantity: 80, unit: "g" }, { name: "tomate", quantity: 120, unit: "g" }],
    time: "25 min",
    summary: "Opción más elegante y muy buena para una comida más completa.",
    kcal: 610,
    protein: 40,
  },
  {
    title: "Pasta con queso, tomate y espinaca",
    cuisine: "frances",
    tags: ["frances", "rapida"],
    ingredients: [{ name: "pasta", quantity: 100, unit: "g" }, { name: "queso", quantity: 40, unit: "g" }, { name: "tomate", quantity: 150, unit: "g" }, { name: "espinaca", quantity: 60, unit: "g" }],
    time: "18 min",
    summary: "Sencillo, reconfortante y muy fácil de ajustar al gusto.",
    kcal: 570,
    protein: 24,
  },
  {
    title: "Wrap rápido con huevo y vegetales",
    cuisine: "rapida",
    tags: ["rapida", "saludable"],
    ingredients: [{ name: "huevo", quantity: 2, unit: "u." }, { name: "espinaca", quantity: 60, unit: "g" }, { name: "tomate", quantity: 100, unit: "g" }, { name: "pimiento", quantity: 60, unit: "g" }],
    time: "10 min",
    summary: "Perfecto para una comida rápida y con bastante volumen.",
    kcal: 360,
    protein: 22,
  },
  {
    title: "Lentejas con verduras y huevo",
    cuisine: "mediterraneo",
    tags: ["mediterraneo", "saludable"],
    ingredients: [{ name: "lentejas", quantity: 100, unit: "g" }, { name: "huevo", quantity: 2, unit: "u." }, { name: "cebolla", quantity: 80, unit: "g" }, { name: "tomate", quantity: 120, unit: "g" }, { name: "espinaca", quantity: 60, unit: "g" }],
    time: "25 min",
    summary: "Muy rico, muy saciante y con buen aporte de proteína.",
    kcal: 520,
    protein: 30,
  },
];

export function RecipePlanner({ items, consumeAmounts, onUseRecipe }: { items: InventoryItem[]; consumeAmounts: (amounts: Array<{ id: string; quantity: number }>) => void; onUseRecipe: (recipe: (typeof RECIPES)[number], meal: MealKey) => void }) {
  const [selectedFilters, setSelectedFilters] = useState<Cuisine[]>(["saludable", "rapida"]);
  const [selectedRecipe, setSelectedRecipe] = useState<(typeof RECIPES)[number] | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<MealKey | null>(null);

  const toggleFilter = (id: Cuisine) => {
    setSelectedFilters((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const suggestions = useMemo(() => {
    const available = items.map((item) => item.name.toLowerCase());

    return RECIPES.filter((recipe) => {
      if (selectedFilters.length > 0 && !selectedFilters.some((filter) => recipe.tags.includes(filter))) {
        return false;
      }

      const missing = recipe.ingredients.filter((ingredient) => !available.some((item) => item.includes(ingredient.name) || ingredient.name.includes(item)));
      return missing.length <= 2;
    }).slice(0, 3);
  }, [items, selectedFilters]);

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

  return (
    <div className="mb-5 rounded-2xl border border-border bg-surface/70 p-3 shadow-[0_0_0_1px_rgba(58,54,47,0.4)]">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Recetas</div>
          <div className="font-display text-xl leading-none -tracking-[0.04em]">Planner de cocina</div>
        </div>
        <div className="rounded-full border border-border bg-bg/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted">
          {suggestions.length} sugerencias
        </div>
      </div>

      <div className="mb-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-textMuted mb-2">Tipos de cocina</div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => {
            const active = selectedFilters.includes(filter.id);
            return (
              <button
                key={filter.id}
                onClick={() => toggleFilter(filter.id)}
                className={`rounded-full border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors ${
                  active ? "border-gold bg-gold text-bg" : "border-border bg-bg/60 text-textMuted"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-3 rounded-xl border border-gold/30 bg-gold/10 p-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-gold mb-2">¿Para qué comida buscás?</div>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(MEAL_LABELS).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedMeal(key as MealKey)}
              className={`rounded-lg border px-2 py-2 text-[11px] font-semibold ${selectedMeal === key ? "border-gold bg-gold text-bg" : "border-border bg-bg/60 text-textMuted"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-textMuted mb-2">Heladera / alacena</div>
        <div className="grid grid-cols-2 gap-2">
          {items.length > 0 ? items.map((item) => (
            <div key={item.id} className="rounded-xl border border-sage/60 bg-sage/10 px-2 py-2 text-left font-mono text-[11px] text-text">
              {item.name} <span className="text-gold">× {item.quantity} {item.unit}</span>
            </div>
          )) : <div className="col-span-2 rounded-xl border border-dashed border-border p-3 text-[11px] text-textMuted">Cargá productos desde Compras para activar sugerencias reales.</div>}
        </div>
      </div>

      {selectedMeal ? <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-textMuted mb-2">Sugerencias</div>
        <div className="space-y-2">
          {suggestions.length > 0 ? (
            suggestions.map((recipe) => (
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
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-border p-3 text-[12px] text-textMuted">
              Probá con otros ingredientes o filtros para obtener más recetas.
            </div>
          )}
        </div>
      </div> : <div className="rounded-xl border border-dashed border-border p-3 text-[12px] text-textMuted">Elegí primero desayuno, almuerzo, merienda o cena para ver sugerencias.</div>}
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
    </div>
  );
}
