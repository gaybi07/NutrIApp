import { parseInventoryText, foodKey } from "./foodText";
import { lookupFoods, learnFoods, FoodRow } from "./foodsStore";

/** Mismo formato que ya devuelve app/api/parse-meal/route.ts -- así
 * AiEntryForm no necesita ningún cambio para consumir una respuesta
 * resuelta acá en vez de por la IA. */
export interface ParseMealResponse {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  detalle: string;
  resumen: string;
  ingredientes: string;
  items: Array<{ nombre: string; kcal: number; protein: number; carbs: number; fat: number; fiber: number; gramos: number }>;
  fuente?: "foods";
}

const MIN_USES_UNVERIFIED = 3;

function macrosForEntry(food: FoodRow, quantity: number, isUnit: boolean) {
  const gramos = isUnit ? quantity * (food.gramosPorUnidad ?? 0) : quantity;
  const factor = gramos / 100;
  return {
    gramos: Math.round(gramos),
    kcal: Math.round(food.kcal * factor),
    protein: Math.round(food.protein * factor),
    carbs: Math.round(food.carbs * factor),
    fat: Math.round(food.fat * factor),
    fiber: Math.round(food.fiber * factor),
  };
}

/**
 * Intenta armar la comida completa contra la tabla `foods`, SIN llamar a la
 * IA. Política a propósito conservadora: si CUALQUIER ingrediente no
 * matchea exacto, no trae cantidad explícita, o no es lo bastante confiable
 * (verificado o con uso probado), se aborta y la ruta sigue con Gemini como
 * siempre -- peor es calcular mal un plato que gastar una llamada de IA.
 */
export async function resolveMealFromFoods(text: string): Promise<ParseMealResponse | null> {
  const parsed = parseInventoryText(text);
  if (parsed.length === 0) return null;

  const foods = await lookupFoods(parsed.map((p) => p.name));

  const resolved: Array<{ entry: (typeof parsed)[number]; food: FoodRow }> = [];
  for (const entry of parsed) {
    if (entry.needsQuantity) return null; // envase sin tamaño conocido ("un paquete de...")
    const food = foods.get(foodKey(entry.name));
    if (!food) return null;
    const trusted = food.verificado || food.vecesUsado >= MIN_USES_UNVERIFIED;
    if (!trusted) return null;
    if (entry.unit === "u." && food.gramosPorUnidad == null) return null; // no hay forma de convertir a gramos
    resolved.push({ entry, food });
  }

  const items = resolved.map(({ entry, food }) => {
    const isUnit = entry.unit === "u.";
    const { gramos, kcal, protein, carbs, fat, fiber } = macrosForEntry(food, entry.quantity, isUnit);
    return { nombre: food.nombre, kcal, protein, carbs, fat, fiber, gramos };
  });

  const totals = items.reduce(
    (acc, item) => ({
      kcal: acc.kcal + item.kcal,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
      fiber: acc.fiber + item.fiber,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );

  const resumen = items.map((i) => i.nombre).join(", ");
  return {
    ...totals,
    detalle: resumen,
    resumen,
    ingredientes: resolved
      .map(({ entry }) => `${entry.quantity} ${entry.unit} ${entry.name}`)
      .join(", "),
    items,
    fuente: "foods",
  };
}

/** A partir de la respuesta ya calculada por la IA para "parse-meal", deriva
 * filas de `foods` para aprender -- así la próxima vez que aparezca el mismo
 * alimento no hace falta llamar a la IA de nuevo. Solo aprende items con
 * gramos y kcal positivos (sin eso no se puede pasar a "por 100 g"). Si el
 * ingrediente original venía en unidades ("1 milanesa"), también deriva
 * gramos_por_unidad -- así se puebla ese dato gratis, sin pedírselo a nadie. */
export function foodsFromMealItems(
  items: Array<{ nombre: string; gramos?: number; kcal: number; protein: number; carbs?: number; fat?: number; fiber?: number }>,
  parsedIngredientes: ReturnType<typeof parseInventoryText>
): Array<{ nombre: string; kcal: number; protein: number; carbs: number; fat: number; fiber: number; gramosPorUnidad?: number }> {
  return items
    .filter((item) => item.gramos && item.gramos > 0 && item.kcal > 0)
    .map((item) => {
      const gramos = item.gramos as number;
      const factor = 100 / gramos;
      const match = parsedIngredientes.find((p) => foodKey(p.name) === foodKey(item.nombre));
      const gramosPorUnidad = match && match.unit === "u." && match.quantity > 0 ? gramos / match.quantity : undefined;
      return {
        nombre: item.nombre,
        kcal: Math.round(item.kcal * factor),
        protein: Math.round(item.protein * factor),
        carbs: Math.round((item.carbs ?? 0) * factor),
        fat: Math.round((item.fat ?? 0) * factor),
        fiber: Math.round((item.fiber ?? 0) * factor),
        gramosPorUnidad,
      };
    });
}

export { learnFoods };
