"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import { InventoryCategory, InventoryItem, InventoryNutrition } from "./types";
import { inventoryKey, defaultCategoryForName, parseInventoryText } from "./useInventory";

function rowToItem(row: Record<string, unknown>): InventoryItem {
  return {
    id: String(row.id),
    name: String(row.name),
    quantity: Number(row.quantity),
    unit: row.unit as InventoryItem["unit"],
    category: (row.category as InventoryCategory) || undefined,
    nutritionPer100g: (row.nutrition_per_100g as InventoryNutrition) || undefined,
    nutritionConfirmed: Boolean(row.nutrition_confirmed),
    zona: (row.zona as InventoryItem["zona"]) || undefined,
  };
}

/**
 * Misma forma que useInventory() (items/addStructuredItems/updateItem/
 * applyReview/consumeByText/consumeItem/consumeAmounts/persist) pero
 * respaldada por la tabla compartida inventory_items en vez de
 * localStorage -- así app/page.tsx puede intercambiar una por otra sin
 * tocar ningún componente de más abajo (AlacenaCard, ShoppingLog, etc. ya
 * reciben todo por props).
 *
 * Cada mutación escribe en Supabase y después vuelve a pedir la lista
 * completa (en vez de aplicar el cambio a mano en el estado local) --
 * más simple y sin riesgo de desincronizarse, y para una alacena de
 * unas pocas decenas de items el costo extra no importa. Además hay una
 * suscripción realtime: si el otro integrante del grupo agrega o saca
 * algo, este cliente lo ve solo, sin refrescar la página.
 */
