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
 * llamarla la próxima vez que aparezca el mismo alimento -- y si ya existe,
 * suma el uso (así una fila "aprendido_ia" puede llegar a los 3 usos que
 * pide resolveMealFromFoods para confiar en ella sin estar verificada) o la
 * promueve a verificada si esta lectura es de mejor calidad (ej. una
 * etiqueta real después de una estimación de la IA). Nunca pisa ni
 * degrada una fila que YA está verificada -- ni lo intenta: la política de
 * RLS de la tabla (`foods_update ... using (origen='aprendido_ia' and
 * verificado=false)`) la rechazaría igual. Fire-and-forget: un error acá no
 * debe afectar la respuesta que ya se le mandó al usuario. */
export async function learnFoods(entries: LearnFoodInput[]): Promise<void> {
  const client = getFoodsClient();
  const valid = entries.filter((e) => e.nombre && Number.isFinite(e.kcal) && e.kcal > 0);
  if (!client || valid.length === 0) return;
  try {
    const keys = Array.from(new Set(valid.map((e) => foodKey(e.nombre))));
    const { data: existingRows } = await client.from("foods").select("nombre_key, veces_usado, verificado").in("nombre_key", keys);
    const existing = new Map((existingRows || []).map((r) => [String(r.nombre_key), r]));

    const toInsert: Record<string, unknown>[] = [];
    const insertedThisCall = new Set<string>();
    for (const e of valid) {
      const key = foodKey(e.nombre);
      if (insertedThisCall.has(key)) continue; // mismo alimento repetido en esta tanda -- ya se va a insertar una vez
      const row = existing.get(key);
      const base = {
        nombre: e.nombre,
        kcal: e.kcal,
        protein: e.protein,
        carbs: e.carbs,
        fat: e.fat,
        fiber: e.fiber,
        gramos_por_unidad: e.gramosPorUnidad ?? undefined,
      };

      if (!row) {
        insertedThisCall.add(key);
        toInsert.push({
          ...base,
          nombre_key: key,
          gramos_por_unidad: e.gramosPorUnidad ?? null,
          origen: e.origen ?? "aprendido_ia",
          verificado: e.verificado ?? false,
          veces_usado: 1,
        });
        continue;
      }
      if (row.verificado) continue; // ya es la fuente de verdad -- no tocar

      const nextVecesUsado = Number(row.veces_usado ?? 0) + 1;
      const patch: Record<string, unknown> = e.verificado
        ? { ...base, verificado: true, origen: e.origen ?? "aprendido_ia" }
        : { veces_usado: nextVecesUsado, ...(e.gramosPorUnidad != null ? { gramos_por_unidad: e.gramosPorUnidad } : {}) };
      await client.from("foods").update(patch).eq("nombre_key", key);
      existing.set(key, { ...row, veces_usado: nextVecesUsado, verificado: e.verificado ? true : row.verificado });
    }

    if (toInsert.length > 0) await client.from("foods").insert(toInsert);
  } catch (e) {
    console.error("Error guardando en foods", e);
  }
}
