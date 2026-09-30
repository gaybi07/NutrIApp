"use client";

import { useMemo, useState } from "react";
import { DayMealOptions, InventoryItem, MealKey, MEAL_LABELS, Weekday, WeekPlan, WEEKDAYS } from "@/lib/types";
import { RECIPES } from "@/lib/recipes";
import { fuzzyNameMatch } from "@/lib/foodText";
import { inventoryKey } from "@/lib/useInventory";
import { btn, chip } from "@/components/buttonStyles";
import { fmtDate, isoMonday, addDays } from "@/lib/calculations";

const MEAL_KEYS: MealKey[] = ["des", "alm", "mer", "cen", "col"];
const DOW = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

type Ingredient = { name: string; quantity: number; unit: "g" | "ml" | "u." };
type PlanDays = Partial<Record<Weekday, DayMealOptions>>;

function weekDatesFrom(monday: Date) {
  return [...Array(7)].map((_, i) => fmtDate(addDays(monday, i)));
}

function fmtQty(quantity: number, unit: Ingredient["unit"]) {
  const rounded = Math.round(quantity * 10) / 10;
  return unit === "u." ? `${rounded} u.` : `${rounded} ${unit}`;
}

/**
 * Lista de compras de una semana: se eligen qué comidas entran, se cruza con lo que hay en la Alacena y queda
 * lo que falta. Se copia, se manda por WhatsApp o se descarga. Las comidas salen de lo que la persona eligió en el
 * planificador (weekPlan), con los ingredientes de las opciones de la Nutricionista o de las recetas del catálogo.
 */
