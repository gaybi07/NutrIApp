"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import { foodKey } from "./foodText";

const FOODS_CACHE_KEY = "registro:foods:v1";
const REFRESH_MS = 24 * 60 * 60 * 1000; // una vez por día alcanza -- es una tabla que cambia poco

export interface KnownFood {
  nombre: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  gramosPorUnidad?: number;
}

interface CachedFoods {
  fetchedAt: number;
  entries: Record<string, KnownFood>;
}

/**
 * Lee la tabla `foods` (compartida, RLS "select using (true)") del lado
 * cliente -- solo lo que hace falta para la UI: mostrar "≈ 120 g" al lado de
 * un alimento por unidad, y convertir unidades↔gramos en los formularios de
 * carga. Cachea en localStorage con refetch diario; si Supabase no está
 * configurado o falla, degrada a "no se sabe nada" sin romper nada de lo que
 * ya funcionaba sin este hook.
 */
export function useFoods() {
  const [entries, setEntries] = useState<Record<string, KnownFood>>({});
  const [loaded, setLoaded] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    try {
      const cached = localStorage.getItem(FOODS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as CachedFoods;
        setEntries(parsed.entries || {});
        if (Date.now() - parsed.fetchedAt < REFRESH_MS) {
          setLoaded(true);
          fetchedRef.current = true;
        }
      }
    } catch {
      // localStorage corrupto o inaccesible -- arranca vacío, sin romper nada.
    }

    if (fetchedRef.current || !supabase) {
      setLoaded(true);
      return;
    }
    fetchedRef.current = true;
    (async () => {
      try {
        const { data, error } = await supabase!.from("foods").select("nombre, nombre_key, kcal, protein, carbs, fat, fiber, gramos_por_unidad");
        if (!error && data) {
          const next: Record<string, KnownFood> = {};
          data.forEach((row) => {
            next[String(row.nombre_key)] = {
              nombre: String(row.nombre),
              kcal: Number(row.kcal),
              protein: Number(row.protein),
              carbs: Number(row.carbs),
              fat: Number(row.fat),
              fiber: Number(row.fiber),
              gramosPorUnidad: row.gramos_por_unidad != null ? Number(row.gramos_por_unidad) : undefined,
            };
          });
          setEntries(next);
          localStorage.setItem(FOODS_CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), entries: next }));
        }
      } catch {
        // Sin red o sin tabla todavía -- se sigue con lo que había en cache
        // (o vacío), la app funciona igual que antes de este hook existir.
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const findFood = useCallback((name: string): KnownFood | null => entries[foodKey(name)] ?? null, [entries]);
  const gramsPerUnit = useCallback((name: string): number | null => entries[foodKey(name)]?.gramosPorUnidad ?? null, [entries]);

  return { loaded, findFood, gramsPerUnit };
}
