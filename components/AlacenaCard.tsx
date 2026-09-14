"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { InventoryCategory, InventoryItem, InventoryNutrition, INVENTORY_CATEGORIES, INVENTORY_CATEGORY_LABELS } from "@/lib/types";
import { ProductMemoryApi } from "@/lib/useProductMemory";
import { Collapsible } from "@/components/Collapsible";
import { SECTION_HELP } from "@/lib/helpText";
import { QuickAddProducts, AiShoppingItem } from "@/components/QuickAddProducts";
import { ExtraConsumption } from "@/components/ExtraConsumption";

const EMPTY_NUTRITION: InventoryNutrition = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
const REVIEW_BATCH_SIZE = 12;
const REVIEW_TIMEOUT_MS = 25000;

type OffResult = { name: string; brand: string | null; quantity: string | null; nutritionPer100g: InventoryNutrition };

type ReviewCorrection = {
  id: string;
  name: string;
  quantity: number;
  unit: InventoryItem["unit"];
  category?: InventoryCategory;
  nutritionPer100g?: InventoryNutrition;
};

export function AlacenaCard({
  items,
  replaceItems,
  updateItem,
  applyReview,
  productMemory,
  addStructuredItems,
  consumeAmounts,
}: {
  items: InventoryItem[];
  replaceItems: (items: InventoryItem[]) => void;
  updateItem: (id: string, patch: Partial<InventoryItem>) => void;
  applyReview: (corrections: ReviewCorrection[]) => void;
  productMemory: ProductMemoryApi;
  addStructuredItems: (entries: AiShoppingItem[]) => void;
  consumeAmounts: (amounts: Array<{ id: string; quantity: number }>) => void;
}) {
  const [filter, setFilter] = useState<InventoryCategory | "todas">("todas");
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showExtraConsumption, setShowExtraConsumption] = useState(false);
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [nutritionDraft, setNutritionDraft] = useState<InventoryNutrition>(EMPTY_NUTRITION);
  const [categoryDraft, setCategoryDraft] = useState<InventoryCategory>("otros");
  const [reviewing, setReviewing] = useState(false);
  const [status, setStatus] = useState("");
  const [labelImage, setLabelImage] = useState<string | null>(null);
  const [labelLoading, setLabelLoading] = useState(false);
  const [labelStatus, setLabelStatus] = useState("");
  const [offQuery, setOffQuery] = useState("");
  const [offResults, setOffResults] = useState<OffResult[]>([]);
  const [offLoading, setOffLoading] = useState(false);
  const [offStatus, setOffStatus] = useState("");

  const removeItem = (id: string) => replaceItems(items.filter((item) => item.id !== id));
  const clearAll = () => replaceItems([]);

  const presentCategories = useMemo(() => {
    const set = new Set(items.map((item) => item.category || "otros"));
    return INVENTORY_CATEGORIES.filter((c) => set.has(c.id));
  }, [items]);

  const visibleItems = useMemo(
    () => (filter === "todas" ? items : items.filter((item) => (item.category || "otros") === filter)),
    [items, filter]
  );

  const openItem = (item: InventoryItem) => {
    setSelected(item);
    setNutritionDraft(item.nutritionPer100g || EMPTY_NUTRITION);
    setCategoryDraft(item.category || "otros");
    setLabelImage(null);
    setLabelStatus("");
    setOffQuery(item.name);
    setOffResults([]);
    setOffStatus("");
  };

  const saveItem = () => {
    if (!selected) return;
    updateItem(selected.id, { category: categoryDraft, nutritionPer100g: nutritionDraft, nutritionConfirmed: true });
    productMemory.remember({ name: selected.name, category: categoryDraft, nutritionPer100g: nutritionDraft });
    setSelected(null);
  };

  const handleLabelUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLabelImage(String(reader.result));
    reader.readAsDataURL(file);
  };

  const readLabel = async () => {
    if (!selected || !labelImage) return;
    setLabelLoading(true);
    setLabelStatus("Leyendo etiqueta...");
    try {
      const res = await fetch("/api/parse-nutrition-label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: labelImage, name: selected.name, unit: selected.unit }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "No pude leer la etiqueta");
      setNutritionDraft({
        kcal: data.kcal || 0,
        protein: data.protein || 0,
        carbs: data.carbs || 0,
        fat: data.fat || 0,
        fiber: data.fiber || 0,
      });
      setLabelStatus("Listo — revisá los valores y guardá ↓");
    } catch (error) {
      setLabelStatus(error instanceof Error ? error.message : "No pude leer la etiqueta.");
    } finally {
      setLabelLoading(false);
    }
  };

  const searchOff = async () => {
    if (!offQuery.trim()) return;
    setOffLoading(true);
    setOffStatus("Buscando...");
    setOffResults([]);
    try {
      const res = await fetch(`/api/search-off?q=${encodeURIComponent(offQuery.trim())}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "No pude buscar en Open Food Facts");
      setOffResults(data.results || []);
      setOffStatus(data.results?.length ? "" : "No encontré nada con ese nombre — probá con otras palabras.");
    } catch (error) {
      setOffStatus(error instanceof Error ? error.message : "No pude buscar en Open Food Facts.");
    } finally {
      setOffLoading(false);
    }
  };

  const applyOffResult = (result: OffResult) => {
    setNutritionDraft(result.nutritionPer100g);
    setOffResults([]);
    setOffStatus(`Cargado desde Open Food Facts: ${result.name}${result.brand ? ` (${result.brand})` : ""} ✓`);
  };

  const reviewWithAi = async () => {
    if (items.length === 0) return;
    setReviewing(true);
    // Con la alacena entera en un solo pedido, un inventario grande puede
    // tardar más que el límite de la función serverless y el fetch se
    // queda esperando una respuesta que nunca llega — se manda en tandas
    // chicas (con timeout propio) y se van aplicando las correcciones a
    // medida que vuelven, así una tanda que falla no tira abajo las que
    // ya se resolvieron bien.
    const batches: InventoryItem[][] = [];
    for (let i = 0; i < items.length; i += REVIEW_BATCH_SIZE) batches.push(items.slice(i, i + REVIEW_BATCH_SIZE));

    let done = 0;
    try {
      for (const batch of batches) {
        setStatus(batches.length > 1 ? `Revisando con IA (tanda ${done + 1}/${batches.length})...` : "Revisando con IA...");
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REVIEW_TIMEOUT_MS);
        try {
          const res = await fetch("/api/review-inventory", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: batch.map((item) => ({ id: item.id, name: item.name, quantity: item.quantity, unit: item.unit })) }),
            signal: controller.signal,
          });
          const data = await res.json();
          if (!res.ok || !Array.isArray(data.items)) throw new Error(data.error || "No pude revisar el inventario");
          const corrections = data.items.map(
            (fix: { id: string; nombre: string; cantidad: number; unidad: InventoryItem["unit"]; categoria?: string; nutricion100g?: InventoryNutrition | null }) => ({
              id: fix.id,
              name: fix.nombre,
              quantity: fix.cantidad,
              unit: fix.unidad,
              category: fix.categoria as InventoryCategory | undefined,
              nutritionPer100g: fix.nutricion100g ?? undefined,
            })
          );
          applyReview(corrections);
          corrections.forEach((fix: ReviewCorrection) => {
            productMemory.remember({ name: fix.name, unit: fix.unit, category: fix.category, nutritionPer100g: fix.nutritionPer100g });
          });
        } finally {
          clearTimeout(timeout);
        }
        done += 1;
      }
      setStatus("Alacena revisada ✓");
    } catch (error) {
      const timedOut = error instanceof DOMException && error.name === "AbortError";
      setStatus(
        timedOut
          ? `Tardó demasiado y lo corté — ya quedaron aplicadas ${done} de ${batches.length} tandas. Tocá "Revisar con IA" de nuevo para el resto.`
          : error instanceof Error
            ? error.message
            : "No pude revisar el inventario."
      );
    } finally {
      setReviewing(false);
      setTimeout(() => setStatus(""), 6000);
    }
  };

  return (
    <Collapsible
      eyebrow="Alacena"
      title="Lo que tenés"
      info={SECTION_HELP.alacena}
      badge={
        <div className="rounded-full border border-border bg-bg/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted">
          {items.length} items
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setShowQuickAdd((prev) => !prev)}
          className={`flex items-center gap-1 rounded-xl border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] ${
            showQuickAdd ? "border-gold bg-gold text-bg" : "border-sage/60 bg-sage/10 text-sage"
          }`}
        >
          <span className="text-[13px] leading-none">+</span> Agregar productos
        </button>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => setShowExtraConsumption((prev) => !prev)}
            className={`flex items-center gap-1 rounded-xl border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] ${
              showExtraConsumption ? "border-rust bg-rust text-bg" : "border-rust/60 bg-rust/10 text-rust"
            }`}
          >
            <span className="text-[13px] leading-none">−</span> Uso extra / invitados
          </button>
        )}
        {items.length > 0 && (
          <>
            <button
              type="button"
              onClick={reviewWithAi}
              disabled={reviewing}
              className="rounded-xl border border-gold/60 bg-gold px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-bg disabled:opacity-60"
            >
              {reviewing ? "Revisando..." : "Revisar con IA"}
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="rounded-xl border border-border bg-bg/60 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted"
            >
              Vaciar alacena
            </button>
          </>
        )}
      </div>
      {status && <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-sage">{status}</div>}

      {showQuickAdd && (
        <div className="mb-3 rounded-xl border border-sage/40 bg-sage/5 p-2.5">
          <QuickAddProducts addStructuredItems={addStructuredItems} productMemory={productMemory} compact autoFocus />
        </div>
      )}

      {showExtraConsumption && (
        <div className="mb-3 rounded-xl border border-rust/40 bg-rust/5 p-2.5">
          <ExtraConsumption items={items} consumeAmounts={consumeAmounts} />
        </div>
      )}

      {items.length > 0 ? (
        <>

          {presentCategories.length > 1 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
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

          <div className="grid grid-cols-2 gap-2">
            {visibleItems.map((item) => (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => openItem(item)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openItem(item);
                  }
                }}
                className="flex cursor-pointer flex-col gap-1 rounded-xl border border-sage/60 bg-sage/10 px-2 py-2 text-left font-mono text-[11px] text-text"
              >
                <div className="flex items-center justify-between gap-2">
                  <span>
                    {item.name} <span className="text-gold">× {item.quantity} {item.unit}</span>
                  </span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      removeItem(item.id);
                    }}
                    className="shrink-0 text-rust"
                    aria-label={`Quitar ${item.name}`}
                  >
                    ×
                  </button>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-wide text-textMuted">
                  {INVENTORY_CATEGORY_LABELS[item.category || "otros"]}
                  {item.nutritionPer100g ? " · valor cargado" : ""}
                </span>
                {!item.nutritionPer100g && (
                  <span className="font-mono text-[9px] uppercase tracking-wide text-rust">⚠ falta nutrición, tocá para cargarla</span>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-3 text-[11px] text-textMuted">
          Todavía no cargaste nada. Tocá &quot;+ Agregar productos&quot; arriba, o subí una foto del ticket / dictá por audio más abajo en Compras.
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="font-display text-xl text-text">{selected.name}</div>
            <div className="mt-1 text-[11px] text-textMuted">
              {selected.unit === "u."
                ? "Valor nutricional por 1 unidad"
                : `Valor nutricional cada 100 ${selected.unit}`}{" "}
              — la IA lo estima al cargar; corregilo acá si hace falta (a mano o con una foto de la etiqueta) y queda fijo.
            </div>

            <div className="mt-3 rounded-lg border border-dashed border-border bg-bg/40 p-2.5">
              <label className="mb-2 flex cursor-pointer items-center justify-center rounded-lg border border-border bg-surfaceAlt px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-text">
                📷 Foto de la etiqueta nutricional
                <input type="file" accept="image/*" className="hidden" onChange={handleLabelUpload} />
              </label>
              {labelImage && (
                <div className="mb-2 overflow-hidden rounded-lg border border-border bg-bg/30">
                  <img src={labelImage} alt="Etiqueta nutricional" className="max-h-40 w-full object-cover" />
                </div>
              )}
              {labelImage && (
                <button
                  type="button"
                  onClick={readLabel}
                  disabled={labelLoading}
                  className="w-full rounded-lg border border-gold/60 bg-gold px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-bg disabled:opacity-60"
                >
                  {labelLoading ? "Leyendo..." : "Leer etiqueta con IA"}
                </button>
              )}
              {labelStatus && <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-sage">{labelStatus}</div>}
            </div>

            <div className="mt-3 rounded-lg border border-dashed border-border bg-bg/40 p-2.5">
              <label className="mb-2 flex items-center font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted">
                🔍 Buscar en Open Food Facts
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={offQuery}
                  onChange={(event) => setOffQuery(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && searchOff()}
                  placeholder="ej: yogur ser natural"
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={searchOff}
                  disabled={offLoading}
                  className="shrink-0 rounded-lg border border-gold/60 bg-gold px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-bg disabled:opacity-60"
                >
                  {offLoading ? "..." : "Buscar"}
                </button>
              </div>
              {offResults.length > 0 && (
                <div className="mt-2 flex max-h-48 flex-col gap-1.5 overflow-y-auto">
                  {offResults.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => applyOffResult(r)}
                      className="rounded-lg border border-border bg-bg/60 p-2 text-left text-[11px] hover:border-gold/60"
                    >
                      <div className="text-text">
                        {r.name}
                        {r.brand ? ` · ${r.brand}` : ""}
                      </div>
                      <div className="font-mono text-[9px] uppercase tracking-wide text-textMuted">
                        {r.nutritionPer100g.kcal} kcal /100g · {r.nutritionPer100g.protein}g prot {r.quantity ? `· ${r.quantity}` : ""}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {offStatus && <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-sage">{offStatus}</div>}
            </div>

            <label className="mt-3 block">Categoría</label>
            <select value={categoryDraft} onChange={(event) => setCategoryDraft(event.target.value as InventoryCategory)} className="mt-1 w-full">
              {INVENTORY_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div>
                <label>Kcal</label>
                <input
                  type="number"
                  min="0"
                  value={nutritionDraft.kcal}
                  onChange={(event) => setNutritionDraft({ ...nutritionDraft, kcal: Number(event.target.value) || 0 })}
                />
              </div>
              <div>
                <label>Proteína (g)</label>
                <input
                  type="number"
                  min="0"
                  value={nutritionDraft.protein}
                  onChange={(event) => setNutritionDraft({ ...nutritionDraft, protein: Number(event.target.value) || 0 })}
                />
              </div>
              <div>
                <label>Carbohidratos (g)</label>
                <input
                  type="number"
                  min="0"
                  value={nutritionDraft.carbs}
                  onChange={(event) => setNutritionDraft({ ...nutritionDraft, carbs: Number(event.target.value) || 0 })}
                />
              </div>
              <div>
                <label>Grasas (g)</label>
                <input
                  type="number"
                  min="0"
                  value={nutritionDraft.fat}
                  onChange={(event) => setNutritionDraft({ ...nutritionDraft, fat: Number(event.target.value) || 0 })}
                />
              </div>
              <div>
                <label>Fibra (g)</label>
                <input
                  type="number"
                  min="0"
                  value={nutritionDraft.fiber}
                  onChange={(event) => setNutritionDraft({ ...nutritionDraft, fiber: Number(event.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setSelected(null)} className="rounded-lg border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-textMuted">
                Cancelar
              </button>
              <button type="button" onClick={saveItem} className="rounded-lg border border-sage/50 bg-sage/10 px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-sage">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </Collapsible>
  );
}