export function ShoppingListCard({
  items,
  weekPlan,
  planThisWeek,
  planNextWeek,
}: {
  items: InventoryItem[];
  weekPlan: WeekPlan;
  planThisWeek: PlanDays;
  planNextWeek: PlanDays;
}) {
  const [which, setWhich] = useState<"next" | "this">("next");
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState("");

  const thisMonday = useMemo(() => isoMonday(fmtDate(new Date())), []);
  const dates = useMemo(() => weekDatesFrom(which === "next" ? addDays(thisMonday, 7) : thisMonday), [which, thisMonday]);
  const plan = which === "next" ? planNextWeek : planThisWeek;

  // Ingredientes de cada comida elegida (opción de la Nutricionista o receta del catálogo)
  const chosen = useMemo(() => {
    const out: { key: string; fecha: string; meal: MealKey; title: string; ingredients: Ingredient[] | null }[] = [];
    for (const fecha of dates) {
      const day = weekPlan[fecha];
      if (!day) continue;
      const weekday = WEEKDAYS[new Date(`${fecha}T00:00:00`).getDay()];
      for (const meal of MEAL_KEYS) {
        const title = day[meal];
        if (!title || title.startsWith("__")) continue; // "__skip__" y similares
        const recipe = RECIPES.find((r) => r.title === title);
        const option = plan[weekday]?.[meal]?.find((o) => o.nombre === title);
        const ingredients: Ingredient[] | null = recipe
          ? recipe.ingredients
          : option?.ingredientes?.length
            ? option.ingredientes.map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit as Ingredient["unit"] }))
            : null;
        out.push({ key: `${fecha}|${meal}`, fecha, meal, title, ingredients });
      }
    }
    return out;
  }, [dates, weekPlan, plan]);

  const included = chosen.filter((c) => !excluded.has(c.key));

  const rows = useMemo(() => {
    const totals = new Map<string, Ingredient>();
    for (const c of included) {
      for (const ing of c.ingredients || []) {
        const key = `${ing.name}|${ing.unit}`;
        const existing = totals.get(key);
        if (existing) existing.quantity += ing.quantity;
        else totals.set(key, { ...ing });
      }
    }
    return Array.from(totals.values())
      .map((needed) => {
        const key = inventoryKey(needed.name);
        const stock = items.find((item) => item.unit === needed.unit && fuzzyNameMatch(key, inventoryKey(item.name)));
        const have = stock ? stock.quantity : 0;
        return { ...needed, have, missing: Math.max(0, needed.quantity - have) };
      })
      .sort((a, b) => Number(b.missing > 0) - Number(a.missing > 0) || a.name.localeCompare(b.name, "es"));
  }, [included, items]);

  const missing = rows.filter((r) => r.missing > 0);
  const covered = rows.filter((r) => r.missing === 0);
  const withoutIngredients = included.filter((c) => !c.ingredients);

  const start = new Date(`${dates[0]}T00:00:00`);
  const end = new Date(`${dates[6]}T00:00:00`);
  const rangeLabel = `${start.getDate()} ${MONTHS[start.getMonth()]} al ${end.getDate()} ${MONTHS[end.getMonth()]}`;

  const text = useMemo(() => {
    if (missing.length === 0) return "";
    const lines = missing.map((r) => `- ${fmtQty(r.missing, r.unit)} ${r.name}`);
    return [`Lista de compras — semana del ${rangeLabel}`, "", ...lines].join("\n");
  }, [missing, rangeLabel]);

  const toggle = (key: string) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Lista copiada ✓");
    } catch {
      setStatus("No pude copiarla, seleccioná el texto de abajo y copialo a mano.");
    }
    setTimeout(() => setStatus(""), 4000);
  };

  const download = () => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lista-de-compras-${dates[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="rounded-2xl border border-border bg-surface/70 p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Lista de compras</div>
      <div className="mb-2 font-display text-xl text-text">Semana del {rangeLabel}</div>

      <div className="mb-3 flex gap-1.5">
        <button type="button" onClick={() => setWhich("next")} className={chip(which === "next")}>
          Semana que viene
        </button>
        <button type="button" onClick={() => setWhich("this")} className={chip(which === "this")}>
          Esta semana
        </button>
      </div>

      {chosen.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-3 text-[12px] text-textMuted">
          Todavía no elegiste comidas para esta semana. Elegilas en el planificador y acá te armo la lista de lo que te falta comprar.
        </div>
      ) : (
        <>
          <div className="mb-1 font-mono text-[9px] uppercase tracking-wide text-textMuted">
            Comidas que entran ({included.length} de {chosen.length}) — tocá para sacar o volver a sumar
          </div>
          <div className="mb-3 space-y-1">
            {dates.map((fecha) => {
              const dayChosen = chosen.filter((c) => c.fecha === fecha);
              if (dayChosen.length === 0) return null;
              const d = new Date(`${fecha}T00:00:00`);
              return (
                <div key={fecha} className="flex items-start gap-2">
                  <span className="w-14 shrink-0 pt-1.5 font-mono text-[9px] uppercase tracking-wide text-textMuted">
                    {DOW[d.getDay()]} {d.getDate()}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {dayChosen.map((c) => {
                      const on = !excluded.has(c.key);
                      return (
                        <button key={c.key} type="button" onClick={() => toggle(c.key)} className={`${chip(on)} max-w-full truncate !px-2.5 !py-1.5`} title={c.title}>
                          {on ? "✓ " : ""}
                          {MEAL_LABELS[c.meal]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mb-1 font-mono text-[9px] uppercase tracking-wide text-textMuted">Lo que necesitás y lo que tenés en la Alacena</div>
          {rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-3 text-[12px] text-textMuted">
              Las comidas elegidas no traen ingredientes con cantidad, así que no puedo calcular la lista.
            </div>
          ) : (
            <div className="space-y-1">
              {rows.map((r) => (
                <div
                  key={`${r.name}|${r.unit}`}
                  className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-[12px] ${
                    r.missing > 0 ? "border-rust/40 bg-rust/10" : "border-sage/40 bg-sage/10"
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate text-text">{r.name}</span>
                  <span className="shrink-0 font-mono text-[10px] text-textMuted">
                    necesitás {fmtQty(r.quantity, r.unit)} · tenés {fmtQty(r.have, r.unit)}
                  </span>
                  <span className={`shrink-0 font-mono text-[10px] font-bold ${r.missing > 0 ? "text-rust" : "text-sage"}`}>
                    {r.missing > 0 ? `faltan ${fmtQty(r.missing, r.unit)}` : "✓ tenés"}
                  </span>
                </div>
              ))}
            </div>
          )}

          {withoutIngredients.length > 0 && (
            <div className="mt-2 text-[11px] text-textMuted">
              Sin ingredientes cargados (no suman): {Array.from(new Set(withoutIngredients.map((c) => c.title))).join(", ")}.
            </div>
          )}

          {missing.length > 0 ? (
            <div className="mt-3 border-t border-dashed border-border pt-3">
              <div className="mb-1 text-[12px] text-text">
                Te falta comprar <b>{missing.length}</b> producto{missing.length === 1 ? "" : "s"}
                {covered.length > 0 ? ` (ya tenés ${covered.length})` : ""}.
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={copy} className={btn("primary", "md", true)}>
                  Copiar lista
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(text)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={btn("secondary", "md", true)}
                >
                  Enviar por WhatsApp
                </a>
              </div>
              <button type="button" onClick={download} className={`${btn("neutral", "sm", true)} mt-2`}>
                Guardar en un archivo (.txt)
              </button>
              {status && <div className="mt-1.5 text-[11px] text-sage">{status}</div>}
            </div>
          ) : (
            rows.length > 0 && <div className="mt-3 text-[12px] text-sage">Ya tenés todo lo que necesitás en la Alacena ✓</div>
          )}
        </>
      )}
    </section>
  );
}
