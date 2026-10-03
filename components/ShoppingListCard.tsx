"use client";

import { useMemo, useState } from "react";
import { DayMealOptions, InventoryItem, MealKey, MEAL_LABELS, Weekday, WeekPlan, WEEKDAYS } from "@/lib/types";
import { RECIPES } from "@/lib/recipes";
import { fuzzyNameMatch, shoppingName, shoppingSection, SHOPPING_SECTIONS } from "@/lib/foodText";
import { inventoryKey } from "@/lib/useInventory";
import { btn, chip } from "@/components/buttonStyles";
import { fmtDate, isoMonday, addDays } from "@/lib/calculations";
import { useEscapeKey } from "@/lib/useEscapeKey";
import { useHouseholdExports, ExportedMeal } from "@/lib/useHouseholdExports";
import { HouseholdInfo } from "@/lib/useHousehold";

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
/** Ingredientes sumados de una parte exportada (sin descontar la Alacena), para revisar qué exportó cada uno. */
function sumExport(items: ExportedMeal[]) {
  const totals = new Map<string, Ingredient>();
  for (const it of items) {
    for (const raw of it.ingredients || []) {
      const ing = { ...raw, name: shoppingName(raw.name) };
      const key = `${inventoryKey(ing.name)}|${ing.unit}`;
      const existing = totals.get(key);
      if (existing) existing.quantity += ing.quantity;
      else totals.set(key, { ...ing });
    }
  }
  return Array.from(totals.values()).sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export function ShoppingListCard({
  items,
  weekPlan,
  planThisWeek,
  planNextWeek,
  onOpenPlanner,
  household,
}: {
  items: InventoryItem[];
  weekPlan: WeekPlan;
  planThisWeek: PlanDays;
  planNextWeek: PlanDays;
  /** Abre el planificador de la semana que viene, donde se eligen las comidas. */
  onOpenPlanner: () => void;
  /** Con Alacena compartida, la lista sale de las partes que exportó cada integrante, no solo de las tuyas. */
  household: HouseholdInfo | null;
}) {
  const [which, setWhich] = useState<"next" | "this">("next");
  const [status, setStatus] = useState("");
  // La lista NO se arma sola: recién cuando se toca "Armar lista". Se guarda con qué selección se armó, para
  // avisar si después se cambian las comidas elegidas.
  const [builtFor, setBuiltFor] = useState<string | null>(null);
  // Con la lista armada: descontar lo que ya hay en la Alacena (solo lo que falta) o mostrar TODO lo que piden las comidas.
  const [useStock, setUseStock] = useState(true);
  // La lista armada se recuerda por semana en este navegador: al volver no hace falta tocar "Armar lista" otra vez.
  // (Se recalcula sola con lo elegido y con lo que hay en la Alacena; lo guardado es solo que ya estaba armada.)
  const [rememberedWeeks, setRememberedWeeks] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("registro:listaArmada") || "[]");
    } catch {
      return [];
    }
  });
  const markBuilt = (weekStart: string, key: string) => {
    setBuiltFor(key);
    setRememberedWeeks((prev) => {
      const next = prev.includes(weekStart) ? prev : [...prev.slice(-5), weekStart];
      try {
        localStorage.setItem("registro:listaArmada", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

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

  const groupMode = Boolean(household && household.memberCount > 1);
  const weekStartStr = dates[0];
  const exports = useHouseholdExports(groupMode ? household!.id : null, weekStartStr);
  const myExport: ExportedMeal[] = chosen.map((c) => ({ fecha: c.fecha, meal: c.meal, title: c.title, ingredients: c.ingredients }));
  const myExportKey = myExport.map((m) => `${m.fecha}:${m.meal}:${m.title}`).join("|");
  const exportedKey = (exports.mine?.items || []).map((m) => `${m.fecha}:${m.meal}:${m.title}`).join("|");
  const allExported = groupMode ? exports.rows.length >= household!.memberCount : true;
  const myExportStale = groupMode && Boolean(exports.mine) && exportedKey !== myExportKey;
  const missingMembers = groupMode ? Math.max(0, household!.memberCount - exports.rows.length) : 0;

  // La lista del grupo suma las partes exportadas de TODOS (la tuya se toma de lo exportado, no de lo que cambiaste después).
  const included = useMemo(() => {
    if (!groupMode) return chosen;
    return exports.rows.flatMap((row) =>
      row.items.map((it) => ({ key: `${row.user_id}|${it.fecha}|${it.meal}`, fecha: it.fecha, meal: it.meal, title: it.title, ingredients: it.ingredients }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupMode, chosen, exports.rows]);
  const selectionKey = useMemo(() => `${which}|` + included.map((c) => `${c.key}:${c.title}`).join("|"), [which, included]);
  // En el grupo la lista sale de lo exportado: cuando exportaron todos queda armada sola (sin tocar "Armar lista").
  const hasListSource = groupMode ? included.length > 0 : chosen.length > 0;
  const built = builtFor !== null || (chosen.length > 0 && rememberedWeeks.includes(dates[0])) || (groupMode && allExported && included.length > 0);
  const [showFull, setShowFull] = useState(false);
  useEscapeKey(() => setShowFull(false), showFull);
  const stale = builtFor !== null && builtFor !== selectionKey;

  // Comidas que el plan ofrece esa semana (las que no se eligen quedan pendientes en el almanaque)
  const offeredCount = useMemo(() => {
    let n = 0;
    for (const fecha of dates) {
      const day = plan[WEEKDAYS[new Date(`${fecha}T00:00:00`).getDay()]];
      if (day) for (const meal of MEAL_KEYS) if ((day[meal]?.length ?? 0) > 0) n++;
    }
    return n;
  }, [dates, plan]);

  const rows = useMemo(() => {
    const totals = new Map<string, Ingredient>();
    for (const c of included) {
      for (const raw of c.ingredients || []) {
        const ing = { ...raw, name: shoppingName(raw.name) };
        const key = `${inventoryKey(ing.name)}|${ing.unit}`;
        const existing = totals.get(key);
        if (existing) existing.quantity += ing.quantity;
        else totals.set(key, { ...ing });
      }
    }
    return Array.from(totals.values())
      .map((needed) => {
        const key = inventoryKey(needed.name);
        const stock = items.find((item) => item.unit === needed.unit && fuzzyNameMatch(key, inventoryKey(item.name)));
        const have = useStock && stock ? stock.quantity : 0;
        return { ...needed, have, missing: Math.max(0, needed.quantity - have) };
      })
      .sort((a, b) => Number(b.missing > 0) - Number(a.missing > 0) || a.name.localeCompare(b.name, "es"));
  }, [included, items, useStock]);

  const missing = rows.filter((r) => r.missing > 0);
  const covered = rows.filter((r) => r.missing === 0);
  const withoutIngredients = included.filter((c) => !c.ingredients);

  const start = new Date(`${dates[0]}T00:00:00`);
  const end = new Date(`${dates[6]}T00:00:00`);
  const rangeLabel = `${start.getDate()} ${MONTHS[start.getMonth()]} al ${end.getDate()} ${MONTHS[end.getMonth()]}`;

  const text = useMemo(() => {
    if (missing.length === 0) return "";
    const out = [`Lista de compras — semana del ${rangeLabel}`];
    for (const section of SHOPPING_SECTIONS) {
      const inSection = missing.filter((r) => shoppingSection(r.name) === section);
      if (inSection.length === 0) continue;
      out.push("", `*${section}*`, ...inSection.map((r) => `- ${fmtQty(r.missing, r.unit)} ${r.name}`));
    }
    return out.join("\n");
  }, [missing, rangeLabel]);

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
    <section id="lista-compras" className="scroll-mt-20 rounded-2xl border border-border bg-surface/70 p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Lista de compras</div>
      <div className="mb-2 font-display text-xl text-text">Semana del {rangeLabel}</div>

      <div className="mb-3 flex gap-1.5">
        <button type="button" onClick={() => { setWhich("next"); setBuiltFor(null); }} className={chip(which === "next")}>
          Semana que viene
        </button>
        <button type="button" onClick={() => { setWhich("this"); setBuiltFor(null); }} className={chip(which === "this")}>
          Esta semana
        </button>
      </div>

      <div className="rounded-xl border border-border bg-bg/30 p-2.5">
        <div className="text-[13px] text-text">
          Elegiste <b>{chosen.length}</b> de <b>{offeredCount || chosen.length}</b> comidas de tu plan
          {offeredCount > chosen.length ? <span className="text-textMuted"> · {offeredCount - chosen.length} sin elegir (quedan pendientes)</span> : null}
        </div>
        <div className="mt-0.5 text-[11px] text-textMuted">
          Primero elegí qué comidas vas a seguir; las que no elijas (un evento, una salida) quedan pendientes en el almanaque. Después armás la lista.
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {which === "next" ? (
            <button type="button" onClick={onOpenPlanner} className={btn("secondary", "md", true)}>
              Elegir mis comidas
            </button>
          ) : (
            <div />
          )}
          {groupMode ? (
            <button
              type="button"
              disabled={chosen.length === 0 || exports.busy || (Boolean(exports.mine) && !myExportStale)}
              onClick={async () => {
                await exports.exportMine(myExport);
              }}
              className={`${btn(exports.mine && !myExportStale ? "neutral" : "secondary", "md", true)} ${which === "next" ? "" : "col-span-2"}`}
            >
              {exports.busy ? "Exportando..." : exports.mine ? (myExportStale ? "Actualizar lo exportado" : "Exportado a la cena compartida ✓") : "Exportar a la cena compartida"}
            </button>
          ) : (
            <button
              type="button"
              disabled={chosen.length === 0}
              onClick={() => markBuilt(dates[0], selectionKey)}
              className={`${btn("primary", "md", true)} ${which === "next" ? "" : "col-span-2"}`}
            >
              {built ? "Actualizar lista" : "Armar lista de compras"}
            </button>
          )}
        </div>

        {groupMode && (
          <div className="mt-2 rounded-lg border border-gold/40 bg-gold/5 p-2">
            <div className="font-mono text-[9px] uppercase tracking-wide text-gold">Alacena compartida · {household!.name}</div>
            <div className="mt-1 space-y-0.5 text-[12px]">
              <div className={exports.mine ? "text-sage" : "text-text"}>
                {exports.mine ? `✓ Vos exportaste a la cena compartida (${exports.mine.items.length} comidas)` : "• Falta que exportes tus comidas a la cena compartida"}
                {myExportStale && <span className="text-textMuted"> · cambiaste comidas, actualizala</span>}
              </div>
              {exports.rows
                .filter((r) => r.user_id !== exports.mine?.user_id)
                .map((r) => (
                  <div key={r.user_id} className="text-sage">
                    ✓ {r.nombre || "Integrante"} exportó a la cena compartida ({r.items.length} comidas)
                  </div>
                ))}
              {missingMembers > 0 && (
                <div className="text-textMuted">
                  • Falta{missingMembers === 1 ? "" : "n"} {missingMembers} integrante{missingMembers === 1 ? "" : "s"} por exportar
                </div>
              )}
            </div>
            {exports.rows.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {[...exports.rows]
                  .sort((a, b) => (a.user_id === exports.mine?.user_id ? -1 : b.user_id === exports.mine?.user_id ? 1 : 0))
                  .map((r) => {
                    const mineRow = r.user_id === exports.mine?.user_id;
                    const sums = sumExport(r.items);
                    const noIngredients = r.items.filter((it) => !it.ingredients || it.ingredients.length === 0).length;
                    return (
                      <details key={r.user_id} className="rounded-lg border border-border bg-bg/40 px-2.5 py-1.5">
                        <summary className="cursor-pointer text-[12px] text-text">
                          {mineRow ? "Tu lista" : `Lista de ${r.nombre || "Integrante"}`}{" "}
                          <span className="text-textMuted">
                            · {r.items.length} comidas · {sums.length} productos
                          </span>
                        </summary>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {sums.map((i) => (
                            <span key={`${i.name}-${i.unit}`} className="rounded-full border border-border bg-bg px-2 py-0.5 font-mono text-[10px] text-text">
                              {fmtQty(i.quantity, i.unit)} {i.name}
                            </span>
                          ))}
                        </div>
                        {noIngredients > 0 && (
                          <div className="mt-1 text-[11px] text-rust">
                            {noIngredients} comida{noIngredients === 1 ? "" : "s"} sin ingredientes con cantidad (no suman a la lista).
                          </div>
                        )}
                        <div className="mt-1 font-mono text-[9px] text-textMuted">
                          Exportada el {new Date(r.exported_at).toLocaleDateString("es-AR", { day: "numeric", month: "numeric" })} a las{" "}
                          {new Date(r.exported_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </details>
                    );
                  })}
              </div>
            )}
            {exports.error && <div className="mt-1 text-[11px] text-rust">No se pudo exportar: {exports.error}. Si dice que la sesión venció, cerrá sesión y volvé a entrar.</div>}
            <button
              type="button"
              disabled={!allExported || included.length === 0}
              onClick={() => markBuilt(dates[0], selectionKey)}
              className={`${btn("primary", "md", true)} mt-2`}
            >
              {built ? "Actualizar lista compartida" : allExported ? "Armar lista compartida" : "Esperando a que exporten todos"}
            </button>
          </div>
        )}
      </div>

      {!hasListSource && (
        <div className="mt-2 rounded-lg border border-dashed border-border p-3 text-[12px] text-textMuted">
          Todavía no elegiste comidas para {which === "next" ? "la semana que viene" : "esta semana"}. Tocá &quot;Elegir mis comidas&quot; y después armá la lista.
        </div>
      )}

      {built && hasListSource && (
        <div className="mt-3">
          {stale && (
            <div className="mb-2 rounded-lg border border-gold/40 bg-gold/10 px-2.5 py-1.5 text-[12px] text-text">
              Cambiaste tus comidas después de armar la lista. Tocá <b>Actualizar lista</b> para recalcularla.
            </div>
          )}
          {rows.length > 0 && (
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <button type="button" onClick={() => setUseStock(true)} className={chip(useStock)}>
                Descontar lo que ya tengo
              </button>
              <button type="button" onClick={() => setUseStock(false)} className={chip(!useStock)}>
                Todo lo que piden las comidas
              </button>
            </div>
          )}
          {rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-3 text-[12px] text-textMuted">
              Las comidas elegidas no traen ingredientes con cantidad, así que no puedo calcular la lista.
            </div>
          ) : missing.length === 0 ? (
            <div className="rounded-lg border border-sage/40 bg-sage/10 px-3 py-2 text-[12px] text-sage">
              Ya tenés todo lo que necesitás en la Alacena ✓
            </div>
          ) : (
            <div className="rounded-xl border border-gold/40 bg-gold/5 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[13px] text-text">
                  Te falta comprar <b>{missing.length}</b> producto{missing.length === 1 ? "" : "s"}
                  {covered.length > 0 ? <span className="text-textMuted"> · ya tenés {covered.length}</span> : null}
                </div>
                <button type="button" onClick={() => setShowFull(true)} className={`${btn("neutral", "sm")} shrink-0`}>
                  Ver lista
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className={btn("primary", "sm", true)}>
                  Enviar por WhatsApp
                </a>
                <button type="button" onClick={copy} className={btn("secondary", "sm", true)}>
                  Copiar
                </button>
              </div>
              {status && <div className="mt-1.5 text-[11px] text-sage">{status}</div>}
            </div>
          )}
        </div>
      )}

      {showFull && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-bg/80 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setShowFull(false)}>
          <div
            className="flex max-h-[88vh] w-full max-w-md flex-col rounded-t-2xl border border-border bg-surface shadow-2xl sm:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 border-b border-border p-4 pb-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">Lista de compras</div>
                <div className="font-display text-lg text-text">Semana del {rangeLabel}</div>
              </div>
              <button type="button" onClick={() => setShowFull(false)} className={btn("neutral", "sm")}>
                Cerrar
              </button>
            </div>
            <div className="overflow-y-auto p-4 pt-3">
              {missing.length > 0 && (
                <>
                  <div className="mb-1 font-mono text-[9px] uppercase tracking-wide text-rust">Te falta comprar ({missing.length})</div>
                  {SHOPPING_SECTIONS.map((section) => {
                    const inSection = missing.filter((r) => shoppingSection(r.name) === section);
                    if (inSection.length === 0) return null;
                    return (
                      <div key={section} className="mt-2">
                        <div className="mb-1 font-mono text-[9px] uppercase tracking-wide text-gold">
                          {section} ({inSection.length})
                        </div>
                        <div className="space-y-1">
                          {inSection.map((r) => (
                            <div key={`${r.name}|${r.unit}`} className="flex items-center justify-between gap-2 rounded-lg border border-rust/40 bg-rust/10 px-2.5 py-1.5 text-[12px]">
                              <span className="min-w-0 flex-1 truncate text-text">{r.name}</span>
                              <span className="shrink-0 font-mono text-[10px] font-bold text-rust">{fmtQty(r.missing, r.unit)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
              {covered.length > 0 && (
                <>
                  <div className="mb-1 mt-3 font-mono text-[9px] uppercase tracking-wide text-sage">Ya tenés en la Alacena ({covered.length})</div>
                  <div className="space-y-1">
                    {covered.map((r) => (
                      <div key={`${r.name}|${r.unit}`} className="flex items-center justify-between gap-2 rounded-lg border border-sage/40 bg-sage/10 px-2.5 py-1.5 text-[12px]">
                        <span className="min-w-0 flex-1 truncate text-text">{r.name}</span>
                        <span className="shrink-0 font-mono text-[10px] text-sage">✓ {fmtQty(r.quantity, r.unit)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {withoutIngredients.length > 0 && (
                <div className="mt-3 text-[11px] text-textMuted">
                  Sin ingredientes cargados (no suman): {Array.from(new Set(withoutIngredients.map((c) => c.title))).join(", ")}.
                </div>
              )}
            </div>
            {missing.length > 0 && (
              <div className="grid grid-cols-3 gap-2 border-t border-border p-3">
                <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className={btn("primary", "sm", true)}>
                  WhatsApp
                </a>
                <button type="button" onClick={copy} className={btn("secondary", "sm", true)}>
                  Copiar
                </button>
                <button type="button" onClick={download} className={btn("neutral", "sm", true)}>
                  .txt
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
