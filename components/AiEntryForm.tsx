"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DayEntry, MealKey, MEAL_LABELS, emptyDay } from "@/lib/types";
import { countDigits, MAX_DIGITS, MAX_TEXT_LENGTH, normalizeNumberInput } from "@/lib/inputLimits";
import { fmtDate } from "@/lib/calculations";
import { FIELD_HELP } from "@/lib/helpText";
import { InfoHint } from "@/components/InfoHint";
import { useMealHistory } from "@/lib/useMealHistory";

const MAX_SUGGESTIONS = 6;

/** Punto de partida antes de tener historial propio — se van reemplazando
 * por tus comidas reales a medida que las repetís (ver useMealHistory). */
const DEFAULT_SUGGESTIONS = [
  "Milanesa con puré",
  "Asado con ensalada",
  "2 empanadas de carne",
  "Pollo al horno con batatas",
  "Fideos con salsa y queso",
  "Yogur con granola y banana",
];

// SpeechRecognition no está tipado en TS DOM lib estándar.
type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null;
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
  const [preview, setPreview] = useState<{ kcal: number; protein: number; detalle: string; resumen: string; ingredientes: string } | null>(null);
  const { history: mealHistory, record: recordMeal } = useMealHistory();
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
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
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

  const handleCalc = async () => {
    if (!text.trim()) {
      setStatus("Escribí o dictá qué comiste primero");
      return;
    }
    setLoading(true);
    setStatus("");
    setPreview(null);
    try {
      const res = await fetch("/api/parse-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "No se pudo calcular la comida");
      setPreview({
        kcal: data.kcal,
        protein: data.protein,
        detalle: data.detalle || "",
        resumen: data.resumen || text.trim(),
        ingredientes: data.ingredientes || "",
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
    const kKey = `${meal}K` as keyof DayEntry;
    const pKey = `${meal}P` as keyof DayEntry;
    const updated: DayEntry = {
      ...existing,
      [kKey]: (existing[kKey] as number) + preview.kcal,
      [pKey]: (existing[pKey] as number) + preview.protein,
    };
    onUpsert(updated);
    const result = onConsumeInventory?.(preview.ingredientes || text);
    recordMeal(preview.resumen || text);
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
    const personal = mealHistory.filter((h) => h.count >= 2).map((h) => h.text);
    const combined = [...personal];
    for (const fallback of DEFAULT_SUGGESTIONS) {
      if (combined.length >= MAX_SUGGESTIONS) break;
      if (!combined.some((c) => c.toLowerCase() === fallback.toLowerCase())) combined.push(fallback);
    }
    return combined.slice(0, MAX_SUGGESTIONS);
  }, [mealHistory]);

  return (
    <div
      className="rounded-xl p-4 border"
      style={{ borderColor: "#C9A227", background: "linear-gradient(135deg, rgba(201,162,39,0.08), #242220)" }}
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
        onClick={handleCalc}
        disabled={loading}
        className="w-full rounded-lg p-3 font-sans font-bold text-sm mt-2.5 disabled:opacity-60"
        style={{ background: "#C9A227", color: "#1C1B18" }}
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
          </div>
          {preview.detalle && <div className="text-[11px] text-textMuted italic my-2">{preview.detalle}</div>}
          {preview.ingredientes && (
            <div className="mb-2 text-[10px] text-textMuted">
              Se descuenta del inventario (si lo tenés cargado): {preview.ingredientes}
            </div>
          )}
          <button
            onClick={handleSave}
            className="w-full rounded-lg p-3 font-sans font-bold text-sm"
            style={{ background: "#C9A227", color: "#1C1B18" }}
          >
            Sumar a {MEAL_LABELS[meal]}
          </button>
        </div>
      )}
      {status && <div className="text-center font-mono text-[11px] text-sage mt-2">{status}</div>}
    </div>
  );
}
