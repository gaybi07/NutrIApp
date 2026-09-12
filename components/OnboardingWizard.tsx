"use client";

import { useState } from "react";
import { GuidedGoalCalculator } from "@/components/GuidedGoalCalculator";
import { CalculatorProfile, FontSize, FONT_SIZE_OPTIONS } from "@/lib/types";

type GoalResult = { gasto: number; objetivo: number; calculatorProfile: CalculatorProfile };
type Step = "tamano" | "calc" | "actividad";
type ActivityLevel = "leve" | "moderado" | "alto" | "exigente";

const ACTIVITY_LEVELS: Record<ActivityLevel, { label: string; pasos: number; description: string }> = {
  leve: {
    label: "Leve",
    pasos: 3000,
    description: "Trabajo de oficina y pocos pasos en el día — te movés poco fuera de lo cotidiano.",
  },
  moderado: {
    label: "Moderado",
    pasos: 6000,
    description: "Algún día entrenás, algún día no. Actividad intercalada durante la semana.",
  },
  alto: {
    label: "Alto",
    pasos: 9000,
    description: "Entrenás 3 o 4 veces por semana, y además te movés bastante o tenés un trabajo activo.",
  },
  exigente: {
    label: "Exigente",
    pasos: 12000,
    description: "Entrenás 4 o 5 veces por semana, te movés mucho y superás los 10.000 pasos por día.",
  },
};

const STEP_LABELS: Record<Step, string> = {
  tamano: "Tamaño de letra",
  calc: "Definí tu objetivo",
  actividad: "Tu nivel de actividad",
};

export function OnboardingWizard({
  tdeeFallback,
  fontSize,
  onSelectFontSize,
  onComplete,
}: {
  tdeeFallback: number;
  fontSize?: FontSize;
  onSelectFontSize: (fontSize: FontSize) => void;
  onComplete: (data: { gasto: number; objetivo: number; calculatorProfile: CalculatorProfile; pesoKg?: number; pasos?: number }) => void;
}) {
  const [step, setStep] = useState<Step>("tamano");
  const [goalResult, setGoalResult] = useState<GoalResult | null>(null);

  const stepOrder: Step[] = ["tamano", "calc", "actividad"];
  const stepIndex = stepOrder.indexOf(step);

  const finish = (activity?: ActivityLevel) => {
    if (!goalResult) return;
    const pesoKg = Number(goalResult.calculatorProfile.actual) || undefined;
    onComplete({
      ...goalResult,
      pesoKg,
      pasos: activity ? ACTIVITY_LEVELS[activity].pasos : undefined,
    });
  };

  return (
    <>
      <div className="mb-4 text-center">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold">Paso {stepIndex + 1} de {stepOrder.length}</div>
        <h1 className="mt-1 font-display text-2xl leading-tight text-text">{STEP_LABELS[step]}</h1>
      </div>

      {step === "tamano" && (
        <div className="rounded-xl border border-sage/40 bg-surface p-4">
          <h3 className="mb-2 font-display text-lg text-text">¿Qué tamaño de letra preferís?</h3>
          <div className="mb-3 text-[11px] text-textMuted">
            Podés cambiarlo cuando quieras desde Preferencias, tocando el engranaje arriba.
          </div>
          <div className="grid grid-cols-1 gap-2">
            {FONT_SIZE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onSelectFontSize(opt.value);
                  setStep("calc");
                }}
                className={`rounded-lg border px-3 py-3 text-left transition-colors ${
                  (fontSize || "chico") === opt.value ? "border-gold bg-gold/10" : "border-border bg-bg hover:border-gold/60"
                }`}
              >
                <div className="font-sans font-bold text-text" style={{ fontSize: opt.previewPx }}>
                  {opt.label}
                </div>
                <div className="mt-0.5 text-[11px] text-textMuted">{opt.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "calc" && (
        <GuidedGoalCalculator
          onApplyGoal={(gasto, objetivo, calculatorProfile) => {
            setGoalResult({ gasto, objetivo, calculatorProfile });
            setStep("actividad");
          }}
        />
      )}

      {step === "actividad" && (
        <div className="rounded-xl border border-sage/40 bg-surface p-4">
          <h3 className="mb-2 font-display text-lg text-text">¿Cómo es tu nivel de actividad en un día típico?</h3>
          <div className="grid grid-cols-1 gap-2">
            {(Object.keys(ACTIVITY_LEVELS) as ActivityLevel[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => finish(key)}
                className="rounded-lg border border-border bg-bg px-3 py-2.5 text-left hover:border-gold/60"
              >
                <div className="font-sans text-sm font-semibold text-text">{ACTIVITY_LEVELS[key].label}</div>
                <div className="mt-0.5 text-[11px] text-textMuted">{ACTIVITY_LEVELS[key].description}</div>
              </button>
            ))}
          </div>
          <div className="mt-3 rounded-lg border border-border bg-bg/40 p-2.5 text-[11px] text-textMuted">
            <span className="text-gold">¿Para qué sirve?</span> Con esto arrancamos a estimar tu gasto calórico real del
            día a día (usamos un número de pasos representativo de tu nivel). Podés ajustarlo después con datos reales
            desde "Hoy" o "Pasos de la semana".
          </div>
          <button
            type="button"
            onClick={() => finish()}
            className="mt-3 w-full rounded-lg border border-border px-3 py-2.5 font-mono text-[10px] uppercase tracking-wide text-textMuted"
          >
            Saltear y empezar a usar la app
          </button>
        </div>
      )}
    </>
  );
}
