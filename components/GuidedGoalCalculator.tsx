"use client";

import { useMemo, useState } from "react";
import { computeGoal, bmiInfo, addDays, fmtDate } from "@/lib/calculations";
import { CalculatorProfile, GoalMode } from "@/lib/types";
import { countDigits, MAX_DIGITS } from "@/lib/inputLimits";

type StepId = "modo" | "actual" | "altura" | "edad" | "sexo" | "meta" | "fecha" | "resultado";

export function GuidedGoalCalculator({
  onApplyGoal,
}: {
  onApplyGoal: (gasto: number, objetivo: number, profile: CalculatorProfile) => void;
}) {
  const [modo, setModo] = useState<GoalMode | null>(null);
  const [actual, setActual] = useState("");
  const [altura, setAltura] = useState("");
  const [edad, setEdad] = useState("");
  const [sexo, setSexo] = useState<"hombre" | "mujer" | null>(null);
  const [meta, setMeta] = useState("");
  const [fecha, setFecha] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState("");

  const steps: StepId[] = useMemo(
    () => (modo === "perder" ? ["modo", "actual", "altura", "edad", "sexo", "meta", "fecha", "resultado"] : ["modo", "actual", "altura", "edad", "sexo", "resultado"]),
    [modo]
  );
  const step = steps[stepIndex];
  const bmi = bmiInfo(Number(actual), Number(altura));

  const goNext = () => {
    setError("");
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  };
  const goBack = () => {
    setError("");
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  const validateAndNext = (value: string, message: string) => {
    if (!value || Number(value) <= 0) {
      setError(message);
      return;
    }
    goNext();
  };

  const applySuggestion = () => {
    if (!bmi) return;
    const actualNum = Number(actual);
    const objetivo = actualNum > bmi.saludableMax ? bmi.saludableMax : bmi.saludableMin;
    const semanas = Math.max(1, Math.ceil((actualNum - objetivo) / 1));
    setMeta(String(objetivo));
    setFecha(fmtDate(addDays(new Date(), semanas * 7)));
  };

  const kgABajar = Number(actual) - Number(meta);
  const setFechaPorRitmo = (kgPorSemana: number) => {
    if (kgABajar <= 0) return;
    const semanas = Math.max(1, Math.ceil(kgABajar / kgPorSemana));
    setFecha(fmtDate(addDays(new Date(), semanas * 7)));
  };
  const ritmoActual = (() => {
    if (!fecha || kgABajar <= 0) return null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const diasRestantes = Math.round((new Date(`${fecha}T00:00:00`).getTime() - hoy.getTime()) / 86400000);
    if (diasRestantes <= 0) return null;
    return kgABajar / (diasRestantes / 7);
  })();

  const computation =
    step === "resultado" && sexo
      ? computeGoal({
          actual: Number(actual),
          altura: Number(altura),
          edad: Number(edad),
          sexo,
          modo: modo || "recomponer",
          meta: Number(meta) || undefined,
          fecha: fecha || undefined,
        })
      : null;

  return (
    <div className="rounded-xl border border-sage/40 bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          disabled={stepIndex === 0}
          className="font-mono text-[10px] uppercase tracking-wide text-textMuted disabled:opacity-0"
        >
          ‹ Atrás
        </button>
        <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-textMuted">
          Dato {stepIndex + 1} de {steps.length}
        </div>
      </div>

      {step === "modo" && (
        <StepShell
          pregunta="¿Qué querés lograr?"
          info="Esto define cómo calculamos tu objetivo diario: con déficit calórico para bajar de peso, en mantenimiento para recomponer tu cuerpo, o con superávit para ganar masa."
        >
          <div className="grid grid-cols-1 gap-2">
            {(
              [
                ["perder", "Perder grasa"],
                ["recomponer", "Recomponer (mantenerme igual)"],
                ["aumentar", "Aumentar masa muscular"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setModo(value);
                  goNext();
                }}
                className="rounded-lg border border-border bg-bg px-3 py-3 text-left font-sans text-sm text-text hover:border-gold/60"
              >
                {label}
              </button>
            ))}
          </div>
        </StepShell>
      )}

      {step === "actual" && (
        <StepShell
          pregunta="¿Cuál es tu peso actual?"
          info="Es la base para calcular tu metabolismo basal — cuánta energía gastás en reposo, antes de sumar actividad."
        >
          <NumberField
            value={actual}
            onChange={setActual}
            placeholder="Ej: 82.4"
            suffix="kg"
            error={error}
            onSubmit={() => validateAndNext(actual, "Ingresá tu peso actual.")}
          />
        </StepShell>
      )}

      {step === "altura" && (
        <StepShell
          pregunta="¿Cuál es tu altura?"
          info="Entra en la fórmula del metabolismo basal, y también la usamos para calcular tu rango de peso saludable (IMC)."
        >
          <NumberField
            value={altura}
            onChange={setAltura}
            placeholder="Ej: 175"
            suffix="cm"
            error={error}
            onSubmit={() => validateAndNext(altura, "Ingresá tu altura.")}
          />
        </StepShell>
      )}

      {step === "edad" && (
        <StepShell pregunta="¿Cuál es tu edad?" info="El metabolismo basal baja levemente con la edad — lo usamos para ajustar el cálculo.">
          <NumberField
            value={edad}
            onChange={setEdad}
            placeholder="Ej: 30"
            suffix="años"
            error={error}
            onSubmit={() => validateAndNext(edad, "Ingresá tu edad.")}
          />
        </StepShell>
      )}

      {step === "sexo" && (
        <StepShell
          pregunta="¿Cuál es tu perfil metabólico?"
          info="Por diferencias de composición corporal, la fórmula de metabolismo basal varía según esto."
        >
          <div className="grid grid-cols-2 gap-2">
            {(["hombre", "mujer"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setSexo(value);
                  goNext();
                }}
                className="rounded-lg border border-border bg-bg px-3 py-3 text-center font-sans text-sm capitalize text-text hover:border-gold/60"
              >
                {value}
              </button>
            ))}
          </div>
        </StepShell>
      )}

      {step === "meta" && (
        <StepShell
          pregunta="¿A qué peso querés llegar?"
          info="Con esto calculamos cuánto déficit diario necesitás. Te sugerimos un rango saludable según tu altura (IMC 18.5–24.9)."
        >
          {bmi && (
            <div className="mb-2 rounded-lg border border-sage/30 bg-sage/10 p-2.5 text-[11px] text-textMuted">
              Tu IMC actual es <span className="font-mono text-text">{bmi.bmi.toFixed(1)}</span> ({bmi.categoria}). Un peso
              saludable para tu altura está entre <span className="font-mono text-text">{bmi.saludableMin}kg</span> y{" "}
              <span className="font-mono text-text">{bmi.saludableMax}kg</span>.
              <button
                type="button"
                onClick={applySuggestion}
                className="mt-2 w-full rounded-lg border border-sage/50 bg-sage/15 px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-sage"
              >
                Usar sugerencia (máx. 1kg/semana)
              </button>
            </div>
          )}
          <NumberField
            value={meta}
            onChange={setMeta}
            placeholder="Ej: 75"
            suffix="kg"
            error={error}
            onSubmit={() => validateAndNext(meta, "Ingresá tu peso objetivo.")}
          />
        </StepShell>
      )}

      {step === "fecha" && (
        <StepShell
          pregunta="¿Para cuándo?"
          info="Con la fecha calculamos las semanas disponibles y el déficit diario necesario. Elegí un ritmo de bajada, o tocá una fecha vos mismo y te decimos a cuánto por semana equivale."
        >
          <div className="mb-2 grid grid-cols-2 gap-1.5">
            {[0.25, 0.5, 0.75, 1].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => setFechaPorRitmo(rate)}
                className="rounded-lg border border-border bg-bg px-2 py-2 font-mono text-[10px] uppercase tracking-wide text-textMuted hover:border-gold/60"
              >
                {rate}kg / semana
              </button>
            ))}
          </div>
          <input type="date" value={fecha} onChange={(event) => setFecha(event.target.value)} className="w-full" />
          {ritmoActual != null && (
            <div className="mt-2 text-[11px] text-textMuted">
              Con esa fecha, el ritmo es de{" "}
              <span className={`font-mono ${ritmoActual > 1 ? "text-rust" : "text-sage"}`}>
                {ritmoActual.toFixed(2)}kg por semana
              </span>
              {ritmoActual > 1 && " — más de 1kg/semana puede llevarse masa muscular además de grasa."}
            </div>
          )}
          {error && <div className="mt-2 text-[11px] text-rust">{error}</div>}
          <button
            type="button"
            onClick={() => (fecha ? goNext() : setError("Elegí una fecha objetivo."))}
            className="mt-3 w-full rounded-lg p-3 font-sans font-bold text-sm"
            style={{ background: "#C9A227", color: "#1C1B18" }}
          >
            Siguiente
          </button>
        </StepShell>
      )}

      {step === "resultado" && computation && (
        <div>
          <h3 className="mb-2 font-display text-lg text-text">Tu objetivo</h3>
          {"error" in computation ? (
            <div className="text-[11px] italic text-rust">{computation.error}</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Metabolismo basal" value={`${Math.round(computation.basal).toLocaleString("es-AR")} kcal`} />
                <Stat label="Gasto base" value={`${computation.gastoBase.toLocaleString("es-AR")} kcal`} color="text-sage" />
              </div>
              {computation.deficit && (
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <Stat label="Días restantes" value={computation.deficit.diasRestantes.toString()} />
                  <Stat
                    label="Déficit diario"
                    value={`${computation.deficit.deficitDiarioNecesario.toLocaleString("es-AR")} kcal`}
                    color="text-sage"
                  />
                </div>
              )}
              <div className="mt-2.5">
                <Stat
                  label="Objetivo diario"
                  value={`${computation.objetivo.toLocaleString("es-AR")} kcal`}
                  color={computation.bloqueado ? "text-rust" : "text-gold"}
                />
              </div>
              <div className="mt-2.5 text-[11px] italic text-textMuted">
                {computation.detalle} El gasto diario luego varía con tus pasos y entrenamiento.
              </div>
              {computation.bloqueado ? (
                <div className="mt-3 rounded-lg border border-rust/50 bg-rust/10 p-2.5 text-[11px] text-rust">
                  ⚠ {computation.motivoBloqueo}
                  <button type="button" onClick={goBack} className="mt-2 w-full rounded-lg border border-rust/50 px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-rust">
                    ‹ Volver a elegir fecha
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    sexo &&
                    modo &&
                    onApplyGoal(computation.gastoBase, computation.objetivo, { actual, meta, altura, edad, sexo, fecha, modo })
                  }
                  className="mt-3 w-full rounded-lg p-3 font-sans font-bold text-sm"
                  style={{ background: "#C9A227", color: "#1C1B18" }}
                >
                  Usar este objetivo ({computation.objetivo.toLocaleString("es-AR")} kcal/día)
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function StepShell({ pregunta, info, children }: { pregunta: string; info: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 font-display text-lg text-text">{pregunta}</h3>
      {children}
      <div className="mt-3 rounded-lg border border-border bg-bg/40 p-2.5 text-[11px] text-textMuted">
        <span className="text-gold">¿Para qué sirve?</span> {info}
      </div>
    </div>
  );
}

function NumberField({
  value,
  onChange,
  placeholder,
  suffix,
  error,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  suffix: string;
  error?: string;
  onSubmit: () => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          step="0.1"
          min="0"
          max="999999"
          autoFocus
          value={value}
          onChange={(event) => {
            if (countDigits(event.target.value) <= MAX_DIGITS) onChange(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSubmit();
          }}
          placeholder={placeholder}
          className="flex-1"
        />
        <span className="font-mono text-[11px] uppercase text-textMuted">{suffix}</span>
      </div>
      {error && <div className="mt-2 text-[11px] text-rust">{error}</div>}
      <button
        type="button"
        onClick={onSubmit}
        className="mt-3 w-full rounded-lg p-3 font-sans font-bold text-sm"
        style={{ background: "#C9A227", color: "#1C1B18" }}
      >
        Siguiente
      </button>
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
