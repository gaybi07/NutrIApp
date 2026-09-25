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
import { getMealItems, applyMealItems, nutritionForAmount, unitsToGrams, tagGroup } from "@/lib/calculations";
import { useFoods } from "@/lib/useFoods";
import { useMealPreparations } from "@/lib/useMealPreparations";
import { SavePreparationToggle } from "@/components/SavePreparationToggle";

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
  // Para items guardados en gramos pero con un peso-por-unidad conocido (ej.
  // un alimento que no cayó en la heurística de "u." por nombre) -- deja
  // escribir "1" queriendo decir "1 banana" en vez de tener que pesarla.
  // La canasta y consumeAmounts siguen trabajando siempre en gramos (la
  // unidad real del item): esto solo cambia cómo se interpreta el número
  // que se escribe, convirtiéndolo ANTES de entrar a la canasta.
  const [unitMode, setUnitMode] = useState<Record<string, boolean>>({});
  const { gramsPerUnit } = useFoods();
  const { save: savePreparation } = useMealPreparations();
  const [savePrep, setSavePrep] = useState(false);
  const [prepName, setPrepName] = useState("");
  const [prepCategoria, setPrepCategoria] = useState("");

  const usable = useMemo(() => items.filter((i) => i.nutritionPer100g && i.quantity > 0), [items]);
  const missingCount = items.length - usable.length;

  const presentCategories = useMemo(() => {
    const set = new Set(usable.map((i) => i.category || "otros"));
    return INVENTORY_CATEGORIES.filter((c) => set.has(c.id));
  }, [usable]);

  const visible = filter === "todas" ? usable : usable.filter((i) => (i.category || "otros") === filter);

  const inBasket = (item: InventoryItem) => basket.find((b) => b.itemId === item.id)?.amount || 0;
  const remaining = (item: InventoryItem) => Math.max(0, item.quantity - inBasket(item));

  const draftFor = (item: InventoryItem) => drafts[item.id] ?? (item.unit === "u." || unitMode[item.id] ? "1" : String(Math.min(remaining(item), 100)));

  const addToBasket = (item: InventoryItem) => {
    const left = remaining(item);
    if (left <= 0) return;
    const typed = Number(draftFor(item)) || 0;
    const gpu = item.unit === "g" ? gramsPerUnit(item.name) : null;
    const amount = Math.min(unitMode[item.id] && gpu ? unitsToGrams(typed, gpu) : typed, left);
    if (amount <= 0) return;
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
    let nuevosItems: MealItem[] = basketDetails.map((b, i) => ({
      id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      nombre: b.item.name,
      kcal: b.nutrition.kcal,
      protein: b.nutrition.protein,
      carbs: b.nutrition.carbs,
      fat: b.nutrition.fat,
      fiber: b.nutrition.fiber,
      gramos: b.item.unit !== "u." ? b.amount : undefined,
      // Referencia al producto de la alacena del que se descontó, para que
      // editar/borrar esta comida después pueda devolver o restar stock en
      // vez de dejarlo desincronizado (ver MealsEditor.onInventoryDelta).
      fuenteAlacenaId: b.item.id,
      fuenteCantidad: b.amount,
      fuenteUnidad: b.item.unit,
      fuenteSnapshot: { name: b.item.name, category: b.item.category, nutritionPer100g: b.item.nutritionPer100g, zona: b.item.zona },
    }));
    if (savePrep && prepName.trim()) {
      nuevosItems = tagGroup(nuevosItems, prepName.trim());
      savePreparation(
        prepName,
        prepCategoria,
        basketDetails.map((b) => ({ nombre: b.item.name, cantidad: b.amount, unidad: b.item.unit })),
        meal
      );
    }
    const alimentosDelDia = Array.from(new Set([...(existing.alimentos || []), ...basketDetails.map((b) => b.item.name)]));
    const itemsActuales = getMealItems(existing, meal);
    const updated = { ...applyMealItems(existing, meal, [...itemsActuales, ...nuevosItems]), alimentos: alimentosDelDia };
    onUpsert(updated);
    consumeAmounts(basketDetails.map((b) => ({ id: b.item.id, quantity: b.amount })));
    onAdded?.(updated);
    setStatus(`Sumado a ${MEAL_LABELS[meal]} ✓ — descontado de tu alacena`);
    setBasket([]);
    setDrafts({});
    setSavePrep(false);
    setPrepName("");
    setPrepCategoria("");
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
          {visible.map((item) => {
            const left = remaining(item);
            const gpuForUnitItem = item.unit === "u." ? gramsPerUnit(item.name) : null;
            const gpuForGramItem = item.unit === "g" ? gramsPerUnit(item.name) : null;
            const inUnitMode = item.unit === "g" && Boolean(gpuForGramItem) && unitMode[item.id];
            return (
              <div key={item.id} className="flex items-center gap-2 rounded-lg border border-border bg-bg/40 px-2 py-1.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] text-text">{item.name}</div>
                  <div className="font-mono text-[9px] uppercase tracking-wide text-textMuted">
                    {left > 0 ? `tenés ${left} ${item.unit} disponible${left === 1 ? "" : "s"}` : "ya sumaste todo lo que tenías"} ·{" "}
                    {INVENTORY_CATEGORY_LABELS[item.category || "otros"]}
                    {gpuForUnitItem ? ` · 1 u. ≈ ${gpuForUnitItem} g` : ""}
                    {gpuForGramItem ? ` · 1 u. ≈ ${gpuForGramItem} g` : ""}
                  </div>
                </div>
                {gpuForGramItem && (
                  <button
                    type="button"
                    onClick={() => {
                      setUnitMode((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
                      setDrafts((prev) => ({ ...prev, [item.id]: "" }));
                    }}
                    className={`shrink-0 rounded-md border px-1.5 py-1 font-mono text-[9px] uppercase ${
                      inUnitMode ? "border-gold bg-gold text-bg" : "border-border bg-bg/60 text-textMuted"
                    }`}
                  >
                    {inUnitMode ? "u." : "g"}
                  </button>
                )}
                <input
                  type="number"
                  min="0"
                  max={inUnitMode ? undefined : left}
                  inputMode="decimal"
                  disabled={left <= 0}
                  value={draftFor(item)}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                  className="w-16 shrink-0 rounded-md border border-border bg-surface px-1.5 py-1 text-right font-mono text-[11px] disabled:opacity-40"
                />
                <span className="shrink-0 font-mono text-[9px] uppercase text-textMuted">{inUnitMode ? "u." : item.unit}</span>
                <button
                  type="button"
                  onClick={() => addToBasket(item)}
                  disabled={left <= 0}
                  className="shrink-0 rounded-md border border-gold/60 bg-gold px-2 py-1 font-mono text-[10px] uppercase text-bg disabled:opacity-40"
                >
                  +
                </button>
              </div>
            );
          })}
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
          <div className="mt-2 mb-2 font-mono text-[11px] text-textMuted">
            Total: <span className="text-text">{totals.kcal} kcal · {totals.protein}g prot</span>
          </div>
          {basketDetails.length > 1 && (
            <SavePreparationToggle
              open={savePrep}
              onToggleOpen={() => setSavePrep((v) => !v)}
              nombre={prepName}
              onChangeNombre={setPrepName}
              categoria={prepCategoria}
              onChangeCategoria={setPrepCategoria}
            />
          )}
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
