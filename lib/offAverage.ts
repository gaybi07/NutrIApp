import { InventoryNutrition } from "./types";

export interface OffSearchResult {
  name: string;
  brand: string | null;
  quantity: string | null;
  nutritionPer100g: InventoryNutrition;
}

// Umbral de "parecido" entre resultados de Open Food Facts (kcal), y cuántos
// tienen que agruparse cerca para confiar en el promedio -- valores pedidos
// a mano: ~10% de tolerancia, y al menos la mitad de los resultados (mínimo
// 3) tienen que coincidir. Con menos coincidencia, mejor dejarlo sin cargar
// (rojo, "falta nutrición") que promediar basura.
const CLUSTER_TOLERANCE = 0.1;
const MIN_CLUSTER_SIZE = 3;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Cuando buscás un alimento (ej. "mandarina") en Open Food Facts salen
 * varios productos distintos con valores parecidos pero no idénticos. En vez
 * de obligarte a elegir uno a mano, esto agrupa los que están cerca entre sí
 * en kcal/100g (el dato más estable, ya que proteína/carbs/grasa de un mismo
 * alimento pueden variar mucho en términos relativos sin ser "distintos"),
 * descarta los que quedan lejos (ej. un producto mal cargado en OFF, o que
 * no es en realidad el mismo alimento), y promedia el resto.
 *
 * Devuelve null si no hay un grupo lo bastante grande de resultados
 * parecidos entre sí -- en ese caso, mejor dejar la nutrición sin cargar
 * (para que el usuario la busque a mano o pase por "Revisar con IA") que
 * inventar un promedio poco confiable.
 */
export function averageNutritionCluster(results: OffSearchResult[]): InventoryNutrition | null {
  const withKcal = results.filter((r) => r.nutritionPer100g.kcal > 0);
  if (withKcal.length < MIN_CLUSTER_SIZE) return null;

  const kcals = withKcal.map((r) => r.nutritionPer100g.kcal);
  const centro = median(kcals);
  const tolerancia = centro * CLUSTER_TOLERANCE;
  const cluster = withKcal.filter((r) => Math.abs(r.nutritionPer100g.kcal - centro) <= tolerancia);

  const minimoRequerido = Math.max(MIN_CLUSTER_SIZE, Math.ceil(withKcal.length / 2));
  if (cluster.length < minimoRequerido) return null;

  const avg = (pick: (n: InventoryNutrition) => number) =>
    Math.round(cluster.reduce((sum, r) => sum + pick(r.nutritionPer100g), 0) / cluster.length);

  return {
    kcal: avg((n) => n.kcal),
    protein: avg((n) => n.protein),
    carbs: avg((n) => n.carbs),
    fat: avg((n) => n.fat),
    fiber: avg((n) => n.fiber),
  };
}

/**
 * Busca un alimento en Open Food Facts y devuelve el promedio de los
 * resultados que coinciden entre sí (ver `averageNutritionCluster`), o
 * `null` si no hay suficiente acuerdo o la búsqueda falla. Pensado para
 * completar nutrición SOLA al cargar un producto por primera vez (antes de
 * pedirle al usuario que busque a mano) -- por eso nunca tira error, ante
 * cualquier problema simplemente no completa nada.
 */
export async function estimateNutritionFromOff(name: string): Promise<InventoryNutrition | null> {
  try {
    const res = await fetch(`/api/search-off?q=${encodeURIComponent(name.trim())}`);
    if (!res.ok) return null;
    const data = await res.json();
    const results: OffSearchResult[] = Array.isArray(data.results) ? data.results : [];
    return averageNutritionCluster(results);
  } catch {
    return null;
  }
}
