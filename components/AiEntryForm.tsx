"use client";

import { useEffect, useMemo, useState } from "react";
import { DayEntry, InventoryItem, MealKey, MEAL_LABELS, MealItem, emptyDay, PREPARATION_CATEGORY_SUGGESTIONS } from "@/lib/types";
import { countDigits, MAX_DIGITS, MAX_TEXT_LENGTH, normalizeNumberInput } from "@/lib/inputLimits";
import { fmtDate, addDays, getMealItems, applyMealItems, suggestedMeal } from "@/lib/calculations";
import { FIELD_HELP } from "@/lib/helpText";
import { InfoHint } from "@/components/InfoHint";
import { useMealMemory } from "@/lib/useMealMemory";
import { useMealPreparations } from "@/lib/useMealPreparations";
import { parseInventoryText } from "@/lib/useInventory";
import { useSpeechToText } from "@/lib/useSpeechToText";
import { MealFromAlacena } from "@/components/MealFromAlacena";
import { MealFromSearch } from "@/components/MealFromSearch";

const MAX_SUGGESTIONS = 6;

/** Punto de partida antes de tener memoria propia — se van reemplazando
 * por tus comidas reales a medida que las repetís (ver useMealMemory).
 * Separado por comida para no sugerir, por ejemplo, un asado a la hora
 * del desayuno. */
const DEFAULT_SUGGESTIONS: Record<MealKey, string[]> = {
  des: [
    "Tostadas con huevo",
    "Yogur con granola y banana",
    "Mate con tostadas",
    "Avena con fruta",
    "Huevos revueltos con pan",
    "Licuado de banana y avena",
  ],
  alm: [
    "Milanesa con puré",
    "Pollo con arroz",
    "Ensalada con pollo",
    "Pasta con salsa",
    "Carne con ensalada",
    "Arroz con verduras y pollo",
  ],
  mer: [
    "Yogur con granola y banana",
    "Tostadas con queso crema y mermelada",
    "Fruta con yogur",
    "Café con tostadas",
    "Barrita de cereal y fruta",
    "Licuado de frutas",
  ],
  cen: [
    "Asado con ensalada",
    "Pollo al horno con batatas",
    "Milanesa con ensalada",
    "Tarta con ensalada",
    "Pescado con vegetales",
    "2 empanadas de carne",
  ],
  col: [
    "Puñado de frutos secos",
    "Yogur individual",
    "Fruta",
    "Barrita de cereal",
    "Alfajor",
    "Gelatina",
  ],
};

