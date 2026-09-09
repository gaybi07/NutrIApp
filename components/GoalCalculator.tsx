"use client";

import { useState } from "react";
import { calcGoalDeficit, addDays, fmtDate } from "@/lib/calculations";
import { CalculatorProfile, GoalMode } from "@/lib/types";

export function GoalCalculator({
  tdeeFallback,
  onApplyGoal,
  initialProfile,
}: {
  tdeeFallback: number;
  onApplyGoal?: (gasto: number, objetivo: number, profile: CalculatorProfile) => void;
  initialProfile?: CalculatorProfile;
}) {
  const [actual, setActual] = useState(initialProfile?.actual || "");
  const [meta, setMeta] = useState(initialProfile?.meta || "");
  const [altura, setAltura] = useState(initialProfile?.altura || "");
  const [edad, setEdad] = useState(initialProfile?.edad || "");
  const [sexo, setSexo] = useState<"hombre" | "mujer">(initialProfile?.sexo || "hombre");
  const [fecha, setFecha] = useState(initialProfile?.fecha || "");
  const [modo, setModo] = useState<GoalMode>(initialProfile?.modo || "perder");
  const [result, setResult] = useState<React.ReactNode>(null);

  const alturaNum = Number(altura);
  const actualNum = Number(actual);
  const alturaValida = alturaNum > 0;
  const pesoValido = actualNum > 0;
  const alturaM = alturaNum / 100;
  const bmiActual = alturaValida && pesoValido ? actualNum / (alturaM * alturaM) : null;
  const bmiCategoria =
    bmiActual == null
      ? null
      : bmiActual < 18.5
      ? "bajo peso"
      : bmiActual < 25
      ? "normal"
      : bmiActual < 30
      ? "sobrepeso"
      : "obesidad";
  const pesoSaludableMin = alturaValida ? Math.round(18.5 * alturaM * alturaM * 10) / 10 : null;
  const pesoSaludableMax = alturaValida ? Math.round(24.9 * alturaM * alturaM * 10) / 10 : null;

  const applySuggestion = () => {
    if (pesoSaludableMax == null || !pesoValido) return;
    const objetivo = actualNum > pesoSaludableMax ? pesoSaludableMax : pesoSaludableMin ?? pesoSaludableMax;
    const kgABajar = actualNum - objetivo;
    const semanasNecesarias = Math.max(1, Math.ceil(kgABajar / 1));
    setMeta(String(objetivo));
    setFecha(fmtDate(addDays(new Date(), semanasNecesarias * 7)));
  };

  const handleCalc = () => {
    const a = Number(actual);
    const h = Number(altura);
    const e = Number(edad);
    if (!a || !h || !e || a <= 0 || h <= 0 || e <= 0) {
      setResult(<div className="text-textMuted text-[11px] italic">Completá peso, altura y edad para calcular.</div>);
      return;
    }

    const basal = sexo === "hombre" ? 10 * a + 6.25 * h - 5 * e + 5 : 10 * a + 6.25 * h - 5 * e - 161;
    const gastoBase = Math.round(basal * 1.2);
    let objetivo = gastoBase;
    let detalle = "Consumo de mantenimiento para recomposición corporal.";
    let deficitResult: ReturnType<typeof calcGoalDeficit> | null = null;

    if (modo === "perder") {
      const m = Number(meta);
      if (!m || !fecha) {
        setResult(<div className="text-textMuted text-[11px] italic">Completá peso objetivo y fecha para calcular la pérdida.</div>);
        return;
      }
      deficitResult = calcGoalDeficit(a, m, fecha, gastoBase);
      if ("error" in deficitResult) {
        setResult(<div className="text-rust text-[11px] italic">{deficitResult.error}</div>);
        return;
      }
      objetivo = deficitResult.kcalObjetivoSugerido;
      detalle = `Déficit gradual para llegar a ${m.toLocaleString("es-AR")} kg.`;
    } else if (modo === "aumentar") {
      objetivo = gastoBase + 250;
      detalle = "Superávit moderado para favorecer el aumento de masa.";
    }

    setResult(
      <>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Metabolismo basal" value={`${Math.round(basal).toLocaleString("es-AR")} kcal`} />
          <Stat label="Gasto base" value={`${gastoBase.toLocaleString("es-AR")} kcal`} color="text-sage" />
        </div>
        {deficitResult && "diasRestantes" in deficitResult && (
          <div className="grid grid-cols-2 gap-2 mt-2.5">
            <Stat label="Días restantes" value={deficitResult.diasRestantes.toString()} />
            <Stat label="Déficit diario" value={`${deficitResult.deficitDiarioNecesario.toLocaleString("es-AR")} kcal`} color="text-sage" />
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 mt-2.5">
          <Stat label="Objetivo diario" value={`${objetivo.toLocaleString("es-AR")} kcal`} color="text-gold" />
          <Stat label="Modo" value={modo === "perder" ? "Perder grasa" : modo === "recomponer" ? "Recomponer" : "Aumentar masa"} />
        </div>
        <div className="text-[11px] text-textMuted italic mt-2.5">
          {detalle} El gasto diario luego varía con tus pasos y entrenamiento. Es una estimación orientativa.
        </div>
        {onApplyGoal && (
          <button
            onClick={() => onApplyGoal(gastoBase, objetivo, { actual, meta, altura, edad, sexo, fecha, modo })}
            className="w-full rounded-lg border border-gold/60 bg-gold/15 p-2.5 font-sans text-sm font-bold text-gold mt-3"
          >
            Usar este objetivo ({objetivo.toLocaleString("es-AR")} kcal/día)
          </button>
        )}
      </>
    );
  };

  return (
    <div
      className="rounded-xl p-4 mb-3 border"
      style={{ borderColor: "#8A9A7C", background: "linear-gradient(135deg, rgba(138,154,124,0.08), #242220)" }}
    >
      <div className="font-display italic text-[15px] text-sage mb-2.5">⚖ Calculadora de consumo y objetivo</div>
      <div className="mb-2.5 text-[11px] text-textMuted">Calculá tu base personal y elegí qué querés lograr.</div>
      <div className="mb-2.5 grid grid-cols-3 gap-1.5">
        {[
          ["perder", "Perder grasa"],
          ["recomponer", "Recomponer"],
          ["aumentar", "Aumentar masa"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setModo(value as typeof modo)}
            className={`rounded-lg border px-2 py-2 text-[10px] font-semibold ${modo === value ? "border-gold bg-gold/15 text-gold" : "border-border bg-bg text-textMuted"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label>Peso actual (kg)</label>
          <input type="number" step="0.1" value={actual} onChange={(e) => setActual(e.target.value)} />
        </div>
        <div>
          <label>Altura (cm)</label>
          <input type="number" value={altura} onChange={(e) => setAltura(e.target.value)} />
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div>
          <label>Edad</label>
          <input type="number" value={edad} onChange={(e) => setEdad(e.target.value)} />
        </div>
        <div>
          <label>Perfil metabólico</label>
          <select value={sexo} onChange={(e) => setSexo(e.target.value as typeof sexo)}>
            <option value="hombre">Hombre</option>
            <option value="mujer">Mujer</option>
          </select>
        </div>
      </div>
      {modo === "perder" && (
        <>
          {bmiActual != null && pesoSaludableMin != null && pesoSaludableMax != null && (
            <div className="mt-2 rounded-lg border border-sage/30 bg-sage/10 p-2.5 text-[11px] text-textMuted">
              <div className="mb-1">
                Tu IMC actual es <span className="font-mono text-text">{bmiActual.toFixed(1)}</span> ({bmiCategoria}).
                Para tu altura, un peso saludable (IMC 18.5–24.9) está entre{" "}
                <span className="font-mono text-text">{pesoSaludableMin}kg</span> y{" "}
                <span className="font-mono text-text">{pesoSaludableMax}kg</span>.
              </div>
              <button
                type="button"
                onClick={applySuggestion}
                className="mt-1 w-full rounded-lg border border-sage/50 bg-sage/15 px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-sage"
              >
                Usar sugerencia (máx. 1kg/semana)
              </button>
            </div>
          )}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <label>Peso objetivo (kg)</label>
              <input type="number" step="0.1" value={meta} onChange={(e) => setMeta(e.target.value)} />
            </div>
            <div>
              <label>Fecha objetivo</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
          </div>
        </>
      )}
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
