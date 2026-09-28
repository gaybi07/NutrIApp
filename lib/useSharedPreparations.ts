"use client";

import { useCallback } from "react";
import { supabase } from "@/lib/supabase/browser";
import { PreparationIngredient } from "@/lib/types";
import { inventoryKey, fuzzyNameMatch } from "@/lib/foodText";

interface SharedCandidate {
  id: string;
  nombre: string;
  ingredientes: PreparationIngredient[];
}

/** Qué tan parecidos son dos sets de ingredientes (0 a 1) -- proporción de
 * ingredientes del más chico de los dos que aparecen (por nombre
 * normalizado) en el otro. Ignora cantidades: lo que importa acá es "es la
 * misma preparación", no "las cantidades coinciden". */
function ingredientOverlap(a: PreparationIngredient[], b: PreparationIngredient[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const keysA = new Set(a.map((i) => inventoryKey(i.nombre)));
  const keysB = new Set(b.map((i) => inventoryKey(i.nombre)));
  let shared = 0;
  for (const k of keysA) if (keysB.has(k)) shared++;
  return shared / Math.min(keysA.size, keysB.size);
}

/**
 * Memoria GLOBAL de preparaciones -- exclusivamente para evitar duplicados
 * en `shared_preparations` (Supabase, compartida entre todos los usuarios).
 * No es un catálogo que nadie explora: solo se consulta al guardar una
 * preparación PERSONAL (ver lib/useMealPreparations.ts) para decidir si
 * reusar el id de una fila muy parecida (nombre + ingredientes principales)
 * en vez de crear una nueva -- así la memoria global no se llena de
 * variantes casi idénticas de lo mismo.
 */
export function useSharedPreparations() {
  const findOrCreate = useCallback(
    async (nombre: string, categoria: string, ingredientes: PreparationIngredient[]): Promise<string | null> => {
      if (!supabase || ingredientes.length === 0) return null;
      try {
        const key = inventoryKey(nombre);
        const primeraPalabra = key.split(" ").find((w) => w.length >= 4) || key;
        const { data } = await supabase
          .from("shared_preparations")
          .select("id, nombre, ingredientes")
          .ilike("nombre_key", `%${primeraPalabra}%`)
          .limit(20);
        const candidatos = (data || []) as SharedCandidate[];
        const match = candidatos.find(
          (c) => fuzzyNameMatch(inventoryKey(c.nombre), key) && ingredientOverlap(c.ingredientes, ingredientes) >= 0.5
        );
        if (match) {
          await supabase.rpc("bump_shared_preparation_usage", { p_id: match.id });
          return match.id;
        }
        const { data: created, error } = await supabase
          .from("shared_preparations")
          .insert({ nombre, nombre_key: key, categoria, ingredientes })
          .select("id")
          .single();
        if (error) return null;
        return (created?.id as string) ?? null;
      } catch {
        // Sin red o sin tabla todavía -- el guardado local ya pasó antes y
        // no depende de esto, simplemente queda sin sharedPreparationId.
        return null;
      }
    },
    []
  );

  const bumpUsage = useCallback((sharedPreparationId: string) => {
    if (!supabase) return;
    supabase.rpc("bump_shared_preparation_usage", { p_id: sharedPreparationId }).then(() => {});
  }, []);

  return { findOrCreate, bumpUsage };
}
