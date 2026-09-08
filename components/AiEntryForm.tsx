"use client";

import { useState } from "react";
import { DayEntry, MealKey, MEAL_LABELS, emptyDay } from "@/lib/types";

export function AiEntryForm({
  days,
  onUpsert,
}: {
  days: DayEntry[];
  onUpsert: (entry: DayEntry) => void;
}) {
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [meal, setMeal] = useState<MealKey>("des");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [preview, setPreview] = useState<{ kcal: number; protein: number; detalle: string } | null>(null);

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
    };
    onUpsert(updated);
    setText("");
    setPreview(null);
    setStatus(`Sumado a ${MEAL_LABELS[meal]} del ${fecha} ✓`);
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
        <label>Contame qué comiste (podés dictarlo con el micrófono del teclado)</label>
        <textarea
          rows={3}
          placeholder="Ej: 2 huevos, una tostada con queso crema y una banana"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
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
              <input type="number" value={preview.kcal} onChange={(e) => setPreview({ ...preview, kcal: Number(e.target.value) })} />
            </div>
            <div>
              <label>Proteína (g)</label>
              <input type="number" value={preview.protein} onChange={(e) => setPreview({ ...preview, protein: Number(e.target.value) })} />
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
