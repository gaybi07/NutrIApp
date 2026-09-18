"use client";

import { useCallback, useEffect, useState } from "react";
import { InventoryCategory, InventoryItem, InventoryNutrition, InventoryZone } from "./types";
import { inventoryKey } from "./useInventory";

const KEY = "registro:productMemory:v1";

export interface ProductMemoryEntry {
  name: string;
  // Cuánto trae UN envase/unidad de este producto (ej. 1 pote de premezcla
  // = 500 g) — se usa para resolver de una la próxima vez que aparezca,
  // sin tener que volver a preguntar. Opcional: no todo lo que se recuerda
  // trae un tamaño de envase confiable (ej. al revisar con IA solo se
  // actualiza categoría/nutrición, no el "1 envase = X" original).
  unitQuantity?: number;
  unit?: InventoryItem["unit"];
  category?: InventoryCategory;
  nutritionPer100g?: InventoryNutrition;
  // Dónde lo guardás de verdad (Cocina Virtual) -- así la próxima vez que
  // aparezca este producto (aunque sea "mandarinas" y antes fue "mandarina")
  // se sugiere solo la misma zona en vez de tener que elegirla de nuevo.
  zona?: InventoryZone;
  updatedAt: number;
}

// Misma clave que el inventario (lib/useInventory.ts) -- así "mandarina" y
// "mandarinas" (plural, como se compran la mayoría de las veces) matchean
// el mismo producto acá también, en vez de quedar como dos entradas
// separadas que nunca se encuentran entre sí.
const normalize = inventoryKey;

/**
 * Memoria de productos por nombre — separada de la alacena en sí (que se
 * vacía a medida que consumís) para que lo que la IA o vos ya definieron
 * una vez sobre un producto (cuánto trae un envase, su categoría, su
 * valor nutricional) quede disponible para la próxima carga, aunque ese
 * producto ya no esté en el inventario actual. Es por dispositivo
 * (localStorage), como la memoria de comidas.
 */
export function useProductMemory() {
  const [memory, setMemory] = useState<Record<string, ProductMemoryEntry>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setMemory(JSON.parse(raw));
    } catch (e) {
      console.error("Error cargando memoria de productos", e);
    } finally {
      setLoaded(true);
    }
  }, []);

  const remember = useCallback((entry: Omit<ProductMemoryEntry, "updatedAt">) => {
    if (!entry.name.trim()) return;
    setMemory((prev) => {
      const key = normalize(entry.name);
      const existing = prev[key];
      const next = {
        ...prev,
        [key]: {
          ...entry,
          // No pisar datos ya sabidos con un valor vacío (ej. una revisión
          // con IA que solo trae categoría/nutrición no debe borrar el
          // tamaño de envase que ya se le había preguntado al usuario).
          unitQuantity: entry.unitQuantity ?? existing?.unitQuantity,
          unit: entry.unit ?? existing?.unit,
          category: entry.category ?? existing?.category,
          nutritionPer100g: entry.nutritionPer100g ?? existing?.nutritionPer100g,
          zona: entry.zona ?? existing?.zona,
          updatedAt: Date.now(),
        },
      };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch (e) {
        console.error("Error guardando memoria de productos", e);
      }
      return next;
    });
  }, []);

  const lookup = useCallback((name: string): ProductMemoryEntry | null => memory[normalize(name)] || null, [memory]);

  return { memory, loaded, remember, lookup };
}

export type ProductMemoryApi = Pick<ReturnType<typeof useProductMemory>, "lookup" | "remember">;
