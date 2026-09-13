import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

// Cliente aparte del que usa el resto de la app (lib/supabase/server.ts,
// atado a la sesión/cookies del usuario) -- este cache es global, sin
// usuario, así que no necesita ni quiere ese contexto.
function getCacheClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Normaliza los textos adentro del input antes de hashear (no lo que se le
// manda de verdad a la IA) para que "2 Huevos Y una Tostada" y "2 huevos y
// una tostada" caigan en la misma entrada de cache.
function normalizeForHash(value: unknown): string {
  return JSON.stringify(value, (_key, val) => (typeof val === "string" ? val.trim().toLowerCase().replace(/\s+/g, " ") : val));
}

export function cacheKeyFor(systemPrompt: string, userParts: unknown): string {
  const raw = `${systemPrompt}::${normalizeForHash(userParts)}`;
  return createHash("sha256").update(raw).digest("hex");
}

/** Si falla la lectura del cache (sin tabla todavía, sin red, etc.), no
 * rompe el flujo -- simplemente se comporta como si no hubiera cache. */
export async function getCachedResponse(key: string): Promise<unknown | null> {
  const client = getCacheClient();
  if (!client) return null;
  try {
    const { data, error } = await client.from("ai_cache").select("response").eq("cache_key", key).maybeSingle();
    if (error || !data) return null;
    return data.response;
  } catch {
    return null;
  }
}

/** Guardar en el cache es un plus, no algo crítico -- si falla, no debe
 * romper la respuesta real que ya se le va a devolver al usuario. */
export async function setCachedResponse(key: string, response: unknown): Promise<void> {
  const client = getCacheClient();
  if (!client) return;
  try {
    await client.from("ai_cache").upsert({ cache_key: key, response });
  } catch (e) {
    console.error("Error guardando en ai_cache", e);
  }
}
