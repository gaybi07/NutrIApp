"use client";

import { useMemo, useState } from "react";
import { InventoryCategory, InventoryItem, InventoryNutrition, INVENTORY_CATEGORIES, INVENTORY_CATEGORY_LABELS } from "@/lib/types";
import { nutritionForAmount } from "@/lib/calculations";
import { AiShoppingItem } from "@/components/QuickAddProducts";

type BasketEntry = { itemId: string; amount: number };

const EMPTY_TOTALS: InventoryNutrition = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

/**
 * "Hice una torta/guiso/lo que sea con esto" -- elegís qué usaste de la
 * alacena (se descuenta como stock, igual que "Uso extra"), decís en
 * cuántas porciones lo dividiste, y se suma un producto nuevo a la
 * alacena ("Comida preparada", en unidades = porciones) con el valor
 * nutricional total repartido entre las porciones. Sin zona a propósito:
 * cae en "mesada" hasta que lo guardes en su lugar, como cualquier cosa
 * recién hecha que todavía está afuera.
 */
export function PrepareDish({
  items,
  consumeAmounts,
  addStructuredItems,
}: {
  items: InventoryItem[];
  consumeAmounts: (amounts: Array<{ id: string; quantity: number }>) => void;
  addStructuredItems: (entries: AiShoppingItem[]) => void;
}) {
  const [filter, setFilter] = useState<InventoryCategory | "todas">("todas");
  const [basket, setBasket] = useState<BasketEntry[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"elegir" | "porciones">("elegir");
  const [dishName, setDishName] = useState("");
  const [portions, setPortions] = useState("");
  const [status, setStatus] = useState("");

  // "variadas" -- para cuando no todas las porciones son iguales (ej. una
  // porción grande para vos, una chica para tu pareja). En vez de repartir
  // el total en N porciones iguales, se pesa el plato ya preparado y se
  // arman uno o más "tamaños" (peso por porción + cuántas de ese tamaño
  // salieron); cada tamaño se guarda como un producto de alacena distinto.
  const [portionMode, setPortionMode] = useState<"iguales" | "variadas">("iguales");
  const [totalWeight, setTotalWeight] = useState("");
  const [groups, setGroups] = useState<Array<{ id: string; label: string; gramos: string; cantidad: string }>>([
    { id: "1", label: "", gramos: "", cantidad: "" },
  ]);

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
      if (!item) return null;
      const nutrition = nutritionForAmount(item, b.amount);
      return { item, amount: b.amount, nutrition };
    })
    .filter((b): b is { item: InventoryItem; amount: number; nutrition: InventoryNutrition | null } => b !== null);

  const totals = basketDetails.reduce<InventoryNutrition>((acc, b) => {
    if (!b.nutrition) return acc;
    return {
      kcal: acc.kcal + b.nutrition.kcal,
      protein: acc.protein + b.nutrition.protein,
      carbs: acc.carbs + (b.nutrition.carbs || 0),
      fat: acc.fat + (b.nutrition.fat || 0),
      fiber: acc.fiber + (b.nutrition.fiber || 0),
    };
  }, EMPTY_TOTALS);

  const missingNutrition = basketDetails.some((b) => !b.nutrition);
  const portionsNum = Number(portions);
  const perPortion: InventoryNutrition | null =
    portionsNum > 0
      ? {
          kcal: Math.round(totals.kcal / portionsNum),
          protein: Math.round(totals.protein / portionsNum),
          carbs: Math.round(totals.carbs / portionsNum),
          fat: Math.round(totals.fat / portionsNum),
          fiber: Math.round(totals.fiber / portionsNum),
        }
      : null;

  const totalWeightNum = Number(totalWeight);
  const parsedGroups = groups
    .map((g) => ({ ...g, gramosNum: Number(g.gramos), cantidadNum: Number(g.cantidad) }))
    .filter((g) => g.gramosNum > 0 && g.cantidadNum > 0);
  const assignedWeight = parsedGroups.reduce((sum, g) => sum + g.gramosNum * g.cantidadNum, 0);
  const groupPreviews =
    totalWeightNum > 0
      ? parsedGroups.map((g) => {
          const fraction = g.gramosNum / totalWeightNum;
          const nutrition: InventoryNutrition = {
            kcal: Math.round(totals.kcal * fraction),
            protein: Math.round(totals.protein * fraction),
            carbs: Math.round((totals.carbs || 0) * fraction),
            fat: Math.round((totals.fat || 0) * fraction),
            fiber: Math.round((totals.fiber || 0) * fraction),
          };
          return { ...g, nutrition };
        })
      : [];

  const addGroup = () => setGroups((prev) => [...prev, { id: String(Date.now()), label: "", gramos: "", cantidad: "" }]);
  const removeGroup = (id: string) => setGroups((prev) => (prev.length > 1 ? prev.filter((g) => g.id !== id) : prev));
  const updateGroup = (id: string, patch: Partial<{ label: string; gramos: string; cantidad: string }>) =>
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));

  const resetAll = () => {
    setBasket([]);
    setDrafts({});
    setDishName("");
    setPortions("");
    setPortionMode("iguales");
    setTotalWeight("");
    setGroups([{ id: "1", label: "", gramos: "", cantidad: "" }]);
    setStep("elegir");
  };

  const confirm = () => {
    if (!perPortion || !dishName.trim() || basketDetails.length === 0) return;
    consumeAmounts(basketDetails.map((b) => ({ id: b.item.id, quantity: b.amount })));
    addStructuredItems([
      {
        name: dishName.trim(),
        quantity: portionsNum,
        unit: "u.",
        category: "preparado",
        nutritionPer100g: perPortion,
        nutritionConfirmed: true,
      },
    ]);
    setStatus(`Guardado "${dishName.trim()}" (${portionsNum} porciones) en la alacena ✓ — elegile una zona en "Ver cocina".`);
    resetAll();
    setTimeout(() => setStatus(""), 8000);
  };

  const confirmVariadas = () => {
    if (!dishName.trim() || basketDetails.length === 0 || totalWeightNum <= 0 || groupPreviews.length === 0) return;
    consumeAmounts(basketDetails.map((b) => ({ id: b.item.id, quantity: b.amount })));
    const multi = groupPreviews.length > 1;
    addStructuredItems(
      groupPreviews.map((g) => ({
        name: multi ? `${dishName.trim()} (${g.label.trim() || `${g.gramosNum}g`})` : dishName.trim(),
        quantity: g.cantidadNum,
        unit: "u.",
        category: "preparado",
        nutritionPer100g: g.nutrition,
        nutritionConfirmed: true,
      }))
    );
    setStatus(
      `Guardado "${dishName.trim()}" en ${groupPreviews.length} tamaño${multi ? "s" : ""} de porción en la alacena ✓ — elegile una zona en "Ver cocina".`
    );
    resetAll();
    setTimeout(() => setStatus(""), 8000);
  };

  if (available.length === 0) {
    return <div className="rounded-xl border border-dashed border-border p-3 text-[12px] text-textMuted">Todavía no tenés nada cargado.</div>;
  }

  return (
    <div>
      <div className="mb-2 text-[11px] text-textMuted">
        Elegí qué usaste de la alacena para lo que cocinaste — se descuenta el stock, y al final armamos un producto nuevo con el
        valor nutricional repartido entre las porciones que salieron.
      </div>

      {step === "elegir" && (
        <>
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
                  className="shrink-0 rounded-md border border-gold/60 bg-gold/10 px-2 py-1 font-mono text-[10px] uppercase text-gold"
                >
                  +
                </button>
              </div>
            ))}
          </div>

          {basketDetails.length > 0 && (
            <div className="mt-3 rounded-xl border border-gold/40 bg-gold/10 p-2.5">
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-gold">Vas a usar</div>
              <div className="flex flex-col gap-1.5">
                {basketDetails.map((b) => (
                  <div key={b.item.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg/40 px-2 py-1.5 text-[11px]">
                    <span className="min-w-0 flex-1 truncate text-text">
                      {b.item.name} × {b.amount} {b.item.unit}
                    </span>
                    <span className="shrink-0 text-textMuted">{b.nutrition ? `${b.nutrition.kcal} kcal` : "sin nutrición"}</span>
                    <button type="button" onClick={() => removeFromBasket(b.item.id)} aria-label={`Sacar ${b.item.name}`} className="shrink-0 text-rust">
                      ×
                    </button>
                  </div>
                ))}
              </div>
              {missingNutrition && (
                <div className="mt-2 text-[10px] text-rust">
                  Algo de esto no tiene nutrición cargada — el total va a quedar incompleto. Cargala antes desde la lista si querés
                  un cálculo exacto.
                </div>
              )}
              <button
                type="button"
                onClick={() => setStep("porciones")}
                className="mt-2 w-full rounded-lg p-3 font-sans font-bold text-sm bg-gold text-bg"
              >
                Listo, calcular porciones →
              </button>
            </div>
          )}
        </>
      )}

      {step === "porciones" && (
        <div className="rounded-xl border border-gold/40 bg-gold/10 p-2.5">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-gold">
            Total de lo que usaste: {Math.round(totals.kcal)} kcal · {Math.round(totals.protein)}g prot
          </div>

          <label className="mb-1 block">Nombre del plato</label>
          <input
            type="text"
            value={dishName}
            onChange={(e) => setDishName(e.target.value)}
            placeholder="Ej: Torta de banana y avena"
            className="mb-2 w-full"
            autoFocus
          />

          <div className="mb-2.5 flex gap-1 rounded-full border border-border bg-bg/60 p-0.5">
            <button
              type="button"
              onClick={() => setPortionMode("iguales")}
              className={`flex-1 rounded-full px-3 py-1 font-mono text-[9.5px] uppercase tracking-wide ${
                portionMode === "iguales" ? "bg-gold text-bg" : "text-textMuted"
              }`}
            >
              Porciones iguales
            </button>
            <button
              type="button"
              onClick={() => setPortionMode("variadas")}
              className={`flex-1 rounded-full px-3 py-1 font-mono text-[9.5px] uppercase tracking-wide ${
                portionMode === "variadas" ? "bg-gold text-bg" : "text-textMuted"
              }`}
            >
              Tamaños distintos
            </button>
          </div>

          {portionMode === "iguales" ? (
            <>
              <label className="mb-1 block">¿Cuántas porciones salieron?</label>
              <input
                type="number"
                min="1"
                inputMode="numeric"
                value={portions}
                onChange={(e) => setPortions(e.target.value)}
                placeholder="Ej: 16"
                className="w-full"
              />

              {perPortion && (
                <div className="mt-2 rounded-lg border border-border bg-bg/40 p-2 text-[11px] text-textMuted">
                  Cada porción: <span className="text-text">{perPortion.kcal} kcal</span> · {perPortion.protein}g prot ·{" "}
                  {perPortion.carbs}g carb · {perPortion.fat}g grasa · {perPortion.fiber}g fibra
                </div>
              )}
            </>
          ) : (
            <>
              <label className="mb-1 block">Peso total del plato ya preparado (g)</label>
              <input
                type="number"
                min="1"
                inputMode="decimal"
                value={totalWeight}
                onChange={(e) => setTotalWeight(e.target.value)}
                placeholder="Ej: 3000"
                className="w-full"
              />
              <div className="mt-1 text-[10px] text-textMuted">
                Pesalo ya cocinado, en la fuente/olla — de ahí se calcula cuánto le toca a cada tamaño de porción.
              </div>

              <div className="mt-2.5 flex flex-col gap-2">
                {groups.map((g) => {
                  const preview = groupPreviews.find((p) => p.id === g.id);
                  return (
                    <div key={g.id} className="rounded-lg border border-border bg-bg/40 p-2">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={g.label}
                          onChange={(e) => updateGroup(g.id, { label: e.target.value })}
                          placeholder="Nombre (opcional, ej: grande)"
                          className="min-w-0 flex-[2]"
                        />
                        <input
                          type="number"
                          min="1"
                          inputMode="decimal"
                          value={g.gramos}
                          onChange={(e) => updateGroup(g.id, { gramos: e.target.value })}
                          placeholder="g c/u"
                          className="w-16 min-w-0"
                        />
                        <input
                          type="number"
                          min="1"
                          inputMode="numeric"
                          value={g.cantidad}
                          onChange={(e) => updateGroup(g.id, { cantidad: e.target.value })}
                          placeholder="cant."
                          className="w-14 min-w-0"
                        />
                        {groups.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeGroup(g.id)}
                            aria-label="Quitar este tamaño"
                            className="shrink-0 text-rust"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      {preview && (
                        <div className="mt-1.5 text-[10px] text-textMuted">
                          Cada una: <span className="text-text">{preview.nutrition.kcal} kcal</span> · {preview.nutrition.protein}g prot ·{" "}
                          {preview.nutrition.carbs}g carb · {preview.nutrition.fat}g grasa
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={addGroup}
                className="mt-2 w-full rounded-lg border border-dashed border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide text-textMuted"
              >
                + Agregar otro tamaño de porción
              </button>

              {totalWeightNum > 0 && assignedWeight > 0 && (
                <div className={`mt-2 text-[10px] ${assignedWeight > totalWeightNum ? "text-rust" : "text-textMuted"}`}>
                  Asignaste {assignedWeight}g de {totalWeightNum}g
                  {assignedWeight > totalWeightNum ? " — te pasaste del peso total" : ""}
                </div>
              )}
            </>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setStep("elegir")}
              className="rounded-lg border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-textMuted"
            >
              ‹ Volver
            </button>
            {portionMode === "iguales" ? (
              <button
                type="button"
                onClick={confirm}
                disabled={!perPortion || !dishName.trim()}
                className="rounded-lg border border-gold/60 bg-gold px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-bg disabled:opacity-40"
              >
                Guardar plato
              </button>
            ) : (
              <button
                type="button"
                onClick={confirmVariadas}
                disabled={!dishName.trim() || totalWeightNum <= 0 || groupPreviews.length === 0}
                className="rounded-lg border border-gold/60 bg-gold px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-bg disabled:opacity-40"
              >
                Guardar plato
              </button>
            )}
          </div>
        </div>
      )}

      {status && <div className="mt-2 text-center font-mono text-[11px] text-sage">{status}</div>}
    </div>
  );
}
