"use client";

import { useMemo, useState } from "react";
import { InventoryCategory, InventoryItem, INVENTORY_CATEGORIES, INVENTORY_CATEGORY_LABELS } from "@/lib/types";

type BasketEntry = { itemId: string; amount: number };

/**
 * Descontar de la alacena sin que cuente como comida de nadie — para
 * invitados, algo que se tiró, o cualquier consumo que no corresponda a
 * las macros de una persona puntual. A diferencia de "Desde Alacena" (que
 * sí suma a una comida), acá no importa si el producto tiene nutrición
 * cargada: solo se descuenta stock.
 */
export function ExtraConsumption({
  items,
  consumeAmounts,
}: {
  items: InventoryItem[];
  consumeAmounts: (amounts: Array<{ id: string; quantity: number }>) => void;
}) {
  const [filter, setFilter] = useState<InventoryCategory | "todas">("todas");
  const [basket, setBasket] = useState<BasketEntry[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");

  const available = useMemo(() => items.filter((i) => i.quantity > 0), [items]);

  const presentCategories = useMemo(() => {
    const set = new Set(available.map((i) => i.category || "otros"));
    return INVENTORY_CATEGORIES.filter((c) => set.has(c.id));
  }, [available]);

  const visible = filter === "todas" ? available : available.filter((i) => (i.category || "otros") === filter);

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
      return item ? { item, amount: b.amount } : null;
    })
    .filter((b): b is { item: InventoryItem; amount: number } => b !== null);

  const confirm = () => {
    if (basketDetails.length === 0) return;
    consumeAmounts(basketDetails.map((b) => ({ id: b.item.id, quantity: b.amount })));
    setStatus("Descontado de la alacena ✓ — no se sumó a ninguna comida");
    setBasket([]);
    setDrafts({});
    setTimeout(() => setStatus(""), 4000);
  };

  if (available.length === 0) {
    return <div className="rounded-xl border border-dashed border-border p-3 text-[12px] text-textMuted">Todavía no tenés nada cargado.</div>;
  }

  return (
    <div>
      <div className="mb-2 text-[11px] text-textMuted">
        Para cuando alguien come algo de la alacena que no va en tus comidas (invitados, se tiró, etc.) — descuenta el stock sin sumar kcal a nadie.
      </div>

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
              className="shrink-0 rounded-md border border-rust/60 bg-rust/10 px-2 py-1 font-mono text-[10px] uppercase text-rust"
            >
              +
            </button>
          </div>
        ))}
      </div>

      {basketDetails.length > 0 && (
        <div className="mt-3 rounded-xl border border-rust/40 bg-rust/10 p-2.5">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-rust">Vas a descontar (sin sumar a ninguna comida)</div>
          <div className="flex flex-col gap-1.5">
            {basketDetails.map((b) => (
              <div key={b.item.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg/40 px-2 py-1.5 text-[11px]">
                <span className="min-w-0 flex-1 truncate text-text">
                  {b.item.name} × {b.amount} {b.item.unit}
                </span>
                <button type="button" onClick={() => removeFromBasket(b.item.id)} aria-label={`Sacar ${b.item.name}`} className="shrink-0 text-rust">
                  ×
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={confirm} className="mt-2 w-full rounded-lg p-3 font-sans font-bold text-sm bg-rust text-bg">
            Descontar de la alacena
          </button>
        </div>
      )}

      {status && <div className="mt-2 text-center font-mono text-[11px] text-sage">{status}</div>}
    </div>
  );
}
