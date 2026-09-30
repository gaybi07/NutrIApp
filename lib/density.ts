import { DayEntry, DayMealOptions, MealKey, MealOption, MealOptionIngredient } from "@/lib/types";
import { getMealItems } from "@/lib/calculations";

/**
 * Densidades de lo que se come: cuánta proteína hay cada 100 g de comida y cuántas kcal por gramo (densidad
 * calórica: más baja = más volumen y saciedad por caloría). El objetivo sale de lo que implica el plan de la
 * Nutricionista para el día; si no hay plan con cantidades, no hay objetivo y no se muestra nada.
 */
export interface Density {
  proteinPer100g: number;
  kcalPerG: number;
  grams: number;
}

// Peso aproximado de una unidad, por nombre de ingrediente (cuando el ingrediente viene en "u.").
const UNIT_GRAMS: [RegExp, number][] = [
  [/clara/i, 33],
  [/huevo/i, 50],
  [/banana/i, 100],
  [/manzana/i, 150],
  [/mandarina/i, 80],
  [/naranja/i, 130],
  [/kiwi/i, 75],
  [/durazno/i, 130],
  [/fruta/i, 120],
  [/galletas? de arroz/i, 10],
  [/galletitas/i, 15],
  [/medialuna/i, 60],
  [/factura/i, 50],
  [/alfajor/i, 45],
  [/empanada/i, 90],
  [/pizza/i, 120],
  [/barra de cereal/i, 25],
  [/hamburguesa con pan/i, 200],
  [/tarta/i, 180],
];

export function ingredientGrams(ing: MealOptionIngredient): number {
  if (ing.unit === "g" || ing.unit === "ml") return ing.quantity;
  const found = UNIT_GRAMS.find(([re]) => re.test(ing.name));
  return ing.quantity * (found ? found[1] : 60);
}

/** Peso total aproximado de una opción del plan (null si no trae ingredientes con cantidad). */
export function optionGrams(option: MealOption): number | null {
  if (!option.ingredientes || option.ingredientes.length === 0) return null;
  return Math.round(option.ingredientes.reduce((sum, ing) => sum + ingredientGrams(ing), 0));
}

function density(protein: number, kcal: number, grams: number): Density | null {
  if (grams <= 0 || kcal <= 0) return null;
  return {
    proteinPer100g: Math.round((protein / grams) * 1000) / 10,
    kcalPerG: Math.round((kcal / grams) * 100) / 100,
    grams: Math.round(grams),
  };
}

/** Objetivo del día: densidad de lo que planificó la Nutricionista (lo que eligió el paciente, o la opción A). */
export function planDayDensity(day: DayMealOptions | undefined, chosen?: Partial<Record<MealKey, string>>): Density | null {
  if (!day) return null;
  let protein = 0;
  let kcal = 0;
  let grams = 0;
  for (const meal of Object.keys(day) as MealKey[]) {
    const options = day[meal];
    if (!options || options.length === 0) continue;
    const option = options.find((o) => o.nombre === chosen?.[meal]) ?? options[0];
    const g = optionGrams(option);
    if (g == null) continue;
    protein += option.protein;
    kcal += option.kcal;
    grams += g;
  }
  return density(protein, kcal, grams);
}

/** Densidad real de lo cargado hoy: solo cuenta las comidas donde TODOS los items tienen gramos cargados. */
export function entryDensity(entry: DayEntry): Density | null {
  let protein = 0;
  let kcal = 0;
  let grams = 0;
  for (const meal of ["des", "alm", "mer", "cen", "col"] as MealKey[]) {
    const items = getMealItems(entry, meal);
    if (items.length === 0 || items.some((i) => !i.gramos || i.gramos <= 0)) continue;
    for (const item of items) {
      protein += item.protein;
      kcal += item.kcal;
      grams += item.gramos!;
    }
  }
  return density(protein, kcal, grams);
}
