"use client";

import { useState } from "react";
import { computeGoal, bmiInfo, addDays, fmtDate } from "@/lib/calculations";
import { CalculatorProfile, GoalMode } from "@/lib/types";
import { countDigits, MAX_DIGITS } from "@/lib/inputLimits";
import { FIELD_HELP } from "@/lib/helpText";
import { InfoHint } from "@/components/InfoHint";

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

  const bmi = bmiInfo(Number(actual), Number(altura));

  const setNum = (setter: (value: string) => void) => (value: string) => {
    if (countDigits(value) <= MAX_DIGITS) setter(value);
  };

  const applySuggestion = () => {
    if (!bmi) return;
    const actualNum = Number(actual);
    const objetivo = actualNum > bmi.saludableMax ? bmi.saludableMax : bmi.saludableMin;
    const semanasNecesarias = Math.max(1, Math.ceil((actualNum - objetivo) / 1));
    setMeta(String(objetivo));
    setFecha(fmtDate(addDays(new Date(), semanasNecesarias * 7)));
  };

  const handleCalc = () => {
    const computation = computeGoal({
      actual: Number(actual),
      altura: Number(altura),
      edad: Number(edad),
      sexo,
      modo,
      meta: Number(meta) || undefined,
      fecha: fecha || undefined,
    });

    if ("error" in computation) {
      setResult(<div className="text-rust text-[11px] italic">{computation.error}</div>);
      return;
    }

    const { basal, gastoBase, objetivo, detalle, deficit, bloqueado, motivoBloqueo } = computation;

    setResult(
      <>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Metabolismo basal" value={`${Math.round(basal).toLocaleString("es-AR")} kcal`} />
          <Stat label="Gasto base" value={`${gastoBase.toLocaleString("es-AR")} kcal`} color="text-sage" />
        </div>
        {deficit && (
          <div className="grid grid-cols-2 gap-2 mt-2.5">
            <Stat label="Días restantes" value={deficit.diasRestantes.toString()} />
            <Stat label="Déficit diario" value={`${deficit.deficitDiarioNecesario.toLocaleString("es-AR")} kcal`} color="text-sage" />
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 mt-2.5">
          <Stat label="Objetivo diario" value={`${objetivo.toLocaleString("es-AR")} kcal`} color={bloqueado ? "text-rust" : "text-gold"} />
          <Stat label="Modo" value={modo === "perder" ? "Perder grasa" : modo === "recomponer" ? "Recomponer" : "Aumentar masa"} />
        </div>
        <div className="text-[11px] text-textMuted italic mt-2.5">
          {detalle} El gasto diario luego varía con tus pasos y entrenamiento. Es una estimación orientativa.
        </div>
        {bloqueado ? (
          <div className="mt-3 rounded-lg border border-rust/50 bg-rust/10 p-2.5 text-[11px] text-rust">
            ⚠ {motivoBloqueo}
          </div>
        ) : (
          onApplyGoal && (
            <button
              onClick={() => onApplyGoal(gastoBase, objetivo, { actual, meta, altura, edad, sexo, fecha, modo })}
              className="w-full rounded-lg border border-gold/60 bg-gold/15 p-2.5 font-sans text-sm font-bold text-gold mt-3"
            >
              Usar este objetivo ({objetivo.toLocaleString("es-AR")} kcal/día)
            </button>
          )
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
          <label className="flex items-center">Peso actual (kg)<InfoHint text={FIELD_HELP.pesoActual} /></label>
          <input type="number" step="0.1" max="999999" value={actual} onChange={(e) => setNum(setActual)(e.target.value)} />
        </div>
        <div>
          <label className="flex items-center">Altura (cm)<InfoHint text={FIELD_HELP.altura} /></label>
          <input type="number" max="999999" value={altura} onChange={(e) => setNum(setAltura)(e.target.value)} />
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div>
          <label className="flex items-center">Edad<InfoHint text={FIELD_HELP.edad} /></label>
          <input type="number" max="999999" value={edad} onChange={(e) => setNum(setEdad)(e.target.value)} />
        </div>
        <div>
          <label className="flex items-center">Perfil metabólico<InfoHint text={FIELD_HELP.sexo} /></label>
          <select value={sexo} onChange={(e) => setSexo(e.target.value as typeof sexo)}>
            <option value="hombre">Hombre</option>
            <option value="mujer">Mujer</option>
          </select>
        </div>
      </div>
      {modo === "perder" && (
        <>
          {bmi && (
            <div className="mt-2 rounded-lg border border-sage/30 bg-sage/10 p-2.5 text-[11px] text-textMuted">
              <div className="mb-1">
                Tu IMC actual es <span className="font-mono text-text">{bmi.bmi.toFixed(1)}</span> ({bmi.categoria}).
                Para tu altura, un peso saludable (IMC 18.5–24.9) está entre{" "}
                <span className="font-mono text-text">{bmi.saludableMin}kg</span> y{" "}
                <span className="font-mono text-text">{bmi.saludableMax}kg</span>.
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
              <label className="flex items-center">Peso objetivo (kg)<InfoHint text={FIELD_HELP.pesoObjetivo} /></label>
              <input type="number" step="0.1" max="999999" value={meta} onChange={(e) => setNum(setMeta)(e.target.value)} />
            </div>
            <div>
              <label className="flex items-center">Fecha objetivo<InfoHint text={FIELD_HELP.fechaObjetivo} /></label>
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
