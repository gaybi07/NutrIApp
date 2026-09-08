"use client";

import { useState } from "react";
import { calcGoalDeficit } from "@/lib/calculations";

export function GoalCalculator({ avgGasto, tdeeFallback }: { avgGasto: number; tdeeFallback: number }) {
  const [actual, setActual] = useState("");
  const [meta, setMeta] = useState("");
  const [fecha, setFecha] = useState("");
  const [result, setResult] = useState<React.ReactNode>(null);

  const handleCalc = () => {
    const a = Number(actual);
    const m = Number(meta);
    if (!a || !m || !fecha) {
      setResult(<div className="text-textMuted text-[11px] italic">Completá los tres campos para calcular.</div>);
      return;
    }
    const gastoRef = avgGasto > 0 ? avgGasto : tdeeFallback;
    const r = calcGoalDeficit(a, m, fecha, gastoRef);

    if ("error" in r) {
      setResult(<div className="text-rust text-[11px] italic">{r.error}</div>);
      return;
    }

    setResult(
      <>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Días restantes" value={r.diasRestantes.toString()} />
          <Stat label="Kg a bajar" value={r.kgABajar.toFixed(1)} />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2.5">
          <Stat label="Déficit diario necesario" value={`${r.deficitDiarioNecesario.toLocaleString("es-AR")} kcal`} color="text-sage" />
          <Stat label="Kcal objetivo sugerido" value={r.kcalObjetivoSugerido.toLocaleString("es-AR")} color="text-gold" />
        </div>
        <div className="text-[11px] text-textMuted italic mt-2.5">
          Basado en un gasto de referencia de ~{gastoRef.toLocaleString("es-AR")} kcal/día. Es una validación
          orientativa — no reemplaza tu propio criterio ni el de un profesional.
        </div>
        {r.esAgresivo && (
          <div className="text-rust text-[11px] mt-2">
            ⚠ Este ritmo ({r.kgPorSemana.toFixed(2)} kg/semana, ~{r.pctDelGasto.toFixed(0)}% de tu gasto estimado) es
            más agresivo de lo recomendable. Lo usual es no superar ~1% del peso corporal por semana.
          </div>
        )}
      </>
    );
  };

  return (
    <div
      className="rounded-xl p-4 mb-3 border"
      style={{ borderColor: "#8A9A7C", background: "linear-gradient(135deg, rgba(138,154,124,0.08), #242220)" }}
    >
      <div className="font-display italic text-[15px] text-sage mb-2.5">⚖ Calculadora de objetivo → déficit necesario</div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label>Peso actual (kg)</label>
          <input type="number" step="0.1" value={actual} onChange={(e) => setActual(e.target.value)} />
        </div>
        <div>
          <label>Peso objetivo (kg)</label>
          <input type="number" step="0.1" value={meta} onChange={(e) => setMeta(e.target.value)} />
        </div>
      </div>
      <div className="mt-2">
        <label>Fecha objetivo</label>
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </div>
      <button
        onClick={handleCalc}
        className="w-full rounded-lg p-3 font-sans font-bold text-sm mt-2.5"
        style={{ background: "#8A9A7C", color: "#1C1B18" }}
      >
        Calcular
      </button>
      {result && <div className="mt-3 pt-3 border-t border-dashed border-border">{result}</div>}
    </div>
  );
}

function Stat({ label, value, color = "text-text" }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <label>{label}</label>
      <div className={`font-mono text-base ${color}`}>{value}</div>
    </div>
  );
}
