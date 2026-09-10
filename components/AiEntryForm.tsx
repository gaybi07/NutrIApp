"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DayEntry, MealKey, MEAL_LABELS, TrainingIntensity, emptyDay } from "@/lib/types";
import { countDigits, MAX_DIGITS, MAX_MINUTES_DIGITS, MAX_TEXT_LENGTH } from "@/lib/inputLimits";
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
  onConsumeInventory?: (text: string) => void;
}) {
  const [fecha, setFecha] = useState(fmtDate(new Date()));
  const [meal, setMeal] = useState<MealKey>("des");
  const [text, setText] = useState("");
  const [inventoryText, setInventoryText] = useState("");
  const [pasos, setPasos] = useState("");
  const [pesoKg, setPesoKg] = useState("");
  const [entrenoIntensidad, setEntrenoIntensidad] = useState<TrainingIntensity | "ninguno">("ninguno");
  const [entrenoMinutos, setEntrenoMinutos] = useState("60");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [preview, setPreview] = useState<{ kcal: number; protein: number; detalle: string } | null>(null);
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

  useEffect(() => {
    const existing = days.find((d) => d.fecha === fecha);
    setPasos(existing?.pasos ? String(existing.pasos) : "");
    setPesoKg(existing?.pesoKg ? String(existing.pesoKg) : "");
    setEntrenoIntensidad(existing?.entreno ? existing.entrenoIntensidad || "moderado" : "ninguno");
    setEntrenoMinutos(existing?.entrenoMinutos ? String(existing.entrenoMinutos) : "60");
  }, [days, fecha]);

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
      setPreview({ kcal: data.kcal, protein: data.protein, detalle: data.detalle || "" });
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
      pasos: Number(pasos) || existing.pasos,
      entreno: entrenoIntensidad !== "ninguno",
      pesoKg: Number(pesoKg) > 0 ? Number(pesoKg) : existing.pesoKg,
      entrenoMinutos: entrenoIntensidad !== "ninguno" ? Number(entrenoMinutos) || 60 : undefined,
      entrenoIntensidad: entrenoIntensidad !== "ninguno" ? entrenoIntensidad : undefined,
    };
    onUpsert(updated);
    onConsumeInventory?.(inventoryText || text);
    recordMeal(text);
    setText("");
    setPreview(null);
    setStatus(`Sumado a ${MEAL_LABELS[meal]} del ${fecha} ✓`);
    setTimeout(() => setStatus(""), 3500);
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

  const handleSaveActivity = () => {
    const existing = days.find((d) => d.fecha === fecha) || emptyDay(fecha);
    const minutos = Number(entrenoMinutos) || 60;
    onUpsert({
      ...existing,
      pasos: Number(pasos) || existing.pasos,
      entreno: entrenoIntensidad !== "ninguno",
      pesoKg: Number(pesoKg) > 0 ? Number(pesoKg) : existing.pesoKg,
      entrenoMinutos: entrenoIntensidad !== "ninguno" ? minutos : undefined,
      entrenoIntensidad: entrenoIntensidad !== "ninguno" ? entrenoIntensidad : undefined,
      entrenamientos: entrenoIntensidad !== "ninguno" ? [{ intensidad: entrenoIntensidad, minutos }] : [],
    });
    setStatus(`Actividad guardada para el ${fecha} ✓`);
    setTimeout(() => setStatus(""), 3500);
  };

  return (
    <div
      className="rounded-xl p-4 mb-3 border"
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
        <div className="mb-1 flex items-center justify-between gap-2">
          <label className="mb-0 flex items-center">Contame qué comiste<InfoHint text={FIELD_HELP.comidaTexto} /></label>
          {speechSupported && (
            <button
              type="button"
              onClick={toggleRecording}
              className={`shrink-0 rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-wide ${
                recording ? "border-rust bg-rust/15 text-rust" : "border-border bg-bg text-textMuted"
              }`}
            >
              {recording ? "● Grabando… tocá para parar" : "🎙️ Grabar"}
            </button>
          )}
        </div>
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
      <div className="mt-2">
        <label className="flex items-center">Ingredientes usados del inventario (opcional)<InfoHint text={FIELD_HELP.ingredientesInventario} /></label>
        <input
          type="text"
          maxLength={MAX_TEXT_LENGTH}
          placeholder="Ej: 300 g pollo, 2 huevos, 150 g papa"
          value={inventoryText}
          onChange={(e) => setInventoryText(e.target.value)}
        />
        <div className="mt-1 text-[10px] text-textMuted">Al guardar la comida se descuentan esas cantidades.</div>
      </div>
      <div className="mt-3 rounded-lg border border-border bg-bg/40 p-3">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-wide text-textMuted">Actividad del día</div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="flex items-center">Pasos<InfoHint text={FIELD_HELP.pasosDiarios} /></label>
            <input
              type="number"
              min="0"
              max="999999"
              step="100"
              value={pasos}
              onChange={(e) => {
                if (countDigits(e.target.value) <= MAX_DIGITS) setPasos(e.target.value);
              }}
              placeholder="Ej: 8500"
            />
          </div>
          <div>
            <label>Peso (kg)</label>
            <input
              type="number"
              min="1"
              max="999999"
              step="0.1"
              value={pesoKg}
              onChange={(e) => {
                if (countDigits(e.target.value) <= MAX_DIGITS) setPesoKg(e.target.value);
              }}
              placeholder="Ej: 114.8"
            />
          </div>
          <div>
            <label>Entrenamiento</label>
            <select value={entrenoIntensidad} onChange={(e) => setEntrenoIntensidad(e.target.value as TrainingIntensity | "ninguno")}>
              <option value="ninguno">No entrené</option>
              <option value="leve">Leve</option>
              <option value="moderado">Moderado</option>
              <option value="exigente">Exigente</option>
              <option value="fallo">Al fallo</option>
            </select>
          </div>
        </div>
        {entrenoIntensidad !== "ninguno" && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <label className="flex items-center">Duración (min)<InfoHint text={FIELD_HELP.minutosEntrenamiento} /></label>
              <input
                type="number"
                min="1"
                max="9999"
                step="5"
                value={entrenoMinutos}
                onChange={(e) => {
                  if (countDigits(e.target.value) <= MAX_MINUTES_DIGITS) setEntrenoMinutos(e.target.value);
                }}
              />
            </div>
            <div>
              <label>Intensidad</label>
              <div className="rounded-lg border border-border bg-bg px-3 py-2 text-[12px] text-textMuted">{entrenoIntensidad}</div>
            </div>
          </div>
        )}
        <button
          onClick={handleSaveActivity}
          className="mt-2 w-full rounded-lg border border-sage/50 bg-sage/10 p-2 font-sans text-[12px] font-bold text-sage"
        >
          Guardar actividad
        </button>
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
                  if (countDigits(e.target.value) <= MAX_DIGITS) setPreview({ ...preview, kcal: Number(e.target.value) });
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
                  if (countDigits(e.target.value) <= MAX_DIGITS) setPreview({ ...preview, protein: Number(e.target.value) });
                }}
              />
            </div>
          </div>
          {preview.detalle && <div className="text-[11px] text-textMuted italic my-2">{preview.detalle}</div>}
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