export function AiEntryForm({
  days,
  onUpsert,
  onConsumeInventory,
  inventory,
  consumeAmounts,
  disableAi,
  initialMeal,
}: {
  days: DayEntry[];
  onUpsert: (entry: DayEntry) => void;
  onConsumeInventory?: (text: string) => { consumed: string[]; missing: string[] } | void;
  inventory: InventoryItem[];
  consumeAmounts: (amounts: Array<{ id: string; quantity: number }>) => void;
  /** Plan Básico -- ver migration_2026-09-21g_add_plan_gating.sql. Oculta
   * la IA, la Alacena y "Buscar producto" (los tres dependen de IA o de
   * Alacena, ambas Premium) y muestra una carga 100% manual en su lugar --
   * no un botón deshabilitado, es el único camino real para básico. */
  disableAi?: boolean;
  /** Se tocó un botón de comida puntual en Inicio (Desayuno/Almuerzo/etc.) --
   * ya no hace falta el desplegable de "¿cuál comida?", ya se sabe. */
  initialMeal?: MealKey | null;
}) {
  const [fecha, setFecha] = useState(fmtDate(new Date()));
  const [meal, setMeal] = useState<MealKey>(initialMeal || "des");
  const [mode, setMode] = useState<"ia" | "alacena" | "buscar">("ia");
  const [manualDesc, setManualDesc] = useState("");
  const [manualValues, setManualValues] = useState({ kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
  // Alacena/Buscar producto quedan un escalón más escondidas por defecto --
  // 3 pestañas del mismo tamaño compitiendo por atención era justo lo que
  // hacía más difícil el paso a paso para alguien menos entrenado con la
  // app; la carga con texto+calcular es el camino principal, el resto es
  // "otras formas de cargar" bajo demanda.
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [preview, setPreview] = useState<{
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    detalle: string;
    resumen: string;
    ingredientes: string;
    items: Omit<MealItem, "id">[];
  } | null>(null);
  const [consumeResult, setConsumeResult] = useState<{ consumed: string[]; missing: string[] } | null>(null);
  const { memory: mealMemory, remember, findMatch } = useMealMemory();
  const { preparations, save: savePreparation, registerUse: registerPreparationUse } = useMealPreparations();
  const [savePrep, setSavePrep] = useState(false);
  const [prepName, setPrepName] = useState("");
  const [prepCategoria, setPrepCategoria] = useState("");
  const { supported: speechSupported, recording, toggle: toggleRecording } = useSpeechToText(
    (transcript) => setText((prev) => (prev ? `${prev} ${transcript}` : transcript)),
    () => setStatus("No pude escucharte, probá de nuevo o escribilo a mano.")
  );

  // Al abrir el form (o cambiar de fecha) sugiere la comida que corresponde
  // según la hora, salteando las que ya estén cargadas ese día — no
  // selecciona siempre Desayuno de entrada. Si se llegó acá tocando un
  // botón puntual en Inicio (initialMeal), esa elección manda y no se pisa.
  useEffect(() => {
    if (initialMeal) return;
    const entry = days.find((d) => d.fecha === fecha);
    setMeal(suggestedMeal(entry, new Date().getHours()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha]);

  const handleCalc = async (forceAi = false) => {
    if (!text.trim()) {
      setStatus("Escribí o dictá qué comiste primero");
      return;
    }
    setStatus("");
    setPreview(null);
    setConsumeResult(null);

    if (!forceAi) {
      const match = findMatch(text);
      // Solo salteamos la IA si esa comida ya quedó guardada CON desglose
      // completo (items + ingredientes) -- las guardadas antes de tener eso
      // (o por algún otro motivo incompletas) no se saltean: se recalculan
      // con IA esta vez, y al guardar quedan actualizadas para la próxima.
      if (match && match.ingredientes && match.items && match.items.length > 0) {
        setPreview({
          kcal: match.kcal,
          protein: match.protein,
          carbs: match.carbs,
          fat: match.fat,
          fiber: match.fiber,
          detalle: "",
          resumen: match.text,
          ingredientes: match.ingredientes,
          items: match.items,
        });
        setStatus(`Encontrado en tu memoria: "${match.text}" — revisá y guardá, o recalculá con IA si cambió algo ↓`);
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch("/api/parse-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "No se pudo calcular la comida");
      const items: Omit<MealItem, "id">[] =
        Array.isArray(data.items) && data.items.length > 0
          ? data.items.map((i: Partial<MealItem>) => ({
              nombre: i.nombre || "Alimento",
              kcal: i.kcal || 0,
              protein: i.protein || 0,
              carbs: i.carbs || 0,
              fat: i.fat || 0,
              fiber: i.fiber || 0,
              gramos: i.gramos || undefined,
            }))
          : [{ nombre: data.resumen || text.trim(), kcal: data.kcal, protein: data.protein, carbs: data.carbs || 0, fat: data.fat || 0, fiber: data.fiber || 0, gramos: undefined }];
      setPreview({
        kcal: data.kcal,
        protein: data.protein,
        carbs: data.carbs || 0,
        fat: data.fat || 0,
        fiber: data.fiber || 0,
        detalle: data.detalle || "",
        resumen: data.resumen || text.trim(),
        ingredientes: data.ingredientes || "",
        items,
      });
      setStatus("Revisá el resultado y guardá si está bien ↓");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "No se pudo calcular. Probá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = (overridePreview?: NonNullable<typeof preview>) => {
    const p = overridePreview || preview;
    if (!p) return;
    const existing = days.find((d) => d.fecha === fecha) || emptyDay(fecha);
    const nuevosAlimentos = p.ingredientes ? parseInventoryText(p.ingredientes).map((i) => i.name) : [];
    const alimentosDelDia = Array.from(new Set([...(existing.alimentos || []), ...nuevosAlimentos]));
    // Si es un solo item, refleja cualquier ajuste manual que se haya hecho en la grilla de arriba antes de guardar.
    const rawItems =
      p.items.length === 1
        ? [{ ...p.items[0], kcal: p.kcal, protein: p.protein, carbs: p.carbs, fat: p.fat, fiber: p.fiber }]
        : p.items;
    const nuevosItems: MealItem[] = rawItems.map((item, i) => ({
      ...item,
      id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
    }));
    const itemsActuales = getMealItems(existing, meal);
    const updated = { ...applyMealItems(existing, meal, [...itemsActuales, ...nuevosItems]), alimentos: alimentosDelDia };
    onUpsert(updated);
    const result = onConsumeInventory?.(p.ingredientes || text);
    remember(p.resumen || text, p.kcal, p.protein, p.carbs, p.fat, meal, p.fiber, p.ingredientes, p.items);
    if (savePrep && prepName.trim() && p.items.length > 1) {
      savePreparation(prepName, prepCategoria, p.items.map((i) => i.nombre), meal);
    }
    setText("");
    setPreview(null);
    setSavePrep(false);
    setPrepName("");
    setPrepCategoria("");
    setStatus(`Sumado a ${MEAL_LABELS[meal]} del ${fecha} ✓`);
    setConsumeResult(result && (result.consumed.length > 0 || result.missing.length > 0) ? result : null);
    setMeal(suggestedMeal(updated, new Date().getHours()));
    setTimeout(() => setStatus(""), 3500);
    setTimeout(() => setConsumeResult(null), 9000);
  };

  const handleManualSave = () => {
    if (!manualDesc.trim()) {
      setStatus("Escribí qué comiste primero");
      return;
    }
    handleSave({
      kcal: manualValues.kcal,
      protein: manualValues.protein,
      carbs: manualValues.carbs,
      fat: manualValues.fat,
      fiber: manualValues.fiber,
      detalle: "",
      resumen: manualDesc.trim(),
      ingredientes: "",
      items: [
        {
          nombre: manualDesc.trim(),
          kcal: manualValues.kcal,
          protein: manualValues.protein,
          carbs: manualValues.carbs,
          fat: manualValues.fat,
          fiber: manualValues.fiber,
        },
      ],
    });
    setManualDesc("");
    setManualValues({ kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
  };

  const mealSuggestions = useMemo(() => {
    const personal = mealMemory.filter((h) => h.count >= 2 && h.meal === meal).map((h) => h.text);
    const combined = [...personal];
    for (const fallback of DEFAULT_SUGGESTIONS[meal]) {
      if (combined.length >= MAX_SUGGESTIONS) break;
      if (!combined.some((c) => c.toLowerCase() === fallback.toLowerCase())) combined.push(fallback);
    }
    return combined.slice(0, MAX_SUGGESTIONS);
  }, [mealMemory, meal]);

  // Preparaciones guardadas para esta comida (o sin comida asignada) --
  // las más repetidas primero. Tocarlas completa el texto con la lista de
  // ingredientes para que se agreguen las cantidades de esta vez, no
  // dispara la IA sola.
  const misPreparaciones = useMemo(
    () =>
      preparations
        .filter((p) => !p.meal || p.meal === meal)
        .sort((a, b) => b.vecesUsada - a.vecesUsada)
        .slice(0, 6),
    [preparations, meal]
  );

  const usePreparacion = (prepId: string, ingredientes: string[]) => {
    setText(ingredientes.join(", "));
    registerPreparationUse(prepId);
  };

  // ¿Repetís algo reciente? -- mira los días ya cargados, no necesita
  // memoria aparte: (1) ayer, misma comida, si hoy todavía no cargaste
  // nada ahí; (2) si se está cargando la cena, el almuerzo de hoy (por si
  // sobró). Un toque guarda con las mismas cantidades de esa vez.
  const recientes = useMemo(() => {
    const list: { key: string; label: string; items: MealItem[] }[] = [];
    const entryFecha = days.find((d) => d.fecha === fecha);
    const yaCargadoHoy = entryFecha ? getMealItems(entryFecha, meal).length > 0 : false;

    if (!yaCargadoHoy) {
      const ayer = fmtDate(addDays(new Date(`${fecha}T00:00:00`), -1));
      const entryAyer = days.find((d) => d.fecha === ayer);
      const itemsAyer = entryAyer ? getMealItems(entryAyer, meal) : [];
      if (itemsAyer.length > 0) list.push({ key: "ayer", label: `Ayer (${MEAL_LABELS[meal]})`, items: itemsAyer });
    }

    if (meal === "cen" && entryFecha) {
      const itemsAlmuerzo = getMealItems(entryFecha, "alm");
      if (itemsAlmuerzo.length > 0) list.push({ key: "almuerzo-hoy", label: "Del almuerzo de hoy", items: itemsAlmuerzo });
    }

    return list;
  }, [days, fecha, meal]);

  const handleUseReciente = (items: MealItem[]) => {
    const totals = items.reduce(
      (acc, i) => ({
        kcal: acc.kcal + i.kcal,
        protein: acc.protein + i.protein,
        carbs: acc.carbs + (i.carbs || 0),
        fat: acc.fat + (i.fat || 0),
        fiber: acc.fiber + (i.fiber || 0),
      }),
      { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
    );
    handleSave({
      ...totals,
      detalle: "",
      resumen: items.map((i) => i.nombre).join(", "),
      ingredientes: "",
      items: items.map((i) => ({ nombre: i.nombre, kcal: i.kcal, protein: i.protein, carbs: i.carbs, fat: i.fat, fiber: i.fiber, gramos: i.gramos })),
    });
  };

  // Tus favoritas de ESTA comida puntual, para cargar de un solo toque --
  // ya se sabe kcal/proteína/etc. de la última vez, no hace falta recalcular
  // con IA ni revisar nada antes de guardar.
  const favoritos = useMemo(
    () =>
      mealMemory
        .filter((h) => h.count >= 3 && h.meal === meal)
        .sort((a, b) => b.count - a.count)
        .slice(0, 3),
    [mealMemory, meal]
  );

  const handleQuickSave = (fav: (typeof favoritos)[number]) => {
    handleSave({
      kcal: fav.kcal,
      protein: fav.protein,
      carbs: fav.carbs,
      fat: fav.fat,
      fiber: fav.fiber,
      detalle: "",
      resumen: fav.text,
      ingredientes: fav.ingredientes || "",
      items: fav.items && fav.items.length > 0 ? fav.items : [{ nombre: fav.text, kcal: fav.kcal, protein: fav.protein, carbs: fav.carbs, fat: fav.fat, fiber: fav.fiber }],
    });
  };

  return (
    <div
      className="rounded-xl p-4 border border-gold"
      style={{ background: "linear-gradient(135deg, rgb(var(--color-accent) / 0.08), rgb(var(--color-surface)))" }}
    >
      <div className="font-display italic text-[15px] text-gold mb-2.5">✎ Cargar comida</div>

      {!disableAi && !showMoreOptions && (
        <button
          type="button"
          onClick={() => setShowMoreOptions(true)}
          className="mb-2 font-mono text-[10px] uppercase tracking-wide text-textMuted underline"
        >
          Otras formas de cargar (Alacena / Buscar producto)
        </button>
      )}

      {!disableAi && showMoreOptions && (
        <div className="mb-2.5 flex gap-1 rounded-xl border border-border bg-bg/40 p-1">
          <button
            type="button"
            onClick={() => setMode("ia")}
            className={`flex-1 rounded-lg py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${
              mode === "ia" ? "bg-gold text-bg" : "text-textMuted"
            }`}
          >
            Con IA
          </button>
          <button
            type="button"
            onClick={() => setMode("alacena")}
            className={`flex-1 rounded-lg py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${
              mode === "alacena" ? "bg-gold text-bg" : "text-textMuted"
            }`}
          >
            Desde Alacena
          </button>
          <button
            type="button"
            onClick={() => setMode("buscar")}
            className={`flex-1 rounded-lg py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${
              mode === "buscar" ? "bg-gold text-bg" : "text-textMuted"
            }`}
          >
            Buscar producto
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label>Fecha</label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        {/* Si ya se sabe la comida (se tocó "Desayuno"/etc. en Inicio), no
            hace falta preguntarla de nuevo -- un desplegable de más es un
            paso de más para alguien a quien ya le cuesta seguir el resto. */}
        {initialMeal ? (
          <div>
            <label>Comida</label>
            <div className="flex h-[38px] items-center rounded-lg border border-border bg-bg/40 px-2.5 text-sm text-text">
              {MEAL_LABELS[meal]}
            </div>
          </div>
        ) : (
          <div>
            <label>Comida</label>
            <select value={meal} onChange={(e) => setMeal(e.target.value as MealKey)}>
              {Object.entries(MEAL_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {recientes.length > 0 && (
        <div className="mt-2.5">
          <label className="mb-1 flex items-center">¿Repetís algo reciente?</label>
          <div className="flex flex-col gap-1.5">
            {recientes.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => handleUseReciente(r.items)}
                className="flex items-center justify-between gap-2 rounded-xl border border-gold/50 bg-gold/10 px-3 py-2.5 text-left"
              >
                <span className="min-w-0">
                  <span className="block font-mono text-[9px] uppercase tracking-wide text-gold">{r.label}</span>
                  <span className="block truncate text-sm font-semibold text-text">{r.items.map((i) => i.nombre).join(", ")}</span>
                </span>
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-gold">toque para cargar</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {favoritos.length > 0 && (
        <div className="mt-2.5">
          <label className="mb-1 flex items-center">Tus comidas frecuentes de {MEAL_LABELS[meal].toLowerCase()}</label>
          <div className="flex flex-col gap-1.5">
            {favoritos.map((fav) => (
              <button
                key={fav.text}
                type="button"
                onClick={() => handleQuickSave(fav)}
                className="flex items-center justify-between gap-2 rounded-xl border border-sage/50 bg-sage/10 px-3 py-2.5 text-left"
              >
                <span className="text-sm font-semibold text-text">{fav.text}</span>
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-sage">
                  {fav.kcal} kcal · toque para cargar
                </span>
              </button>
            ))}
          </div>
          <div className="mt-1.5 text-center font-mono text-[9.5px] uppercase tracking-wide text-textMuted">— o algo distinto —</div>
        </div>
      )}

      {disableAi && (
        <div className="mt-2">
          <label className="mb-1 flex items-center">Qué comiste</label>
          <input
            type="text"
            maxLength={MAX_TEXT_LENGTH}
            placeholder="Ej: 2 huevos con tostadas"
            value={manualDesc}
            onChange={(e) => setManualDesc(e.target.value)}
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <label>Kcal</label>
              <input
                type="number"
                max="999999"
                value={manualValues.kcal}
                onChange={(e) => {
                  if (countDigits(e.target.value) <= MAX_DIGITS) setManualValues((v) => ({ ...v, kcal: normalizeNumberInput(e.target) }));
                }}
              />
            </div>
            <div>
              <label>Proteína (g)</label>
              <input
                type="number"
                max="999999"
                value={manualValues.protein}
                onChange={(e) => {
                  if (countDigits(e.target.value) <= MAX_DIGITS) setManualValues((v) => ({ ...v, protein: normalizeNumberInput(e.target) }));
                }}
              />
            </div>
            <div>
              <label>Carbohidratos (g)</label>
              <input
                type="number"
                max="999999"
                value={manualValues.carbs}
                onChange={(e) => {
                  if (countDigits(e.target.value) <= MAX_DIGITS) setManualValues((v) => ({ ...v, carbs: normalizeNumberInput(e.target) }));
                }}
              />
            </div>
            <div>
              <label>Grasas (g)</label>
              <input
                type="number"
                max="999999"
                value={manualValues.fat}
                onChange={(e) => {
                  if (countDigits(e.target.value) <= MAX_DIGITS) setManualValues((v) => ({ ...v, fat: normalizeNumberInput(e.target) }));
                }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleManualSave}
            className="mt-2.5 w-full rounded-lg p-3 font-sans font-bold text-sm bg-gold text-bg"
          >
            Sumar a {MEAL_LABELS[meal]}
          </button>
          {status && <div className="text-center font-mono text-[11px] text-sage mt-2">{status}</div>}
        </div>
      )}

      {!disableAi && mode === "alacena" && (
        <MealFromAlacena
          items={inventory}
          days={days}
          fecha={fecha}
          meal={meal}
          onUpsert={onUpsert}
          consumeAmounts={consumeAmounts}
          onAdded={(updated) => setMeal(suggestedMeal(updated, new Date().getHours()))}
        />
      )}

      {!disableAi && mode === "buscar" && (
        <MealFromSearch
          days={days}
          fecha={fecha}
          meal={meal}
          onUpsert={onUpsert}
          onAdded={(updated) => setMeal(suggestedMeal(updated, new Date().getHours()))}
        />
      )}

      {!disableAi && mode === "ia" && (
      <>
      <div className="mt-2">
        <label className="mb-1 flex items-center">Contame qué comiste<InfoHint text={FIELD_HELP.comidaTexto} /></label>
        {speechSupported && (
          <button
            type="button"
            onClick={toggleRecording}
            className={`mb-2 flex w-full items-center justify-center gap-2 rounded-lg border-2 p-2.5 font-sans text-[13px] font-bold uppercase tracking-wide transition-colors ${
              recording
                ? "border-rust bg-rust/15 text-rust animate-pulse"
                : "border-gold bg-gold/15 text-gold"
            }`}
          >
            <span className="text-lg leading-none">🎙️</span>
            {recording ? "Grabando… tocá para parar" : "Grabar audio"}
          </button>
        )}
        <textarea
          rows={3}
          maxLength={MAX_TEXT_LENGTH}
          placeholder="Ej: 2 huevos, una tostada con queso crema y una banana"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {mealSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setText(suggestion)}
              className="rounded-full border border-border bg-bg px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-wide text-textMuted hover:border-gold/60"
            >
              {suggestion}
            </button>
          ))}
        </div>
        {misPreparaciones.length > 0 && (
          <div className="mt-2">
            <div className="mb-1 font-mono text-[9px] uppercase tracking-wide text-textMuted">Tus preparaciones</div>
            <div className="flex flex-wrap gap-1.5">
              {misPreparaciones.map((prep) => (
                <button
                  key={prep.id}
                  type="button"
                  onClick={() => usePreparacion(prep.id, prep.ingredientes)}
                  className="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-wide text-gold hover:border-gold/60"
                  title={prep.ingredientes.join(", ")}
                >
                  {prep.nombre} · {prep.categoria}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <button
        onClick={() => handleCalc()}
        disabled={loading}
        className="w-full rounded-lg p-3 font-sans font-bold text-sm mt-2.5 disabled:opacity-60 bg-gold text-bg"
      >
        {loading ? "Calculando..." : "Calcular con IA"}
      </button>

      {preview && (
        <div className="mt-3 pt-3 border-t border-dashed border-border">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label>Kcal</label>
              <input
                type="number"
                max="999999"
                value={preview.kcal}
                onChange={(e) => {
                  if (countDigits(e.target.value) <= MAX_DIGITS) setPreview({ ...preview, kcal: normalizeNumberInput(e.target) });
                }}
              />
            </div>
            <div>
              <label>Proteína (g)</label>
              <input
                type="number"
                max="999999"
                value={preview.protein}
                onChange={(e) => {
                  if (countDigits(e.target.value) <= MAX_DIGITS) setPreview({ ...preview, protein: normalizeNumberInput(e.target) });
                }}
              />
            </div>
            <div>
              <label>Carbohidratos (g)</label>
              <input
                type="number"
                max="999999"
                value={preview.carbs}
                onChange={(e) => {
                  if (countDigits(e.target.value) <= MAX_DIGITS) setPreview({ ...preview, carbs: normalizeNumberInput(e.target) });
                }}
              />
            </div>
            <div>
              <label>Grasas (g)</label>
              <input
                type="number"
                max="999999"
                value={preview.fat}
                onChange={(e) => {
                  if (countDigits(e.target.value) <= MAX_DIGITS) setPreview({ ...preview, fat: normalizeNumberInput(e.target) });
                }}
              />
            </div>
            <div>
              <label>Fibra (g)</label>
              <input
                type="number"
                max="999999"
                value={preview.fiber}
                onChange={(e) => {
                  if (countDigits(e.target.value) <= MAX_DIGITS) setPreview({ ...preview, fiber: normalizeNumberInput(e.target) });
                }}
              />
            </div>
          </div>
          {preview.items.length > 0 && (
            <div className="my-2 flex flex-col gap-1">
              {preview.items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg/40 px-2.5 py-1.5 text-[11px]"
                >
                  <span className="text-text">
                    {item.nombre}
                    {item.gramos ? ` (${item.gramos} g)` : ""}
                  </span>
                  <span className="shrink-0 text-textMuted">
                    {item.kcal} kcal · {item.protein}g prot
                  </span>
                </div>
              ))}
            </div>
          )}
          {preview.detalle && <div className="text-[11px] text-textMuted italic mb-2">{preview.detalle}</div>}
          <button
            type="button"
            onClick={() => handleCalc(true)}
            disabled={loading}
            className="mb-2 font-mono text-[9.5px] uppercase tracking-wide text-textMuted underline disabled:opacity-60"
          >
            ¿Cambió algo? Recalcular con IA
          </button>
          {preview.ingredientes && (
            <div className="mb-2 text-[10px] text-textMuted">
              Se descuenta del inventario (si lo tenés cargado): {preview.ingredientes}
            </div>
          )}
          {preview.items.length > 1 && (
            <div className="mb-2 rounded-lg border border-dashed border-gold/40 bg-gold/5 p-2.5">
              <label className="flex items-center gap-1.5 text-[12px] text-text">
                <input type="checkbox" checked={savePrep} onChange={(e) => setSavePrep(e.target.checked)} />
                Guardar como preparación (para volver a cargar esta combinación otro día)
              </label>
              {savePrep && (
                <div className="mt-2 space-y-1.5">
                  <input
                    type="text"
                    placeholder="Nombre, ej: Milanesa con arroz y arvejas"
                    maxLength={MAX_TEXT_LENGTH}
                    value={prepName}
                    onChange={(e) => setPrepName(e.target.value)}
                  />
                  <input
                    type="text"
                    list="prep-categorias"
                    placeholder="Categoría, ej: Almuerzos"
                    maxLength={40}
                    value={prepCategoria}
                    onChange={(e) => setPrepCategoria(e.target.value)}
                  />
                  <datalist id="prep-categorias">
                    {PREPARATION_CATEGORY_SUGGESTIONS.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              )}
            </div>
          )}
          <button
            onClick={() => handleSave()}
            className="w-full rounded-lg p-3 font-sans font-bold text-sm bg-gold text-bg"
          >
            Sumar a {MEAL_LABELS[meal]}
          </button>
        </div>
      )}
      {status && <div className="text-center font-mono text-[11px] text-sage mt-2">{status}</div>}

      {consumeResult && (
        <div className="mt-2 rounded-lg border border-border bg-bg/40 p-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-1.5">
              {consumeResult.consumed.length > 0 && (
                <div className="text-[11px] text-sage">
                  <span className="font-bold">✓ Descontado de tu alacena:</span> {consumeResult.consumed.join(", ")}
                </div>
              )}
              {consumeResult.missing.length > 0 && (
                <div className="text-[11px] text-rust">
                  <span className="font-bold">⚠ No estaba cargado, no se descontó:</span> {consumeResult.missing.join(", ")}. Cargalo en Compras y la próxima te lo descontamos solo.
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setConsumeResult(null)}
              className="shrink-0 font-mono text-[11px] text-textMuted"
              aria-label="Cerrar aviso"
            >
              ×
            </button>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
