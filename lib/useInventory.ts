"use client";

import { useCallback, useEffect, useState } from "react";
import { InventoryItem } from "./types";

const INVENTORY_KEY = "registro:inventory:v1";

function inventoryKey(name: string) {
  const normalized = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.endsWith("s") && !normalized.endsWith("ss") ? normalized.slice(0, -1) : normalized;
}

function defaultUnitForName(name: string): InventoryItem["unit"] {
  const key = inventoryKey(name);
  if (/(huevo|palta|banana|manzana|yogur|yogurt|tomate|cebolla|papa|morron|limon)/.test(key)) return "u.";
  if (/(leche|agua|aceite|salsa|jugo)/.test(key)) return "ml";
  return "g";
}

export function parseInventoryText(text: string): Array<{ name: string; quantity: number; unit: InventoryItem["unit"] }> {
  return text
    .split(/\n|,|\||\s+y\s+/i)
    .map((part) => part.trim().replace(/^[-•*]\s*/, ""))
    .filter(Boolean)
    .map((part) => {
      const article = part.match(/^(un|una)\s+(.+)$/i);
      if (article) return { name: article[2].trim().toLowerCase(), quantity: 1, unit: "u." as const };
      const match = part.match(/^(\d+(?:[.,]\d+)?)\s*(kg|g|gr|gramos|l|lt|ml|unidades?|u\.?)?\s*(?:de\s+)?(.+)$/i) || part.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(kg|g|gr|gramos|l|lt|ml|unidades?|u\.?)?$/i);
      if (!match) return { name: part.toLowerCase(), quantity: 1, unit: "u." as const };
      const amountIndex = typeof match[1] === "string" && /\d/.test(match[1]) ? 1 : 2;
      const nameIndex = amountIndex === 1 ? 3 : 1;
      const unitIndex = amountIndex === 1 ? 2 : 3;
      const amount = Number(match[amountIndex].replace(",", "."));
      const rawUnit = (match[unitIndex] || defaultUnitForName(match[nameIndex])).toLowerCase();
      const unit = rawUnit === "kg" ? "g" : rawUnit === "l" || rawUnit === "lt" ? "ml" : rawUnit.match(/g|gr|gramos/) ? "g" : rawUnit === "ml" ? "ml" : "u.";
      return { name: match[nameIndex].trim().toLowerCase(), quantity: unit === "g" && rawUnit === "kg" ? amount * 1000 : unit === "ml" && rawUnit === "l" ? amount * 1000 : amount, unit };
    });
}

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
          return [{ ...item, unit: defaultUnitForName(item.name) }];
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

  const addText = useCallback((text: string) => {
    const parsed = parseInventoryText(text);
    setItems((previous) => {
      const next = [...previous];
      parsed.forEach(({ name, quantity, unit }) => {
        const existing = next.find((item) => inventoryKey(item.name) === inventoryKey(name) && item.unit === unit);
        if (existing) existing.quantity += quantity;
        else next.push({ id: `${Date.now()}-${name}-${Math.random()}`, name, quantity, unit });
      });
      localStorage.setItem(INVENTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

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

  return { items, loaded, addText, consumeByText, consumeItem, consumeAmounts, persist };
}