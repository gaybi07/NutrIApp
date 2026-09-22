"use client";

import { useCallback, useEffect, useState } from "react";
import { InventoryCategory, InventoryItem, InventoryNutrition } from "./types";
import { inventoryKey, defaultUnitForName, defaultCategoryForName, parseInventoryText, findRestoreTarget } from "./foodText";

const INVENTORY_KEY = "registro:inventory:v1";

// Movidos a lib/foodText.ts (sin "use client") para que las rutas de API
// también los puedan usar del lado servidor -- se re-exportan acá tal cual
// para no romper a nadie que ya los importaba de este archivo.
export { inventoryKey, defaultCategoryForName, parseInventoryText, findRestoreTarget };
export type { ParsedInventoryEntry } from "./foodText";

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(INVENTORY_KEY);
      if (saved) {
        const rawItems = JSON.parse(saved) as Array<InventoryItem | string>;
        const migrated = rawItems.flatMap((item) => {
          if (typeof item === "string") {
            return parseInventoryText(item).map((entry) => ({ id: `${Date.now()}-${entry.name}-${Math.random()}`, ...entry }));
          }
          if (!item || !item.name) return [];
          // Ojo: NO recalcular "unit" para ítems que ya lo traen (pisaría la
          // unidad real -- ej. "u." para milanesas -- con la adivinanza por
          // nombre en cada carga de la app). Solo se completa si de verdad
          // falta (ítems viejísimos guardados sin este campo).
          return [{ ...item, unit: item.unit || defaultUnitForName(item.name) }];
        });
        const merged = migrated.reduce<InventoryItem[]>((result, item) => {
          const existing = result.find((candidate) => inventoryKey(candidate.name) === inventoryKey(item.name) && candidate.unit === item.unit);
          if (existing) existing.quantity += item.quantity;
          else result.push(item);
          return result;
        }, []);
        setItems(merged);
        localStorage.setItem(INVENTORY_KEY, JSON.stringify(merged));
      }
    } catch {
      setItems([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  const persist = useCallback((next: InventoryItem[]) => {
    const clean = next.filter((item) => item.quantity > 0);
    setItems(clean);
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(clean));
  }, []);

  /** Alta ya resuelta (lectura de ticket, "Agregar tal cual" de Compras ya
   * cruzado contra la memoria de productos, o una respuesta manual del
   * usuario) — si no trae categoría, cae a la heurística por palabra clave. */
  const addStructuredItems = useCallback(
    (
      entries: Array<{
        name: string;
        quantity: number;
        unit: InventoryItem["unit"];
        category?: InventoryCategory;
        nutritionPer100g?: InventoryNutrition;
        zona?: InventoryItem["zona"];
        // Para platos preparados (ver PrepareDish.tsx): el valor nutricional
        // ya se calculó a mano a partir de los ingredientes usados, no es
        // una estimación de IA -- que "Revisar con IA" no lo toque después.
        nutritionConfirmed?: boolean;
      }>
    ) => {
      setItems((previous) => {
        const next = [...previous];
        entries.forEach(({ name, quantity, unit, category, nutritionPer100g, zona, nutritionConfirmed }) => {
          const existing = next.find((item) => inventoryKey(item.name) === inventoryKey(name) && item.unit === unit);
          if (existing) {
            existing.quantity += quantity;
            if (!existing.category && category) existing.category = category;
            if (!existing.nutritionConfirmed && nutritionPer100g) existing.nutritionPer100g = nutritionPer100g;
            if (!existing.zona && zona) existing.zona = zona;
            if (nutritionConfirmed) existing.nutritionConfirmed = true;
          } else {
            next.push({
              id: `${Date.now()}-${name}-${Math.random()}`,
              name,
              quantity,
              unit,
              category: category || defaultCategoryForName(name),
              nutritionPer100g,
              zona,
              nutritionConfirmed,
            });
          }
        });
        localStorage.setItem(INVENTORY_KEY, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  /** Edición a mano de un item puntual (categoría y/o nutrición desde
   * Alacena) — si toca la nutrición, la marca "confirmada" para que
   * "Revisar con IA" no se la pise después. */
  const updateItem = useCallback((id: string, patch: Partial<InventoryItem>) => {
    setItems((previous) => {
      const next = previous.map((item) => (item.id === id ? { ...item, ...patch } : item));
      localStorage.setItem(INVENTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  /** Aplica las correcciones de "Revisar con IA" — matchea por id, y
   * respeta la nutrición que el usuario ya haya confirmado a mano. */
  const applyReview = useCallback(
    (
      corrections: Array<{
        id: string;
        name: string;
        quantity: number;
        unit: InventoryItem["unit"];
        category?: InventoryCategory;
        nutritionPer100g?: InventoryNutrition;
      }>
    ) => {
      setItems((previous) => {
        const next = previous.map((item) => {
          const fix = corrections.find((c) => c.id === item.id);
          if (!fix) return item;
          return {
            ...item,
            name: fix.name,
            quantity: fix.quantity,
            unit: fix.unit,
            category: fix.category || item.category,
            nutritionPer100g: item.nutritionConfirmed ? item.nutritionPer100g : fix.nutritionPer100g || item.nutritionPer100g,
          };
        });
        localStorage.setItem(INVENTORY_KEY, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const consumeByText = useCallback((text: string) => {
    const parsed = parseInventoryText(text);
    const consumed: string[] = [];
    const missing: string[] = [];
    parsed.forEach((entry) => {
      const match = items.find((item) => item.unit === entry.unit && (item.name.includes(entry.name) || entry.name.includes(item.name)));
      if (match) consumed.push(entry.name);
      else missing.push(entry.name);
    });
    setItems((previous) => {
      const next = previous.map((item) => {
        const used = parsed.find((entry) => item.name.includes(entry.name) || entry.name.includes(item.name));
        if (!used || item.unit !== used.unit) return item;
        return { ...item, quantity: Math.max(0, item.quantity - used.quantity) };
      });
      const clean = next.filter((item) => item.quantity > 0);
      localStorage.setItem(INVENTORY_KEY, JSON.stringify(clean));
      return clean;
    });
    return { consumed, missing };
  }, [items]);

  const consumeItem = useCallback((id: string, amount = 1) => {
    setItems((previous) => {
      const clean = previous.map((item) => item.id === id ? { ...item, quantity: item.quantity - amount } : item).filter((item) => item.quantity > 0);
      localStorage.setItem(INVENTORY_KEY, JSON.stringify(clean));
      return clean;
    });
  }, []);

  const consumeAmounts = useCallback((amounts: Array<{ id: string; quantity: number }>) => {
    setItems((previous) => {
      const next = previous.map((item) => {
        const amount = amounts.find((entry) => entry.id === item.id)?.quantity || 0;
        return amount ? { ...item, quantity: Math.max(0, item.quantity - amount) } : item;
      }).filter((item) => item.quantity > 0);
      localStorage.setItem(INVENTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  /** Contraparte de consumeAmounts — devuelve stock (comiste menos de lo
   * cargado, o borraste una comida cargada desde la alacena). Si el producto
   * ya no existe (consumeAmounts lo borró al llegar a 0), lo recrea a partir
   * del "fallback" en vez de perder el ajuste. */
  const restoreAmounts = useCallback(
    (
      entries: Array<{
        id: string;
        quantity: number;
        fallback?: {
          name: string;
          unit: InventoryItem["unit"];
          category?: InventoryCategory;
          nutritionPer100g?: InventoryNutrition;
          zona?: InventoryItem["zona"];
        };
      }>
    ) => {
      setItems((previous) => {
        const next = [...previous];
        entries.forEach(({ id, quantity, fallback }) => {
          if (quantity <= 0) return;
          const target = findRestoreTarget(next, id, fallback);
          if (target) {
            target.quantity += quantity;
            return;
          }
          if (!fallback) return;
          next.push({
            id: `${Date.now()}-${fallback.name}-${Math.random()}`,
            name: fallback.name,
            quantity,
            unit: fallback.unit,
            category: fallback.category || defaultCategoryForName(fallback.name),
            nutritionPer100g: fallback.nutritionPer100g,
            zona: fallback.zona,
          });
        });
        localStorage.setItem(INVENTORY_KEY, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  return { items, loaded, addStructuredItems, updateItem, applyReview, consumeByText, consumeItem, consumeAmounts, restoreAmounts, persist };
}
