"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DayEntry, MealKey, MEAL_LABELS, MealItem, emptyDay } from "@/lib/types";
import { countDigits, MAX_DIGITS, MAX_TEXT_LENGTH, normalizeNumberInput } from "@/lib/inputLimits";
import { fmtDate, getMealItems, applyMealItems } from "@/lib/calculations";
import { FIELD_HELP } from "@/lib/helpText";
import { InfoHint } from "@/components/InfoHint";
import { useMealMemory } from "@/lib/useMealMemory";
import { parseInventoryText } from "@/lib/useInventory";

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
};

// SpeechRecognition no está tipado en TS DOM lib estándar.
type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult:
    | ((event: {
        resultIndex: number;
        results: { length: number; [index: number]: { isFinal: boolean; [index: number]: { transcript: string } } };
      }) => void)
    | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

export function AiEntryForm({
  days,
  onUpsert,
  onConsumeInventory,
}: {
  days: DayEntry[];
  onUpsert: (entry: DayEntry) => void;
  onConsumeInventory?: (text: string) => { consumed: string[]; missing: string[] } | void;
}) {
  const [fecha, setFecha] = useState(fmtDate(new Date()));
  const [meal, setMeal] = useState<MealKey>("des");
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
  const { memory: mealMemory, remember, findMatch } = useMealMemory();
  const [recording, setRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    const SpeechRecognitionCtor =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;
    setSpeechSupported(Boolean(SpeechRecognitionCtor));
  }, []);

  const toggleRecording = () => {
    if (recording) {
      recognitionRef.current?.stop();
      return;
    }
    const SpeechRecognitionCtor =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "es-AR";
    recognition.interimResults = false;
    // "continuous" evita que el reconocimiento se corte solo apenas detecta
    // un segundo de silencio — sigue escuchando (varias frases, con pausas
    // para pensar) hasta que el usuario toca "parar" a propósito.
    recognition.continuous = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalTranscript += `${event.results[i][0].transcript} `;
      }
      finalTranscript = finalTranscript.trim();
      if (finalTranscript) {
        setText((prev) => (prev ? `${prev} ${finalTranscript}` : finalTranscript));
      }
    };
    recognition.onerror = () => {
      setRecording(false);
      setStatus("No pude escucharte, probá de nuevo o escribilo a mano.");
    };
    recognition.onend = () => setRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  };

  const handleCalc = async (forceAi = false) => {
    if (!text.trim()) {
      setStatus("Escribí o dictá qué comiste primero");
      return;
    }
    setStatus("");
    setPreview(null);

    if (!forceAi) {
      const match = findMatch(text);
      if (match) {
        setPreview({
          kcal: match.kcal,
          protein: match.protein,
          carbs: match.carbs,
          fat: match.fat,
          fiber: match.fiber,
          detalle: "",
          resumen: match.text,
          ingredientes: "",
          items: [{ nombre: match.text, kcal: match.kcal, protein: match.protein, carbs: match.carbs, fat: match.fat, fiber: match.fiber }],
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
            }))
          : [{ nombre: data.resumen || text.trim(), kcal: data.kcal, protein: data.protein, carbs: data.carbs || 0, fat: data.fat || 0, fiber: data.fiber || 0 }];
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

  const handleSave = () => {
    if (!preview) return;
    const existing = days.find((d) => d.fecha === fecha) || emptyDay(fecha);
    const nuevosAlimentos = preview.ingredientes ? parseInventoryText(preview.ingredientes).map((i) => i.name) : [];
    const alimentosDelDia = Array.from(new Set([...(existing.alimentos || []), ...nuevosAlimentos]));
    // Si es un solo item, refleja cualquier ajuste manual que se haya hecho en la grilla de arriba antes de guardar.
    const rawItems =
      preview.items.length === 1
        ? [{ ...preview.items[0], kcal: preview.kcal, protein: preview.protein, carbs: preview.carbs, fat: preview.fat, fiber: preview.fiber }]
        : preview.items;
    const nuevosItems: MealItem[] = rawItems.map((item, i) => ({
      ...item,
      id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
    }));
    const itemsActuales = getMealItems(existing, meal);
    const updated = { ...applyMealItems(existing, meal, [...itemsActuales, ...nuevosItems]), alimentos: alimentosDelDia };
    onUpsert(updated);
    const result = onConsumeInventory?.(preview.ingredientes || text);
    remember(preview.resumen || text, preview.kcal, preview.protein, preview.carbs, preview.fat, meal, preview.fiber);
    setText("");
    setPreview(null);
    let message = `Sumado a ${MEAL_LABELS[meal]} del ${fecha} ✓`;
    if (result?.missing.length) {
      message += ` · Che, esto no lo tenías cargado en el inventario: ${result.missing.join(", ")}. Cargalo en Compras y la próxima te lo descontamos solo.`;
    }
    setStatus(message);
    setTimeout(() => setStatus(""), result?.missing.length ? 7000 : 3500);
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

  return (
    <div
      className="rounded-xl p-4 border border-gold"
      style={{ background: "linear-gradient(135deg, rgb(var(--color-accent) / 0.08), rgb(var(--color-surface)))" }}
    >
      <div className="font-display italic text-[15px] text-gold mb-2.5">✎ Registrar con IA</div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label>Fecha</label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <div>
          <label>Comida</label>
          <select value={meal} onChange={(e) => setMeal(e.target.value as MealKey)}>
            {Object.entries(MEAL_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>
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
                  <span className="text-text">{item.nombre}</span>
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
          <button
            onClick={handleSave}
            className="w-full rounded-lg p-3 font-sans font-bold text-sm bg-gold text-bg"
          >
            Sumar a {MEAL_LABELS[meal]}
          </button>
        </div>
      )}
      {status && <div className="text-center font-mono text-[11px] text-sage mt-2">{status}</div>}
    </div>
  );
}
