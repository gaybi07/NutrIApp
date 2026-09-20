"use client";

import { useEffect, useState } from "react";
import { InventoryCategory, InventoryItem, InventoryNutrition, InventoryZone } from "@/lib/types";
import { parseInventoryText } from "@/lib/useInventory";
import { ProductMemoryApi } from "@/lib/useProductMemory";
import { estimateNutritionFromOff } from "@/lib/offAverage";

export type AiShoppingItem = {
  name: string;
  quantity: number;
  unit: InventoryItem["unit"];
  category?: InventoryCategory;
  nutritionPer100g?: InventoryNutrition;
  zona?: InventoryZone;
  nutritionConfirmed?: boolean;
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
  prefillText,
  forceZone,
}: {
  addStructuredItems: (entries: AiShoppingItem[]) => void;
  productMemory: ProductMemoryApi;
  compact?: boolean;
  autoFocus?: boolean;
  /** Para completar el renglón desde afuera (ej. el escáner de productos)
   * en vez de que el usuario lo escriba -- cada valor nuevo reemplaza el
   * texto actual. */
  prefillText?: string;
  /** Si viene seteada (ej. "+ Agregar acá" desde una zona de la Cocina
   * Virtual), todo lo que se agregue en este uso queda con esa zona y la
   * memoria de productos la recuerda para la próxima vez, sin importar
   * desde dónde se vuelva a cargar ese producto. */
  forceZone?: InventoryZone;
}) {
  const [raw, setRaw] = useState("");
  const [status, setStatus] = useState("");
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (prefillText) setRaw(prefillText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillText]);
  // Envases sin tamaño conocido (bolsa de premezcla, lata, pote...),
  // esperando que el usuario diga cuánto trae cada uno antes de sumarlos —
  // junto con lo que ya estaba resuelto (por memoria o cantidad clara).
  const [pending, setPending] = useState<PendingItem[] | null>(null);
  const [pendingReady, setPendingReady] = useState<AiShoppingItem[]>([]);
  const [pendingDrafts, setPendingDrafts] = useState<Record<string, PendingDraft>>({});

  // Central: cualquier alta final (con o sin zona forzada) pasa por acá, así
  // se recuerda la zona en la memoria de productos una sola vez, en un solo
  // lugar, en vez de repetir la lógica en cada punto de salida de abajo.
  const finalize = (list: AiShoppingItem[]) => {
    const withZone = forceZone ? list.map((item) => ({ ...item, zona: item.zona ?? forceZone })) : list;
    if (forceZone) withZone.forEach((item) => productMemory.remember({ name: item.name, zona: forceZone }));
    addStructuredItems(withZone);
  };

  const parseFromText = async () => {
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
            zona: mem.zona,
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
        ready.push({ name: entry.name, quantity: entry.quantity, unit, category: mem?.category, nutritionPer100g: mem?.nutritionPer100g, zona: mem?.zona });
      }
    });

    // Para lo que todavía no tiene nutrición (ni de memoria ni recién
    // cargado), probamos resolverla sola promediando Open Food Facts antes
    // de sumarlo — así no queda "falta nutrición" por algo tan común como
    // fruta/verdura suelta. Si no hay suficiente acuerdo entre resultados,
    // sigue quedando sin cargar (rojo) como hasta ahora.
    const sinNutricion = ready.filter((item) => !item.nutritionPer100g);
    if (sinNutricion.length > 0) {
      setResolving(true);
      const estimaciones = await Promise.all(sinNutricion.map((item) => estimateNutritionFromOff(item.name)));
      sinNutricion.forEach((item, i) => {
        const estimada = estimaciones[i];
        if (!estimada) return;
        item.nutritionPer100g = estimada;
        productMemory.remember({ name: item.name, category: item.category, nutritionPer100g: estimada });
      });
      setResolving(false);
    }

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

    finalize(ready);
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
    finalize([...pendingReady, ...resolved]);
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
            disabled={resolving}
            className="shrink-0 rounded-lg border border-gold/60 bg-gold px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-bg disabled:opacity-60"
          >
            {resolving ? "..." : "Agregar"}
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
        disabled={resolving}
        onClick={parseFromText}
        className="w-full rounded-xl border border-gold/60 bg-gold px-3 py-2 font-sans font-bold text-[12px] text-bg disabled:opacity-60"
      >
        {resolving ? "Buscando información nutricional..." : "Agregar a la alacena"}
      </button>
      {status && <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-sage">{status}</div>}
    </div>
  );
}
