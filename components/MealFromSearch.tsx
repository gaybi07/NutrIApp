"use client";

import { useState } from "react";
import { DayEntry, InventoryNutrition, MealItem, MealKey, MEAL_LABELS, emptyDay } from "@/lib/types";
import { getMealItems, applyMealItems, nutritionForAmount, tagGroup } from "@/lib/calculations";
import { useMealPreparations } from "@/lib/useMealPreparations";
import { SavePreparationToggle } from "@/components/SavePreparationToggle";

type OffResult = {
  name: string;
  brand: string | null;
  quantity: string | null;
  nutritionPer100g: InventoryNutrition;
};

type BasketEntry = { key: string; name: string; amountG: number; nutritionPer100g: InventoryNutrition };

/**
 * Cargar una comida buscando el producto en Open Food Facts (misma base que
 * usa Alacena para completar valores nutricionales) en vez de describirla
 * para que la IA la calcule — no gasta cuota de IA, sirve sobre todo para
 * productos envasados con código de barras/marca conocida.
 */
export function MealFromSearch({
  days,
  fecha,
  meal,
  onUpsert,
  onAdded,
}: {
  days: DayEntry[];
  fecha: string;
  meal: MealKey;
  onUpsert: (entry: DayEntry) => void;
  onAdded?: (updatedEntry: DayEntry) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OffResult[]>([]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [searching, setSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState("");
  const [basket, setBasket] = useState<BasketEntry[]>([]);
  const [status, setStatus] = useState("");
  const { save: savePreparation } = useMealPreparations();
  const [savePrep, setSavePrep] = useState(false);
  const [prepName, setPrepName] = useState("");
  const [prepCategoria, setPrepCategoria] = useState("");

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSearchStatus("Buscando...");
    setResults([]);
    try {
      const res = await fetch(`/api/search-off?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "No pude buscar en Open Food Facts");
      setResults(data.results || []);
      setSearchStatus(data.results?.length ? "" : "No encontré nada con ese nombre — probá con otras palabras.");
    } catch (error) {
      setSearchStatus(error instanceof Error ? error.message : "No pude buscar en Open Food Facts.");
    } finally {
      setSearching(false);
    }
  };

  const draftFor = (index: number) => drafts[index] ?? "100";

  const addToBasket = (result: OffResult, index: number) => {
    const amountG = Number(draftFor(index)) || 0;
    if (amountG <= 0) return;
    const key = `${result.name}::${result.brand || ""}`;
    setBasket((prev) => {
      const existing = prev.find((b) => b.key === key);
      if (existing) return prev.map((b) => (b.key === key ? { ...b, amountG: b.amountG + amountG } : b));
      return [...prev, { key, name: result.name, amountG, nutritionPer100g: result.nutritionPer100g }];
    });
  };

  const removeFromBasket = (key: string) => setBasket((prev) => prev.filter((b) => b.key !== key));

  const basketDetails = basket
    .map((b) => {
      const nutrition = nutritionForAmount({ unit: "g", nutritionPer100g: b.nutritionPer100g }, b.amountG);
      if (!nutrition) return null;
      return { ...b, nutrition };
    })
    .filter((b): b is BasketEntry & { nutrition: InventoryNutrition } => b !== null);

  const totals = basketDetails.reduce(
    (acc, b) => ({ kcal: acc.kcal + b.nutrition.kcal, protein: acc.protein + b.nutrition.protein }),
    { kcal: 0, protein: 0 }
  );

  const confirm = () => {
    if (basketDetails.length === 0) return;
    const existing = days.find((d) => d.fecha === fecha) || emptyDay(fecha);
    let nuevosItems: MealItem[] = basketDetails.map((b, i) => ({
      id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      nombre: b.name,
      kcal: b.nutrition.kcal,
      protein: b.nutrition.protein,
      carbs: b.nutrition.carbs,
      fat: b.nutrition.fat,
      fiber: b.nutrition.fiber,
      gramos: b.amountG,
    }));
    if (savePrep && prepName.trim()) {
      nuevosItems = tagGroup(nuevosItems, prepName.trim());
      savePreparation(
        prepName,
        prepCategoria,
        basketDetails.map((b) => ({ nombre: b.name, cantidad: b.amountG, unidad: "g" as const })),
        meal
      );
    }
    const alimentosDelDia = Array.from(new Set([...(existing.alimentos || []), ...basketDetails.map((b) => b.name)]));
    const itemsActuales = getMealItems(existing, meal);
    const updated = { ...applyMealItems(existing, meal, [...itemsActuales, ...nuevosItems]), alimentos: alimentosDelDia };
    onUpsert(updated);
    onAdded?.(updated);
    setStatus(`Sumado a ${MEAL_LABELS[meal]} ✓`);
    setBasket([]);
    setResults([]);
    setQuery("");
    setSavePrep(false);
    setPrepName("");
    setPrepCategoria("");
    setTimeout(() => setStatus(""), 4000);
  };

  return (
    <div className="mt-2">
      <div className="flex gap-1.5">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && search()}
          placeholder="ej: yogur ser natural"
          className="flex-1"
        />
        <button
          type="button"
          onClick={search}
          disabled={searching}
          className="shrink-0 rounded-lg border border-gold/60 bg-gold px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-bg disabled:opacity-60"
        >
          {searching ? "..." : "Buscar"}
        </button>
      </div>
      {searchStatus && <div className="mt-1.5 text-[11px] text-textMuted">{searchStatus}</div>}

      {results.length > 0 && (
        <div className="mt-2 flex flex-col gap-1.5">
          {results.map((result, i) => (
            <div key={`${result.name}-${i}`} className="flex items-center gap-2 rounded-lg border border-border bg-bg/40 px-2 py-1.5">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] text-text">{result.name}</div>
                <div className="font-mono text-[9px] uppercase tracking-wide text-textMuted">
                  {result.brand ? `${result.brand} · ` : ""}
                  {result.nutritionPer100g.kcal} kcal / 100g
                </div>
              </div>
              <input
                type="number"
                min="0"
                inputMode="decimal"
                value={draftFor(i)}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [i]: e.target.value }))}
                className="w-16 shrink-0 rounded-md border border-border bg-surface px-1.5 py-1 text-right font-mono text-[11px]"
              />
              <span className="shrink-0 font-mono text-[9px] uppercase text-textMuted">g</span>
              <button
                type="button"
                onClick={() => addToBasket(result, i)}
                className="shrink-0 rounded-md border border-gold/60 bg-gold px-2 py-1 font-mono text-[10px] uppercase text-bg"
              >
                +
              </button>
            </div>
          ))}
        </div>
      )}

      {basketDetails.length > 0 && (
        <div className="mt-3 rounded-xl border border-gold/40 bg-gold/10 p-2.5">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-gold">Vas a sumar</div>
          <div className="flex flex-col gap-1.5">
            {basketDetails.map((b) => (
              <div key={b.key} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg/40 px-2 py-1.5 text-[11px]">
                <span className="min-w-0 flex-1 truncate text-text">
                  {b.name} × {b.amountG}g
                </span>
                <span className="shrink-0 text-textMuted">{b.nutrition.kcal} kcal · {b.nutrition.protein}g prot</span>
                <button type="button" onClick={() => removeFromBasket(b.key)} aria-label={`Sacar ${b.name}`} className="shrink-0 text-rust">
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
          <button type="button" onClick={confirm} className="mt-2 w-full rounded-lg p-3 font-sans font-bold text-sm bg-gold text-bg">
            Sumar a {MEAL_LABELS[meal]}
          </button>
        </div>
      )}

      {status && <div className="mt-2 text-center font-mono text-[11px] text-sage">{status}</div>}
    </div>
  );
}
