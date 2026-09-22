import { createClient } from "@supabase/supabase-js";
import { foodKey } from "./foodText";

// Cliente aparte, igual que lib/aiCache.ts -- la tabla foods es global, sin
// usuario, no necesita el contexto de sesión/cookies del resto de la app.
function getFoodsClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export type FoodOrigin = "seed_curado" | "aprendido_ia" | "off";

export interface FoodRow {
  nombre: string;
  nombreKey: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  gramosPorUnidad?: number;
  origen: FoodOrigin;
  verificado: boolean;
  vecesUsado: number;
}

function rowFromDb(row: Record<string, unknown>): FoodRow {
  return {
    nombre: String(row.nombre),
    nombreKey: String(row.nombre_key),
    kcal: Number(row.kcal),
    protein: Number(row.protein),
    carbs: Number(row.carbs),
    fat: Number(row.fat),
    fiber: Number(row.fiber),
    gramosPorUnidad: row.gramos_por_unidad != null ? Number(row.gramos_por_unidad) : undefined,
    origen: row.origen as FoodOrigin,
    verificado: Boolean(row.verificado),
    vecesUsado: Number(row.veces_usado ?? 0),
  };
}

/** Busca alimentos por nombre (normalizado con foodKey) en una sola query.
 * Si falla la conexión, devuelve un Map vacío en vez de romper el flujo --
 * esto es un atajo para ahorrar IA, nunca algo que la respuesta dependa de
 * que funcione. */
export async function lookupFoods(names: string[]): Promise<Map<string, FoodRow>> {
  const client = getFoodsClient();
  const keys = Array.from(new Set(names.map(foodKey))).filter(Boolean);
  if (!client || keys.length === 0) return new Map();
  try {
    const { data, error } = await client.from("foods").select("*").in("nombre_key", keys);
    if (error || !data) return new Map();
    const map = new Map<string, FoodRow>();
    data.forEach((row) => map.set(String(row.nombre_key), rowFromDb(row)));
    return map;
  } catch {
    return new Map();
  }
}

export interface LearnFoodInput {
  nombre: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  gramosPorUnidad?: number;
  origen?: FoodOrigin;
  verificado?: boolean;
}

/** Da de alta lo que la IA acaba de calcular, para no tener que volver a
 * llamarla la próxima vez que aparezca el mismo alimento. Nunca pisa una
 * fila que ya existe (ignoreDuplicates) -- una estimación nueva no debe
 * degradar una fila curada/verificada o ya aprendida antes. Fire-and-forget:
 * un error acá no debe afectar la respuesta que ya se le mandó al usuario. */
export async function learnFoods(entries: LearnFoodInput[]): Promise<void> {
  const client = getFoodsClient();
  if (!client || entries.length === 0) return;
  try {
    const rows = entries
      .filter((e) => e.nombre && Number.isFinite(e.kcal) && e.kcal > 0)
      .map((e) => ({
        nombre: e.nombre,
        nombre_key: foodKey(e.nombre),
        kcal: e.kcal,
        protein: e.protein,
        carbs: e.carbs,
        fat: e.fat,
        fiber: e.fiber,
        gramos_por_unidad: e.gramosPorUnidad ?? null,
        origen: e.origen ?? "aprendido_ia",
        verificado: e.verificado ?? false,
      }));
    if (rows.length === 0) return;
    await client.from("foods").upsert(rows, { onConflict: "nombre_key", ignoreDuplicates: true });
  } catch (e) {
    console.error("Error guardando en foods", e);
  }
}
