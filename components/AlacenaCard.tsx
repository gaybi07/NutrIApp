"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { DayEntry, InventoryCategory, InventoryItem, InventoryNutrition, MealItem, MEAL_LABELS, INVENTORY_CATEGORIES, INVENTORY_CATEGORY_LABELS, PurchaseRecord } from "@/lib/types";
import { ProductMemoryApi } from "@/lib/useProductMemory";
import { Collapsible } from "@/components/Collapsible";
import { SECTION_HELP } from "@/lib/helpText";
import { QuickAddProducts, AiShoppingItem } from "@/components/QuickAddProducts";
import { ShoppingLog } from "@/components/ShoppingLog";
import { CocinaView } from "@/components/CocinaView";
import { ExtraConsumption } from "@/components/ExtraConsumption";
import { PrepareDish } from "@/components/PrepareDish";
import { ProductScanner } from "@/components/ProductScanner";
import { inventoryKey } from "@/lib/useInventory";
import { getMealItems, applyMealItems, suggestedMeal, nutritionForAmount } from "@/lib/calculations";
import { generateProductQrDataUrl } from "@/lib/generateProductQr";

const EMPTY_NUTRITION: InventoryNutrition = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
const REVIEW_BATCH_SIZE = 12;
const REVIEW_TIMEOUT_MS = 25000;
// "Revisar con IA" gasta una llamada a la API de IA por tanda -- para no
// recargarla, cada toque revisa como mucho estos ítems (priorizando los que
// más lo necesitan) y después el botón queda bloqueado un rato.
const REVIEW_MAX_ITEMS_PER_RUN = 5;
const REVIEW_LOCK_MS = 60 * 60 * 1000;

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
  aiReviewLockedUntil,
  onAiReviewLockedUntilChange,
  todayEntry,
  onUpsertDay,
  addPurchases,
  householdName,
}: {
  items: InventoryItem[];
  replaceItems: (items: InventoryItem[]) => void;
  updateItem: (id: string, patch: Partial<InventoryItem>) => void;
  applyReview: (corrections: ReviewCorrection[]) => void;
  productMemory: ProductMemoryApi;
  addStructuredItems: (entries: AiShoppingItem[]) => void;
  consumeAmounts: (amounts: Array<{ id: string; quantity: number }>) => void;
  aiReviewLockedUntil?: number;
  onAiReviewLockedUntilChange: (until: number) => void;
  /** Para el escáner: al consumir un producto escaneado, se suma directo a
   * la comida que corresponda por horario (ver suggestedMeal). */
  todayEntry: DayEntry;
  onUpsertDay: (entry: DayEntry) => void;
  addPurchases: (entries: Array<Omit<PurchaseRecord, "id">>) => void;
  /** Nombre del grupo (Casita Gabi y Fla, etc.) cuando la alacena es
   * compartida -- así el título deja de decir siempre "Alacena" a secas y
   * queda claro de qué alacena se trata cuando hay más de una persona. */
  householdName?: string;
}) {
  const [showCocina, setShowCocina] = useState(false);
  // La lista con buscador/filtros queda oculta por default -- mezclada con
  // los botones de arriba se sentía como "demasiados datos a la vista" sin
  // haber pedido verla. Se despliega solo al tocar "Ver lista".
  const [showList, setShowList] = useState(false);
  const [filter, setFilter] = useState<InventoryCategory | "todas">("todas");
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  // "escribir" = alta rápida por texto (QuickAddProducts, lo de siempre);
  // "ticket" = lo que antes era la sección aparte "Compras" -- foto/audio del
  // ticket + lectura con IA -- unificado acá adentro de "+ Agregar
  // productos" para no tener dos secciones separadas con el mismo nombre.
  const [addMode, setAddMode] = useState<"escribir" | "ticket">("escribir");
  const [showExtraConsumption, setShowExtraConsumption] = useState(false);
  const [showPrepareDish, setShowPrepareDish] = useState(false);
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
  const [now, setNow] = useState(() => Date.now());
  const [showScanner, setShowScanner] = useState(false);
  const [scannedItem, setScannedItem] = useState<InventoryItem | null>(null);
  const [consumeAmount, setConsumeAmount] = useState("");
  const [consumeUnit, setConsumeUnit] = useState<InventoryItem["unit"]>("g");
  const [scanPrefill, setScanPrefill] = useState<string | undefined>(undefined);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  // Solo para que la cuenta regresiva del bloqueo de "Revisar con IA" se
  // actualice sola en pantalla -- no dispara ningún pedido de red.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const reviewLockMsLeft = Math.max(0, (aiReviewLockedUntil || 0) - now);
  const reviewLocked = reviewLockMsLeft > 0;
  const reviewLockLabel = (() => {
    if (!reviewLocked) return "";
    const totalMin = Math.ceil(reviewLockMsLeft / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return h > 0 ? `${h} h ${m} min` : `${m} min`;
  })();

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

  const missingNutritionCount = useMemo(() => items.filter((item) => !item.nutritionPer100g).length, [items]);

  const openItem = (item: InventoryItem) => {
    setSelected(item);
    setNutritionDraft(item.nutritionPer100g || EMPTY_NUTRITION);
    setCategoryDraft(item.category || "otros");
    setLabelImage(null);
    setLabelStatus("");
    setOffQuery(item.name);
    setOffResults([]);
    setOffStatus("");
    setQrDataUrl(null);
  };

  const generateQr = async () => {
    if (!selected) return;
    setQrLoading(true);
    try {
      setQrDataUrl(await generateProductQrDataUrl(selected.name));
    } finally {
      setQrLoading(false);
    }
  };

  // Al escanear el código de un producto ya generado, si coincide con algo
  // que ya tenés en la Alacena lo tratamos como "vengo a consumirlo"; si no
  // coincide con nada, lo tratamos como "es nuevo, vengo a agregarlo" y se
  // precarga el mismo flujo de siempre (con el promedio de Open Food Facts
  // incluido) en vez de duplicar esa lógica acá.
  const handleScan = (decodedText: string) => {
    setShowScanner(false);
    const key = inventoryKey(decodedText);
    const match = items.find((item) => inventoryKey(item.name) === key);
    if (match) {
      setScannedItem(match);
      setConsumeUnit(match.unit);
      setConsumeAmount(match.unit === "u." ? "1" : "100");
    } else {
      setShowQuickAdd(true);
      setScanPrefill(decodedText);
    }
  };

  const confirmConsume = () => {
    if (!scannedItem) return;
    const amount = Number(consumeAmount);
    if (!amount || amount <= 0) return;
    const meal = suggestedMeal(todayEntry, new Date().getHours());
    const nutricion = nutritionForAmount(scannedItem, amount);
    if (nutricion) {
      const nuevoItem: MealItem = {
        id: `${Date.now()}-scan-${Math.random().toString(36).slice(2, 7)}`,
        nombre: scannedItem.name,
        ...nutricion,
        gramos: scannedItem.unit !== "u." ? amount : undefined,
      };
      const itemsActuales = getMealItems(todayEntry, meal);
      onUpsertDay(applyMealItems(todayEntry, meal, [...itemsActuales, nuevoItem]));
    }
    consumeAmounts([{ id: scannedItem.id, quantity: amount }]);
    setStatus(
      nutricion
        ? `Descontado ${amount} ${scannedItem.unit} de ${scannedItem.name} y sumado a ${MEAL_LABELS[meal]} ✓`
        : `Descontado ${amount} ${scannedItem.unit} de ${scannedItem.name} (sin nutrición cargada, no se sumó a ninguna comida) ✓`
    );
    setScannedItem(null);
    setTimeout(() => setStatus(""), 6000);
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
    if (items.length === 0 || reviewLocked) return;
    setReviewing(true);
    // Tope de items por toque (ver REVIEW_MAX_ITEMS_PER_RUN) para no
    // recargar la API de IA -- prioriza lo que más lo necesita: primero lo
    // que ni siquiera tiene nutrición cargada, después lo que la tiene pero
    // sin confirmar, recién al final (si sobra lugar) lo ya confirmado.
    const priority = (item: InventoryItem) => (!item.nutritionPer100g ? 0 : !item.nutritionConfirmed ? 1 : 2);
    const toReview = [...items].sort((a, b) => priority(a) - priority(b)).slice(0, REVIEW_MAX_ITEMS_PER_RUN);

    // Con muchos items en un solo pedido, un inventario grande puede tardar
    // más que el límite de la función serverless y el fetch se queda
    // esperando una respuesta que nunca llega — se manda en tandas chicas
    // (con timeout propio) y se van aplicando las correcciones a medida que
    // vuelven, así una tanda que falla no tira abajo las que ya se
    // resolvieron bien. Con el tope de arriba, en la práctica casi siempre
    // es una sola tanda.
    const batches: InventoryItem[][] = [];
    for (let i = 0; i < toReview.length; i += REVIEW_BATCH_SIZE) batches.push(toReview.slice(i, i + REVIEW_BATCH_SIZE));

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
      const restantes = items.length - toReview.length;
      setStatus(
        restantes > 0
          ? `Revisados ${toReview.length} de ${items.length} ✓ — quedan ${restantes}, disponible de nuevo en 1 hora.`
          : "Alacena revisada ✓"
      );
    } catch (error) {
      const timedOut = error instanceof DOMException && error.name === "AbortError";
      setStatus(
        timedOut
          ? `Tardó demasiado y lo corté — ya quedaron aplicadas ${done} de ${batches.length} tandas.`
          : error instanceof Error
            ? error.message
            : "No pude revisar el inventario."
      );
    } finally {
      setReviewing(false);
      // El bloqueo se aplica siempre, haya salido bien o no -- un intento
      // fallido igual gastó una llamada a la API.
      onAiReviewLockedUntilChange(Date.now() + REVIEW_LOCK_MS);
      setTimeout(() => setStatus(""), 8000);
    }
  };

  return (
    <Collapsible
      eyebrow="Alacena"
      title={householdName ? `Alacena de ${householdName}` : "Alacena"}
      locked
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
          onClick={() => {
            setShowQuickAdd((prev) => !prev);
            setScanPrefill(undefined);
          }}
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
            <span className="text-[13px] leading-none">−</span> Descontar sin comida (invitados, se rompió, etc.)
          </button>
        )}
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => setShowPrepareDish((prev) => !prev)}
            className={`flex items-center gap-1 rounded-xl border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] ${
              showPrepareDish ? "border-gold bg-gold text-bg" : "border-gold/60 bg-gold/10 text-gold"
            }`}
          >
            🍲 Preparar plato (torta, guiso, etc.)
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowScanner(true)}
          className="flex items-center gap-1 rounded-xl border border-gold/60 bg-gold/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-gold"
        >
          📷 Escanear código guardado
        </button>
        {items.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="rounded-xl border border-border bg-bg/60 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted"
          >
            Vaciar alacena
          </button>
        )}
      </div>
      {status && <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-sage">{status}</div>}

      {showExtraConsumption && (
        <div className="mb-2 text-[11px] text-textMuted">
          Descontá algo de la alacena sin que cuente como una comida tuya — por ejemplo, si vino gente a comer, se te rompió un
          producto, o le diste de comer a otra persona. No hace falta que tenga nutrición cargada, solo se resta del stock.
        </div>
      )}

      {items.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {missingNutritionCount > 0 ? (
            <div className="flex flex-1 flex-wrap items-center justify-between gap-2 rounded-lg border border-rust/50 bg-rust/10 px-3 py-2 text-[12px] text-rust">
              <span>
                ⚠ Falta información nutricional de {missingNutritionCount} producto{missingNutritionCount > 1 ? "s" : ""}.
              </span>
              <button
                type="button"
                onClick={reviewWithAi}
                disabled={reviewing || reviewLocked}
                title={
                  reviewLocked
                    ? `Disponible de nuevo en ${reviewLockLabel} — revisa hasta ${REVIEW_MAX_ITEMS_PER_RUN} ítems por vez para no recargar la IA`
                    : undefined
                }
                className="shrink-0 rounded-lg border border-rust/60 bg-rust px-2.5 py-1.5 font-mono text-[9.5px] uppercase tracking-wide text-bg disabled:opacity-60"
              >
                {reviewing ? "Revisando..." : reviewLocked ? `Disponible en ${reviewLockLabel}` : "Revisar con IA"}
              </button>
            </div>
          ) : (
            <div className="flex-1 rounded-lg border border-sage/40 bg-sage/10 px-3 py-2 text-[12px] text-sage">
              ✓ Está todo OK — todos los productos tienen su valor nutricional cargado.
            </div>
          )}
        </div>
      )}

      {items.length > 0 && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setShowList((prev) => !prev)}
            className={`rounded-lg border px-3 py-2 font-mono text-[10px] uppercase tracking-wide ${
              showList ? "border-gold bg-gold text-bg" : "border-border bg-bg/60 text-textMuted"
            }`}
          >
            📋 {showList ? "Ocultar lista" : `Ver lista (${items.length})`}
          </button>
          <button
            type="button"
            onClick={() => setShowCocina(true)}
            className="rounded-lg border border-gold/60 bg-gold/10 px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-gold"
          >
            🗺️ Ver cocina
          </button>
        </div>
      )}

      {showQuickAdd && (
        <div className="mb-3 rounded-xl border border-sage/40 bg-sage/5 p-2.5">
          <div className="mb-2.5 flex gap-1 rounded-full border border-border bg-bg/60 p-0.5">
            <button
              type="button"
              onClick={() => setAddMode("escribir")}
              className={`flex-1 rounded-full px-3 py-1 font-mono text-[9.5px] uppercase tracking-wide ${
                addMode === "escribir" ? "bg-gold text-bg" : "text-textMuted"
              }`}
            >
              Escribir
            </button>
            <button
              type="button"
              onClick={() => setAddMode("ticket")}
              className={`flex-1 rounded-full px-3 py-1 font-mono text-[9.5px] uppercase tracking-wide ${
                addMode === "ticket" ? "bg-gold text-bg" : "text-textMuted"
              }`}
            >
              📷 Con ticket
            </button>
          </div>
          {addMode === "escribir" ? (
            <QuickAddProducts
              addStructuredItems={addStructuredItems}
              productMemory={productMemory}
              compact
              autoFocus={!scanPrefill}
              prefillText={scanPrefill}
            />
          ) : (
            <ShoppingLog addStructuredItems={addStructuredItems} addPurchases={addPurchases} productMemory={productMemory} bare />
          )}
        </div>
      )}

      {showExtraConsumption && (
        <div className="mb-3 rounded-xl border border-rust/40 bg-rust/5 p-2.5">
          <ExtraConsumption items={items} consumeAmounts={consumeAmounts} />
        </div>
      )}

      {showPrepareDish && (
        <div className="mb-3 rounded-xl border border-gold/40 bg-gold/5 p-2.5">
          <PrepareDish items={items} consumeAmounts={consumeAmounts} addStructuredItems={addStructuredItems} />
        </div>
      )}

      {showScanner && <ProductScanner onDecode={handleScan} onClose={() => setShowScanner(false)} />}

      {scannedItem && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm" onClick={() => setScannedItem(null)}>
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-surface p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="font-display text-xl text-text">{scannedItem.name}</div>
            <div className="mt-1 text-[11px] text-textMuted">
              Tenés {scannedItem.quantity} {scannedItem.unit} en la Alacena. ¿Cuánto vas a consumir?
            </div>
            <div className="mt-3 flex gap-2">
              <input
                type="number"
                min="0"
                inputMode="decimal"
                value={consumeAmount}
                onChange={(event) => setConsumeAmount(event.target.value)}
                className="flex-1"
                autoFocus
              />
              <span className="flex items-center font-mono text-[11px] uppercase text-textMuted">{consumeUnit}</span>
            </div>
            {!scannedItem.nutritionPer100g && (
              <div className="mt-2 rounded-lg border border-dashed border-rust/40 bg-rust/10 p-2 text-[11px] text-rust">
                Este producto no tiene nutrición cargada — se va a descontar de la Alacena, pero no se va a sumar a ninguna comida.
              </div>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScannedItem(null)}
                className="rounded-lg border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-textMuted"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmConsume}
                className="rounded-lg border border-gold/60 bg-gold px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-bg"
              >
                Consumir
              </button>
            </div>
          </div>
        </div>
      )}

      {items.length > 0 && showList ? (
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
                className={`flex cursor-pointer flex-col gap-1 rounded-xl border px-2 py-2 text-left font-mono text-[11px] text-text ${
                  item.nutritionPer100g ? "border-sage/60 bg-sage/10" : "border-rust/60 bg-rust/10"
                }`}
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
                </span>
                {!item.nutritionPer100g && (
                  <span className="font-mono text-[9px] uppercase tracking-wide text-rust">⚠ falta nutrición, tocá para cargarla</span>
                )}
              </div>
            ))}
          </div>
        </>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-3 text-[11px] text-textMuted">
          Todavía no cargaste nada. Tocá &quot;+ Agregar productos&quot; arriba para escribir, subir una foto del ticket o dictar por audio.
        </div>
      ) : null}

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

            <div className="mt-3 rounded-lg border border-dashed border-border bg-bg/40 p-2.5">
              <label className="mb-2 flex items-center font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted">
                🏷️ Código para escanear
              </label>
              {qrDataUrl ? (
                <div className="flex flex-col items-center gap-2">
                  <img src={qrDataUrl} alt={`Código de ${selected.name}`} className="h-40 w-40 rounded-lg border border-border bg-white p-1" />
                  <div className="text-center text-[10px] text-textMuted">
                    Sacale una foto o imprimila y pegala en el producto — al escanearla la próxima vez, la reconoce sola.
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={generateQr}
                  disabled={qrLoading}
                  className="w-full rounded-lg border border-gold/60 bg-gold px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-bg disabled:opacity-60"
                >
                  {qrLoading ? "Generando..." : "Generar código QR"}
                </button>
              )}
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

      {showCocina && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-bg/80 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setShowCocina(false)}>
          <div
            className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border bg-surface p-4 shadow-2xl sm:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="font-display text-xl text-text">Cocina</div>
              <div className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowCocina(false)}
                  className="rounded-full border border-gold/60 bg-gold/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-gold"
                >
                  📋 Ver lista completa
                </button>
                <button
                  type="button"
                  onClick={() => setShowCocina(false)}
                  className="rounded-full border border-border bg-bg px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted"
                >
                  Cerrar
                </button>
              </div>
            </div>
            <CocinaView items={items} addStructuredItems={addStructuredItems} updateItem={updateItem} productMemory={productMemory} />
          </div>
        </div>
      )}
    </Collapsible>
  );
}
