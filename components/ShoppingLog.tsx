"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { Collapsible } from "@/components/Collapsible";
import { MAX_TEXT_LENGTH } from "@/lib/inputLimits";
import { SECTION_HELP, FIELD_HELP } from "@/lib/helpText";
import { InfoHint } from "@/components/InfoHint";
import { useSpeechToText } from "@/lib/useSpeechToText";
import { InventoryCategory, InventoryItem, InventoryNutrition, INVENTORY_CATEGORY_LABELS } from "@/lib/types";
import { parseInventoryText } from "@/lib/useInventory";
import { ProductMemoryApi } from "@/lib/useProductMemory";

type AiShoppingItem = { name: string; quantity: number; unit: InventoryItem["unit"]; category?: InventoryCategory; nutritionPer100g?: InventoryNutrition };
type PendingItem = { name: string; containerCount: number };
type PendingDraft = { amount: string; unit: InventoryItem["unit"] };

export function ShoppingLog({
  addStructuredItems,
  productMemory,
}: {
  addStructuredItems: (entries: AiShoppingItem[]) => void;
  productMemory: ProductMemoryApi;
}) {
  const [raw, setRaw] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  // Lo que devolvió la IA, pendiente de que el usuario lo revise y confirme
  // antes de que se descuente/sume de verdad al inventario.
  const [aiResult, setAiResult] = useState<AiShoppingItem[] | null>(null);
  // Envases sin tamaño conocido (bolsa de premezcla, lata, pote...) del
  // alta manual/dictada, esperando que el usuario diga cuánto trae cada
  // uno antes de sumarlos — junto con lo que ya estaba resuelto (por
  // memoria o porque venía con cantidad clara), listo para combinar.
  const [pending, setPending] = useState<PendingItem[] | null>(null);
  const [pendingReady, setPendingReady] = useState<AiShoppingItem[]>([]);
  const [pendingDrafts, setPendingDrafts] = useState<Record<string, PendingDraft>>({});
  const { supported: speechSupported, recording, toggle: toggleRecording } = useSpeechToText(
    (transcript) => setRaw((prev) => (prev ? `${prev}, ${transcript}` : transcript)),
    () => setStatus("No pude escucharte, probá de nuevo o escribilo a mano.")
  );

  const parsedItems = useMemo(() => {
    return Array.from(
      new Set(
        raw
          .split(/\n|,|\|/)
          .map((part) => part.trim())
          .filter(Boolean)
          .map((item) => item.replace(/^[-•*]\s*/, ""))
      )
    );
  }, [raw]);

  const parseFromText = () => {
    if (!raw.trim()) {
      setStatus("Escribí o dictá los productos, o pegá el ticket primero.");
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
        ready.push({ name: entry.name, quantity: entry.quantity, unit: entry.unit, category: mem?.category, nutritionPer100g: mem?.nutritionPer100g });
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
    setStatus("Compra guardada ✓");
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
    setStatus("Compra guardada ✓");
  };

  const discardPending = () => {
    setPending(null);
    setPendingReady([]);
    setPendingDrafts({});
  };

  const readTicket = async () => {
    if (!raw.trim() && !imagePreview) {
      setStatus("Pegá el texto del ticket o subí una foto.");
      return;
    }

    setLoading(true);
    setStatus("Leyendo ticket...");

    try {
      const res = await fetch("/api/parse-shopping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: raw,
          imageDataUrl: imagePreview || undefined,
        }),
      });

      const responseText = await res.text();
      let data: {
        items?: Array<{ nombre: string; cantidad: number; unidad: InventoryItem["unit"]; categoria?: string; nutricion100g?: InventoryNutrition }>;
        error?: string;
      };
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error("El servidor no devolvió una respuesta válida. Reiniciá la app e intentá de nuevo.");
      }
      if (!res.ok || !Array.isArray(data.items)) {
        throw new Error(data.error || "No pude leer el ticket");
      }

      setAiResult(
        data.items.map((item) => {
          const mem = productMemory.lookup(item.nombre);
          const useMemory = mem?.unitQuantity != null && mem.unit;
          return {
            name: item.nombre,
            quantity: useMemory ? mem!.unitQuantity! : item.cantidad,
            unit: useMemory ? mem!.unit! : item.unidad,
            category: mem?.category ?? (item.categoria as InventoryCategory | undefined),
            nutritionPer100g: mem?.nutritionPer100g ?? item.nutricion100g,
          };
        })
      );
      setStatus(`Encontré ${data.items.length} productos — revisá y confirmá ↓`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No pude leer el ticket.");
    } finally {
      setLoading(false);
    }
  };

  const removeAiItem = (index: number) => setAiResult((prev) => (prev ? prev.filter((_, i) => i !== index) : prev));

  const confirmAiResult = () => {
    if (!aiResult || aiResult.length === 0) return;
    addStructuredItems(aiResult);
    aiResult.forEach((item) => {
      if (item.category || item.nutritionPer100g) {
        productMemory.remember({ name: item.name, category: item.category, nutritionPer100g: item.nutritionPer100g });
      }
    });
    setRaw("");
    setImagePreview(null);
    setStatus("Compra guardada ✓");
    setAiResult(null);
  };

  const discardAiResult = () => {
    setAiResult(null);
    setStatus("");
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(String(reader.result));
      setStatus("Foto cargada. Tocá \"Leer con IA\" para procesarla.");
    };
    reader.readAsDataURL(file);
  };

  return (
    <Collapsible eyebrow="Compras" title="Agregar productos" info={SECTION_HELP.compras}>
      {pending ? (
        <>
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
                        onChange={(event) =>
                          setPendingDrafts((prev) => ({ ...prev, [item.name]: { ...draft, amount: event.target.value } }))
                        }
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
        </>
      ) : aiResult ? (
        <>
          <div className="mb-3 rounded-xl border border-gold/40 bg-gold/10 p-2.5">
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-gold mb-2">
              Esto encontró la IA — sacá lo que no corresponda antes de confirmar
            </div>
            {aiResult.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {aiResult.map((item, index) => (
                  <span
                    key={`${item.name}-${index}`}
                    className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-text"
                  >
                    {item.name} × {item.quantity} {item.unit}
                    {item.category && <span className="text-textMuted">· {INVENTORY_CATEGORY_LABELS[item.category]}</span>}
                    <button type="button" onClick={() => removeAiItem(index)} className="text-rust" aria-label={`Quitar ${item.name}`}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-textMuted">No queda ningún producto — descartá y probá de nuevo.</div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={confirmAiResult}
              disabled={aiResult.length === 0}
              className="flex-1 rounded-xl border border-gold/60 bg-gold px-3 py-2 font-sans font-bold text-[12px] text-bg disabled:cursor-not-allowed disabled:opacity-40"
            >
              Confirmar y agregar a la alacena
            </button>
            <button
              onClick={discardAiResult}
              className="rounded-xl border border-border bg-bg/60 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted"
            >
              Descartar
            </button>
          </div>
        </>
      ) : (
        <>
          <label className="mb-2 flex cursor-pointer items-center justify-center rounded-xl border border-border bg-surfaceAlt px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-text">
            Subir foto del ticket
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>

          {speechSupported && (
            <button
              type="button"
              onClick={toggleRecording}
              className={`mb-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 p-2.5 font-sans text-[13px] font-bold uppercase tracking-wide transition-colors ${
                recording ? "border-rust bg-rust/15 text-rust animate-pulse" : "border-gold bg-gold/15 text-gold"
              }`}
            >
              <span className="text-lg leading-none">🎙️</span>
              {recording ? "Grabando… tocá para parar" : "Cargar con audio"}
            </button>
          )}

          <label className="mb-2 flex items-center font-mono text-[10px] uppercase tracking-[0.15em] text-textMuted">
            Escribí, dictá o pegá el texto del ticket
            <InfoHint text={FIELD_HELP.ticketTexto} />
          </label>
          <textarea
            rows={4}
            maxLength={MAX_TEXT_LENGTH}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="Ej: 1 kg pollo, 2 tomates, queso 200g, arroz, yogurt"
            className="mb-2"
          />

          {imagePreview && (
            <div className="mb-3 overflow-hidden rounded-xl border border-border bg-bg/30">
              <img src={imagePreview} alt="Ticket cargado" className="max-h-52 w-full object-cover" />
            </div>
          )}

          {parsedItems.length > 0 && (
            <div className="mb-3 rounded-xl border border-border bg-bg/40 p-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-textMuted mb-2">Vista previa</div>
              <div className="flex flex-wrap gap-2">
                {parsedItems.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-border bg-surface px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={readTicket}
              disabled={loading}
              className="flex-1 rounded-xl border border-gold/60 bg-gold px-3 py-2 font-sans font-bold text-[12px] text-bg disabled:opacity-60"
            >
              {loading ? "Leyendo..." : "Leer con IA"}
            </button>
            <button
              onClick={parseFromText}
              className="flex-1 rounded-xl border border-border bg-bg/60 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted"
            >
              Agregar tal cual
            </button>
          </div>
        </>
      )}

      {status && <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-sage">{status}</div>}
    </Collapsible>
  );
}
