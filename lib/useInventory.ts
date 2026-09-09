"use client";

import { useCallback, useEffect, useState } from "react";
import { InventoryItem } from "./types";

const INVENTORY_KEY = "registro:inventory:v1";

function inventoryKey(name: string) {
  const normalized = canonicalName(name)
    .replace(/\s+/g, " ")
    .trim();
  return normalized.endsWith("s") && !normalized.endsWith("ss") ? normalized.slice(0, -1) : normalized;
}

function canonicalName(name: string) {
  const normalized = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (/^(?:panes?|rebanadas? de pan) lactales?$/.test(normalized)) return "pan lactal";
  if (/^tortas?$/.test(normalized)) return "torta";
  if (/^budines?$/.test(normalized)) return "budin";
  if (/^rebanadas? de (torta|budin)$/.test(normalized)) return normalized.replace(/^rebanadas? de /, "");
  return normalized;
}

function defaultUnitForName(name: string): InventoryItem["unit"] {
  const key = inventoryKey(name);
  if (/(huevo|palta|banana|manzana|yogur|yogurt|tomate|cebolla|papa|morron|limon|zanahoria|pan|torta|budin)/.test(key)) return "u.";
  if (/(leche|agua|aceite|salsa|jugo|vinagre|gaseosa|coca|caldo)/.test(key)) return "ml";
  return "g";
}

function normalizeUnit(rawUnit: string | undefined, name: string): InventoryItem["unit"] {
  const unit = (rawUnit || defaultUnitForName(name)).toLowerCase();
  if (/kg|kilo|kilos|kilogramo|kilogramos/.test(unit)) return "g";
  if (/l|lt|litro|litros|botella|botellas|ml|mililitro|mililitros/.test(unit)) return "ml";
  if (/u|unidad|unidades|docena/.test(unit)) return "u.";
  return defaultUnitForName(name);
}

export function parseInventoryText(text: string): Array<{ name: string; quantity: number; unit: InventoryItem["unit"] }> {
  return text
    .split(/\n|,|\||\s+y\s+/i)
    .map((part) => part.trim().replace(/^[-•*]\s*/, ""))
    .filter(Boolean)
    .map((part) => {
      const amountPattern = "(\\d+(?:[.,]\\d+)?|un|una|uno)";
      const unitPattern = "(kilogramos|kilogramo|kilos|kilo|kg|mililitros|mililitro|ml|litros|litro|lt|l|rebanadas?|porciones?|botellas|botella|gramos|gramo|gr|g|unidades?|u\\.|docena)?";
      const leadingMatch = part.match(new RegExp(`^${amountPattern}\\s*${unitPattern}\\s*(?:de\\s+)?(.+)$`, "i"));
      const match = leadingMatch || part.match(new RegExp(`^(.+?)\\s+${amountPattern}\\s*${unitPattern}$`, "i"));
      if (!match) {
        const bottle = part.match(/^(?:una?\s+)?botella(?:s)?\s+(?:de\s+)?(.+)$/i);
        if (bottle) return { name: bottle[1].trim().toLowerCase(), quantity: 1000, unit: "ml" as const };
        return { name: part.toLowerCase(), quantity: 1, unit: defaultUnitForName(part) };
      }
      const amountIndex = leadingMatch ? 1 : 2;
      const nameIndex = amountIndex === 1 ? 3 : 1;
      const unitIndex = amountIndex === 1 ? 2 : 3;
      const amountText = match[amountIndex].toLowerCase();
      const amount = /un|uno|una/.test(amountText) ? 1 : Number(amountText.replace(",", "."));
      const rawName = match[nameIndex].trim().toLowerCase();
      const name = canonicalName(rawName);
      const explicitUnit = match[unitIndex]?.toLowerCase();
      const rawUnit = (explicitUnit || defaultUnitForName(name)).toLowerCase();
      const unit = normalizeUnit(rawUnit, name);
      const multiplier = /^(kg|kilo|kilos|kilogramo|kilogramos)$/.test(rawUnit) ? 1000 : /^(l|lt|litro|litros|botella|botellas)$/.test(rawUnit) ? 1000 : 1;
      const presentationMultiplier = !explicitUnit && unit === "u."
        ? name === "pan lactal" ? 16 : name === "budin" ? 8 : name === "torta" ? 12 : 1
        : 1;
      return { name, quantity: amount * multiplier * presentationMultiplier, unit };
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
          const legacyParsed = parseInventoryText(item.name);
          const legacyEntry = legacyParsed.length === 1 && legacyParsed[0].name !== item.name.trim().toLowerCase()
            ? legacyParsed[0]
            : null;
          return [{
            ...item,
            name: legacyEntry?.name || item.name,
            quantity: legacyEntry && item.quantity === 1 ? legacyEntry.quantity : item.quantity,
            unit: normalizeUnit(legacyEntry?.unit || item.unit, legacyEntry?.name || item.name),
          }];
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
      const next = previous.map((item) => ({ ...item }));
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
  }, []);

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

export function inventoryUnitLabel(name: string, unit: InventoryItem["unit"]) {
  const key = inventoryKey(name);
  if (key === "pan lactal") return "rebanadas";
  if (key === "budin" || key === "torta") return "porciones";
  return unit;
}