"use client";

import { useState } from "react";
import { BODY_METRICS, BodyMeasurement, CORE_METRICS, latestValue } from "@/lib/bodyGoal";
import { btn } from "@/components/buttonStyles";
import { fmtDate } from "@/lib/calculations";

const FIELDS = [{ id: "peso", label: "Peso", unit: "kg" }, { id: "altura", label: "Altura", unit: "cm" }, ...BODY_METRICS];
const num = (v: string) => (v.trim() === "" ? undefined : Number(v.replace(",", ".")));

/**
 * Todas las medidas del cuerpo, opcionales. Sirve para ver el progreso completo (y, más adelante, para que un
 * Nutricionista o Entrenador te proponga objetivos sobre ellas, ej. crecimiento de bíceps). Las tres principales
 * (cintura, cadera, cuello) se piden aparte, solo si querés un objetivo corporal con tu Nutricionista.
 */
export function MeasurementsPanel({ measurements, onSave, onClose }: { measurements: BodyMeasurement[]; onSave: (m: BodyMeasurement) => Promise<string | null>; onClose: () => void }) {
  const today = fmtDate(new Date());
  const [values, setValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const submit = async () => {
    const m: BodyMeasurement = { fecha: today };
    for (const f of FIELDS) {
      const v = num(values[f.id] ?? "");
      if (v != null && !Number.isNaN(v)) (m as Record<string, unknown>)[f.id] = v;
    }
    if (Object.keys(m).length <= 1) return setMessage({ text: "Cargá al menos una medida.", ok: false });
    const err = await onSave(m);
    if (err) return setMessage({ text: "No se pudo guardar: " + err, ok: false });
    setValues({});
    setMessage({ text: "Medición guardada.", ok: true });
  };

  const lastOf = (id: string) => {
    if (id === "peso" || id === "altura") {
      const sorted = [...measurements].filter((m) => m[id] != null).sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
      return sorted[0] ? { fecha: sorted[0].fecha, value: sorted[0][id] as number } : null;
    }
    return latestValue(measurements, id as never);
  };

  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold mb-1">Cuerpo</div>
      <h2 className="font-display text-xl leading-none mb-1">Mis medidas</h2>
      <p className="mb-3 text-[12px] text-textMuted">Todo es opcional: cargá lo que te mediste hoy. Abajo de cada campo ves tu última medición.</p>
      <div className="grid grid-cols-2 gap-2">
        {FIELDS.map((f) => {
          const last = lastOf(f.id);
          return (
            <div key={f.id}>
              <label className="mb-0.5 block font-mono text-[8.5px] uppercase text-textMuted">
                {f.label} ({f.unit})
                {CORE_METRICS.includes(f.id as never) ? " · principal" : ""}
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                value={values[f.id] ?? ""}
                onChange={(event) => setValues((prev) => ({ ...prev, [f.id]: event.target.value }))}
              />
              <div className="mt-0.5 font-mono text-[9px] text-textMuted">
                {last ? `${last.value.toLocaleString("es-AR")} ${f.unit} · ${last.fecha.split("-").reverse().join("/")}` : "sin medir"}
              </div>
            </div>
          );
        })}
      </div>
      {message && <div className={`mt-2 text-[12px] ${message.ok ? "text-sage" : "text-rust"}`}>{message.text}</div>}
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onClose} className={btn("neutral", "sm")}>
          Cerrar
        </button>
        <button type="button" onClick={submit} className={btn("primary", "sm")}>
          Guardar medición
        </button>
      </div>
    </div>
  );
}
