"use client";

import { useState } from "react";
import { InventoryCategory, InventoryItem, InventoryNutrition } from "@/lib/types";
import { parseInventoryText } from "@/lib/useInventory";
import { ProductMemoryApi } from "@/lib/useProductMemory";

export type AiShoppingItem = {
  name: string;
  quantity: number;
  unit: InventoryItem["unit"];
  category?: InventoryCategory;
  nutritionPer100g?: InventoryNutrition;
};
type PendingItem = { name: string; containerCount: number };
type PendingDraft = { amount: string; unit: InventoryItem["unit"] };

/**
 * Alta manual de productos a la alacena (texto → parseInventoryText →
 * memoria de productos → alacena), con el mismo "¿cuánto trae 1 [envase]?"
 * para lo ambiguo (bolsa/lata/pote sin tamaño conocido). Se usa tanto en
 * Compras (modo completo, con textarea) como en un "+" rápido dentro de
 * Alacena (modo compacto, un solo renglón) — misma lógica, dos wrappers.
 */
export function QuickAddProducts({
  addStructuredItems,
  productMemory,
  compact = false,
  autoFocus = false,
}: {
  addStructuredItems: (entries: AiShoppingItem[]) => void;
  productMemory: ProductMemoryApi;
  compact?: boolean;
  autoFocus?: boolean;
}) {
  const [raw, setRaw] = useState("");
  const [status, setStatus] = useState("");
  // Envases sin tamaño conocido (bolsa de premezcla, lata, pote...),
  // esperando que el usuario diga cuánto trae cada uno antes de sumarlos —
  // junto con lo que ya estaba resuelto (por memoria o cantidad clara).
  const [pending, setPending] = useState<PendingItem[] | null>(null);
  const [pendingReady, setPendingReady] = useState<AiShoppingItem[]>([]);
  const [pendingDrafts, setPendingDrafts] = useState<Record<string, PendingDraft>>({});

  const parseFromText = () => {
    if (!raw.trim()) {
      setStatus("Escribí o dictá los productos primero.");
      return;
    }

    const parsed = parseInventoryText(raw);
    const ready: AiShoppingItem[] = [];
    const toAsk: PendingItem[] = [];

    parsed.forEach((entry) => {
      const mem = productMemory.lookup(entry.name);
      if (entry.needsQuantity) {
        if (mem?.unitQuantity && mem.unit) {
          ready.push({
            name: entry.name,
            quantity: entry.quantity * mem.unitQuantity,
            unit: mem.unit,
            category: mem.category,
            nutritionPer100g: mem.nutritionPer100g,
          });
        } else {
          toAsk.push({ name: entry.name, containerCount: entry.quantity });
        }
      } else {
        // Si la unidad salió de adivinar (no vino explícita en el texto,
        // ej. "2 alfajor" sin "u."/"g") y ya sabemos por otra carga previa
        // cuál es la unidad real de este producto, usamos esa en vez de
        // la adivinanza.
        const unit = !entry.unitExplicit && mem?.unit ? mem.unit : entry.unit;
        ready.push({ name: entry.name, quantity: entry.quantity, unit, category: mem?.category, nutritionPer100g: mem?.nutritionPer100g });
      }
    });

    if (toAsk.length > 0) {
      setPending(toAsk);
      setPendingReady(ready);
      const drafts: Record<string, PendingDraft> = {};
      toAsk.forEach((item) => {
        drafts[item.name] = { amount: "", unit: "g" };
      });
      setPendingDrafts(drafts);
      setStatus("");
      return;
    }

    addStructuredItems(ready);
    setRaw("");
    setStatus("Agregado a la alacena ✓");
  };

  const pendingComplete = pending?.every((item) => Number(pendingDrafts[item.name]?.amount) > 0) ?? false;

  const confirmPending = () => {
    if (!pending || !pendingComplete) return;
    const resolved: AiShoppingItem[] = [];
    for (const item of pending) {
      const draft = pendingDrafts[item.name];
      const amount = Number(draft?.amount);
      resolved.push({ name: item.name, quantity: item.containerCount * amount, unit: draft.unit });
      productMemory.remember({ name: item.name, unitQuantity: amount, unit: draft.unit });
    }
    addStructuredItems([...pendingReady, ...resolved]);
    setPending(null);
    setPendingReady([]);
    setPendingDrafts({});
    setRaw("");
    setStatus("Agregado a la alacena ✓");
  };

  const discardPending = () => {
    setPending(null);
    setPendingReady([]);
    setPendingDrafts({});
  };

  if (pending) {
    return (
      <div>
        <div className="mb-3 rounded-xl border border-gold/40 bg-gold/10 p-2.5">
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-gold mb-2">
            No sé cuánto trae cada envase — decime y lo recuerdo para la próxima
          </div>
          <div className="space-y-2">
            {pending.map((item) => {
              const draft = pendingDrafts[item.name] || { amount: "", unit: "g" as const };
              return (
                <div key={item.name} className="rounded-lg border border-border bg-bg/40 p-2">
                  <div className="mb-1.5 text-[12px] text-text">
                    ¿Cuánto trae 1 {item.name}
                    {item.containerCount > 1 ? ` (tenés ${item.containerCount})` : ""}?
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      inputMode="decimal"
                      placeholder="cantidad"
                      value={draft.amount}
                      onChange={(event) => setPendingDrafts((prev) => ({ ...prev, [item.name]: { ...draft, amount: event.target.value } }))}
                      className="flex-1"
                    />
                    <select
                      value={draft.unit}
                      onChange={(event) =>
                        setPendingDrafts((prev) => ({ ...prev, [item.name]: { ...draft, unit: event.target.value as InventoryItem["unit"] } }))
                      }
                    >
                      <option value="g">g</option>
                      <option value="ml">ml</option>
                      <option value="u.">u.</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={confirmPending}
            disabled={!pendingComplete}
            className="flex-1 rounded-xl border border-gold/60 bg-gold px-3 py-2 font-sans font-bold text-[12px] text-bg disabled:cursor-not-allowed disabled:opacity-40"
          >
            Guardar y agregar a la alacena
          </button>
          <button
            onClick={discardPending}
            className="rounded-xl border border-border bg-bg/60 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted"
          >
            Cancelar
          </button>
        </div>
        {status && <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-sage">{status}</div>}
      </div>
    );
  }

  if (compact) {
    return (
      <div>
        <div className="flex gap-2">
          <input
            type="text"
            autoFocus={autoFocus}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && parseFromText()}
            placeholder="Ej: 2 tomates, 200 g queso, 1 kg pollo"
            className="flex-1"
          />
          <button
            type="button"
            onClick={parseFromText}
            className="shrink-0 rounded-lg border border-gold/60 bg-gold px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-bg"
          >
            Agregar
          </button>
        </div>
        {status && <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-sage">{status}</div>}
      </div>
    );
  }

  return (
    <div>
      <textarea
        rows={4}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder="Ej: 1 kg pollo, 2 tomates, queso 200g, arroz, yogurt"
        className="mb-2"
      />
      <button
        onClick={parseFromText}
        className="w-full rounded-xl border border-gold/60 bg-gold px-3 py-2 font-sans font-bold text-[12px] text-bg"
      >
        Agregar a la alacena
      </button>
      {status && <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-sage">{status}</div>}
    </div>
  );
}
