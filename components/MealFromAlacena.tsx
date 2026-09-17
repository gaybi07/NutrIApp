"use client";

import { useMemo, useState } from "react";
import {
  DayEntry,
  InventoryCategory,
  InventoryItem,
  MealItem,
  MealKey,
  MEAL_LABELS,
  INVENTORY_CATEGORIES,
  INVENTORY_CATEGORY_LABELS,
  emptyDay,
} from "@/lib/types";
import { getMealItems, applyMealItems, nutritionForAmount } from "@/lib/calculations";

type BasketEntry = { itemId: string; amount: number };

/**
 * Cargar una comida picoteando directo de la alacena en vez de describirla
 * para que la IA la calcule — usa el valor nutricional que cada producto ya
 * tiene guardado (cargado con IA, foto de etiqueta, o a mano) y descuenta
 * exactamente lo que se usó, sin depender de que la IA reconozca el texto.
 */
export function MealFromAlacena({
  items,
  days,
  fecha,
  meal,
  onUpsert,
  consumeAmounts,
  onAdded,
}: {
  items: InventoryItem[];
  days: DayEntry[];
  fecha: string;
  meal: MealKey;
  onUpsert: (entry: DayEntry) => void;
  consumeAmounts: (amounts: Array<{ id: string; quantity: number }>) => void;
  onAdded?: (updatedEntry: DayEntry) => void;
}) {
  const [filter, setFilter] = useState<InventoryCategory | "todas">("todas");
  const [basket, setBasket] = useState<BasketEntry[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");

  const usable = useMemo(() => items.filter((i) => i.nutritionPer100g && i.quantity > 0), [items]);
  const missingCount = items.length - usable.length;

  const presentCategories = useMemo(() => {
    const set = new Set(usable.map((i) => i.category || "otros"));
    return INVENTORY_CATEGORIES.filter((c) => set.has(c.id));
  }, [usable]);

  const visible = filter === "todas" ? usable : usable.filter((i) => (i.category || "otros") === filter);

  const draftFor = (item: InventoryItem) => drafts[item.id] ?? (item.unit === "u." ? "1" : String(Math.min(item.quantity, 100)));

  const addToBasket = (item: InventoryItem) => {
    const amount = Number(draftFor(item));
    if (!amount || amount <= 0) return;
    setBasket((prev) => {
      const existing = prev.find((b) => b.itemId === item.id);
      if (existing) return prev.map((b) => (b.itemId === item.id ? { ...b, amount: b.amount + amount } : b));
      return [...prev, { itemId: item.id, amount }];
    });
  };

  const removeFromBasket = (itemId: string) => setBasket((prev) => prev.filter((b) => b.itemId !== itemId));

  const basketDetails = basket
    .map((b) => {
      const item = items.find((i) => i.id === b.itemId);
      if (!item) return null;
      const nutrition = nutritionForAmount(item, b.amount);
      if (!nutrition) return null;
      return { item, amount: b.amount, nutrition };
    })
    .filter((b): b is { item: InventoryItem; amount: number; nutrition: NonNullable<ReturnType<typeof nutritionForAmount>> } => b !== null);

  const totals = basketDetails.reduce(
    (acc, b) => ({ kcal: acc.kcal + b.nutrition.kcal, protein: acc.protein + b.nutrition.protein }),
    { kcal: 0, protein: 0 }
  );

  const confirm = () => {
    if (basketDetails.length === 0) return;
    const existing = days.find((d) => d.fecha === fecha) || emptyDay(fecha);
    const nuevosItems: MealItem[] = basketDetails.map((b, i) => ({
      id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      nombre: b.item.name,
      kcal: b.nutrition.kcal,
      protein: b.nutrition.protein,
      carbs: b.nutrition.carbs,
      fat: b.nutrition.fat,
      fiber: b.nutrition.fiber,
      gramos: b.item.unit !== "u." ? b.amount : undefined,
    }));
    const alimentosDelDia = Array.from(new Set([...(existing.alimentos || []), ...basketDetails.map((b) => b.item.name)]));
    const itemsActuales = getMealItems(existing, meal);
    const updated = { ...applyMealItems(existing, meal, [...itemsActuales, ...nuevosItems]), alimentos: alimentosDelDia };
    onUpsert(updated);
    consumeAmounts(basketDetails.map((b) => ({ id: b.item.id, quantity: b.amount })));
    onAdded?.(updated);
    setStatus(`Sumado a ${MEAL_LABELS[meal]} ✓ — descontado de tu alacena`);
    setBasket([]);
    setDrafts({});
    setTimeout(() => setStatus(""), 4000);
  };

  if (items.length === 0) {
    return (
      <div className="mt-2 rounded-xl border border-dashed border-border p-3 text-[12px] text-textMuted">
        Todavía no tenés nada cargado en la Alacena.
      </div>
    );
  }

  return (
    <div className="mt-2">
      {presentCategories.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFilter("todas")}
            className={`rounded-full border px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-wide ${
              filter === "todas" ? "border-gold bg-gold text-bg" : "border-border bg-bg/60 text-textMuted"
            }`}
          >
            Todas
          </button>
          {presentCategories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setFilter(c.id)}
              className={`rounded-full border px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-wide ${
                filter === c.id ? "border-gold bg-gold text-bg" : "border-border bg-bg/60 text-textMuted"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {visible.length > 0 ? (
        <div className="flex max-h-64 flex-col gap-1.5 overflow-y-auto pr-0.5">
          {visible.map((item) => (
            <div key={item.id} className="flex items-center gap-2 rounded-lg border border-border bg-bg/40 px-2 py-1.5">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] text-text">{item.name}</div>
                <div className="font-mono text-[9px] uppercase tracking-wide text-textMuted">
                  tenés {item.quantity} {item.unit} · {INVENTORY_CATEGORY_LABELS[item.category || "otros"]}
                </div>
              </div>
              <input
                type="number"
                min="0"
                inputMode="decimal"
                value={draftFor(item)}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                className="w-16 shrink-0 rounded-md border border-border bg-surface px-1.5 py-1 text-right font-mono text-[11px]"
              />
              <span className="shrink-0 font-mono text-[9px] uppercase text-textMuted">{item.unit}</span>
              <button
                type="button"
                onClick={() => addToBasket(item)}
                className="shrink-0 rounded-md border border-gold/60 bg-gold px-2 py-1 font-mono text-[10px] uppercase text-bg"
              >
                +
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-3 text-[12px] text-textMuted">
          Nada en esta categoría todavía tiene valor nutricional cargado.
        </div>
      )}

      {missingCount > 0 && (
        <div className="mt-2 text-[10px] text-textMuted">
          {missingCount} producto{missingCount > 1 ? "s" : ""} de tu alacena no aparece{missingCount > 1 ? "n" : ""} acá porque le{missingCount > 1 ? "s" : ""} falta el valor nutricional — completalo desde Comidas &gt; Alacena.
        </div>
      )}

      {basketDetails.length > 0 && (
        <div className="mt-3 rounded-xl border border-gold/40 bg-gold/10 p-2.5">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-gold">Vas a sumar</div>
          <div className="flex flex-col gap-1.5">
            {basketDetails.map((b) => (
              <div key={b.item.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg/40 px-2 py-1.5 text-[11px]">
                <span className="min-w-0 flex-1 truncate text-text">
                  {b.item.name} × {b.amount} {b.item.unit}
                </span>
                <span className="shrink-0 text-textMuted">{b.nutrition.kcal} kcal · {b.nutrition.protein}g prot</span>
                <button type="button" onClick={() => removeFromBasket(b.item.id)} aria-label={`Sacar ${b.item.name}`} className="shrink-0 text-rust">
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2 font-mono text-[11px] text-textMuted">
            Total: <span className="text-text">{totals.kcal} kcal · {totals.protein}g prot</span>
          </div>
          <button
            type="button"
            onClick={confirm}
            className="mt-2 w-full rounded-lg p-3 font-sans font-bold text-sm bg-gold text-bg"
          >
            Sumar a {MEAL_LABELS[meal]} y descontar de la alacena
          </button>
        </div>
      )}

      {status && <div className="mt-2 text-center font-mono text-[11px] text-sage">{status}</div>}
    </div>
  );
}