export function useSharedInventory(householdId: string | null) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refetch = useCallback(async () => {
    if (!supabase || !householdId) {
      setItems([]);
      setLoaded(true);
      return;
    }
    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("household_id", householdId)
      .order("created_at", { ascending: true });
    if (!error && data) setItems(data.map(rowToItem));
    setLoaded(true);
  }, [householdId]);

  useEffect(() => {
    setLoaded(false);
    refetch();
  }, [refetch]);

  // Respaldo del realtime: si volvés a la pestaña/app después de un rato
  // (el otro integrante pudo haber cambiado algo mientras tanto), refresca
  // igual aunque el canal realtime se haya cortado o tardado en avisar.
  useEffect(() => {
    if (!householdId) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") refetch();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [householdId, refetch]);

  useEffect(() => {
    if (!supabase || !householdId) return;
    const client = supabase;
    const channel = client
      .channel(`inventory-${householdId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory_items", filter: `household_id=eq.${householdId}` },
        () => refetch()
      )
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }, [householdId, refetch]);

  const addStructuredItems = useCallback(
    (
      entries: Array<{
        name: string;
        quantity: number;
        unit: InventoryItem["unit"];
        category?: InventoryCategory;
        nutritionPer100g?: InventoryNutrition;
        zona?: InventoryItem["zona"];
      }>
    ) => {
      if (!supabase || !householdId) return;
      const working = new Map<string, InventoryItem>();
      items.forEach((item) => working.set(`${inventoryKey(item.name)}|${item.unit}`, item));

      const toInsert: Array<{
        name: string;
        quantity: number;
        unit: InventoryItem["unit"];
        category?: InventoryCategory;
        nutritionPer100g?: InventoryNutrition;
        zona?: InventoryItem["zona"];
      }> = [];
      const toUpdate = new Map<string, { quantity: number; category?: InventoryCategory; nutritionPer100g?: InventoryNutrition; zona?: InventoryItem["zona"] }>();

      entries.forEach(({ name, quantity, unit, category, nutritionPer100g, zona }) => {
        const key = `${inventoryKey(name)}|${unit}`;
        const existing = working.get(key);
        if (existing) {
          const nextQuantity = existing.quantity + quantity;
          working.set(key, { ...existing, quantity: nextQuantity });
          const pending = toUpdate.get(existing.id) || { quantity: nextQuantity };
          toUpdate.set(existing.id, {
            quantity: nextQuantity,
            category: pending.category ?? (!existing.category ? category : undefined),
            nutritionPer100g: pending.nutritionPer100g ?? (!existing.nutritionConfirmed ? nutritionPer100g : undefined),
            zona: pending.zona ?? (!existing.zona ? zona : undefined),
          });
        } else {
          working.set(key, { id: `pending-${key}`, name, quantity, unit, category, nutritionPer100g, zona });
          toInsert.push({ name, quantity, unit, category: category || defaultCategoryForName(name), nutritionPer100g, zona });
        }
      });

      (async () => {
        if (toInsert.length > 0) {
          await supabase!.from("inventory_items").insert(
            toInsert.map((entry) => ({
              household_id: householdId,
              name: entry.name,
              quantity: entry.quantity,
              unit: entry.unit,
              category: entry.category,
              nutrition_per_100g: entry.nutritionPer100g || null,
              zona: entry.zona || null,
            }))
          );
        }
        for (const [id, patch] of toUpdate) {
          const row: Record<string, unknown> = { quantity: patch.quantity };
          if (patch.category) row.category = patch.category;
          if (patch.nutritionPer100g) row.nutrition_per_100g = patch.nutritionPer100g;
          if (patch.zona) row.zona = patch.zona;
          await supabase!.from("inventory_items").update(row).eq("id", id);
        }
        await refetch();
      })();
    },
    [items, householdId, refetch]
  );

  const updateItem = useCallback(
    (id: string, patch: Partial<InventoryItem>) => {
      if (!supabase || !householdId) return;
      const row: Record<string, unknown> = {};
      if (patch.name !== undefined) row.name = patch.name;
      if (patch.quantity !== undefined) row.quantity = patch.quantity;
      if (patch.unit !== undefined) row.unit = patch.unit;
      if (patch.category !== undefined) row.category = patch.category;
      if (patch.nutritionPer100g !== undefined) row.nutrition_per_100g = patch.nutritionPer100g;
      if (patch.nutritionConfirmed !== undefined) row.nutrition_confirmed = patch.nutritionConfirmed;
      if (patch.zona !== undefined) row.zona = patch.zona;
      (async () => {
        await supabase!.from("inventory_items").update(row).eq("id", id);
        await refetch();
      })();
    },
    [householdId, refetch]
  );

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
      if (!supabase || !householdId) return;
      (async () => {
        for (const fix of corrections) {
          const current = items.find((item) => item.id === fix.id);
          if (!current) continue;
          await supabase!
            .from("inventory_items")
            .update({
              name: fix.name,
              quantity: fix.quantity,
              unit: fix.unit,
              category: fix.category || current.category,
              nutrition_per_100g: current.nutritionConfirmed ? current.nutritionPer100g : fix.nutritionPer100g || current.nutritionPer100g,
            })
            .eq("id", fix.id);
        }
        await refetch();
      })();
    },
    [items, householdId, refetch]
  );

  const consumeByText = useCallback(
    (text: string) => {
      const parsed = parseInventoryText(text);
      const consumed: string[] = [];
      const missing: string[] = [];
      const toUpdate: Array<{ id: string; quantity: number }> = [];

      parsed.forEach((entry) => {
        const match = items.find((item) => item.unit === entry.unit && (item.name.includes(entry.name) || entry.name.includes(item.name)));
        if (match) consumed.push(entry.name);
        else missing.push(entry.name);
      });

      items.forEach((item) => {
        const used = parsed.find((entry) => item.name.includes(entry.name) || entry.name.includes(item.name));
        if (!used || item.unit !== used.unit) return;
        toUpdate.push({ id: item.id, quantity: Math.max(0, item.quantity - used.quantity) });
      });

      if (supabase && householdId && toUpdate.length > 0) {
        (async () => {
          const toDelete = toUpdate.filter((u) => u.quantity <= 0).map((u) => u.id);
          const toKeep = toUpdate.filter((u) => u.quantity > 0);
          if (toDelete.length > 0) await supabase!.from("inventory_items").delete().in("id", toDelete);
          for (const u of toKeep) await supabase!.from("inventory_items").update({ quantity: u.quantity }).eq("id", u.id);
          await refetch();
        })();
      }

      return { consumed, missing };
    },
    [items, householdId, refetch]
  );

  const consumeItem = useCallback(
    (id: string, amount = 1) => {
      if (!supabase || !householdId) return;
      const item = items.find((i) => i.id === id);
      if (!item) return;
      const nextQuantity = item.quantity - amount;
      (async () => {
        if (nextQuantity <= 0) await supabase!.from("inventory_items").delete().eq("id", id);
        else await supabase!.from("inventory_items").update({ quantity: nextQuantity }).eq("id", id);
        await refetch();
      })();
    },
    [items, householdId, refetch]
  );

  const consumeAmounts = useCallback(
    (amounts: Array<{ id: string; quantity: number }>) => {
      if (!supabase || !householdId) return;
      const toDelete: string[] = [];
      const toUpdate: Array<{ id: string; quantity: number }> = [];
      items.forEach((item) => {
        const amount = amounts.find((entry) => entry.id === item.id)?.quantity || 0;
        if (!amount) return;
        const next = Math.max(0, item.quantity - amount);
        if (next <= 0) toDelete.push(item.id);
        else toUpdate.push({ id: item.id, quantity: next });
      });
      (async () => {
        if (toDelete.length > 0) await supabase!.from("inventory_items").delete().in("id", toDelete);
        for (const u of toUpdate) await supabase!.from("inventory_items").update({ quantity: u.quantity }).eq("id", u.id);
        await refetch();
      })();
    },
    [items, householdId, refetch]
  );

  /** Solo se usa hoy para sacar items (Vaciar alacena / quitar uno) -- borra
   * lo que estaba y ya no está en `next`. */
  const persist = useCallback(
    (next: InventoryItem[]) => {
      if (!supabase || !householdId) return;
      const nextIds = new Set(next.map((item) => item.id));
      const removedIds = items.filter((item) => !nextIds.has(item.id)).map((item) => item.id);
      if (removedIds.length === 0) return;
      (async () => {
        await supabase!.from("inventory_items").delete().in("id", removedIds);
        await refetch();
      })();
    },
    [items, householdId, refetch]
  );

  return { items, loaded, addStructuredItems, updateItem, applyReview, consumeByText, consumeItem, consumeAmounts, persist };
}
