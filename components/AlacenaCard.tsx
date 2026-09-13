"use client";

import { useMemo, useState } from "react";
import { InventoryCategory, InventoryItem, InventoryNutrition, INVENTORY_CATEGORIES, INVENTORY_CATEGORY_LABELS } from "@/lib/types";
import { Collapsible } from "@/components/Collapsible";
import { SECTION_HELP } from "@/lib/helpText";

const EMPTY_NUTRITION: InventoryNutrition = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

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
}: {
  items: InventoryItem[];
  replaceItems: (items: InventoryItem[]) => void;
  updateItem: (id: string, patch: Partial<InventoryItem>) => void;
  applyReview: (corrections: ReviewCorrection[]) => void;
}) {
  const [filter, setFilter] = useState<InventoryCategory | "todas">("todas");
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [nutritionDraft, setNutritionDraft] = useState<InventoryNutrition>(EMPTY_NUTRITION);
  const [categoryDraft, setCategoryDraft] = useState<InventoryCategory>("otros");
  const [reviewing, setReviewing] = useState(false);
  const [status, setStatus] = useState("");

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
  };

  const saveItem = () => {
    if (!selected) return;
    updateItem(selected.id, { category: categoryDraft, nutritionPer100g: nutritionDraft, nutritionConfirmed: true });
    setSelected(null);
  };

  const reviewWithAi = async () => {
    if (items.length === 0) return;
    setReviewing(true);
    setStatus("Revisando con IA...");
    try {
      const res = await fetch("/api/review-inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: items.map((item) => ({ id: item.id, name: item.name, quantity: item.quantity, unit: item.unit })) }),
      });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.items)) throw new Error(data.error || "No pude revisar el inventario");
      applyReview(
        data.items.map((fix: { id: string; nombre: string; cantidad: number; unidad: InventoryItem["unit"]; categoria?: string; nutricion100g?: InventoryNutrition }) => ({
          id: fix.id,
          name: fix.nombre,
          quantity: fix.cantidad,
          unit: fix.unidad,
          category: fix.categoria as InventoryCategory | undefined,
          nutritionPer100g: fix.nutricion100g,
        }))
      );
      setStatus("Alacena revisada ✓");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No pude revisar el inventario.");
    } finally {
      setReviewing(false);
      setTimeout(() => setStatus(""), 4000);
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
      {items.length > 0 ? (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
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
          </div>
          {status && <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-sage">{status}</div>}

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
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-3 text-[11px] text-textMuted">
          Todavía no cargaste nada. Sumá productos desde Compras, más abajo.
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
              Valor nutricional cada 100{selected.unit === "u." ? " unidad" : selected.unit} — la IA lo estima al cargar; corregilo acá si hace falta y queda fijo.
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
