"use client";

import { useState } from "react";
import { GuidedGoalCalculator } from "@/components/GuidedGoalCalculator";
import { CalculatorProfile } from "@/lib/types";

type GoalResult = { gasto: number; objetivo: number; calculatorProfile: CalculatorProfile };
type Step = "calc" | "peso" | "pasos";

const STEP_LABELS: Record<Step, string> = {
  calc: "Definí tu objetivo",
  peso: "Tu peso actual",
  pasos: "Tus pasos típicos",
};

export function OnboardingWizard({
  tdeeFallback,
  onComplete,
}: {
  tdeeFallback: number;
  onComplete: (data: { gasto: number; objetivo: number; calculatorProfile: CalculatorProfile; pesoKg?: number; pasos?: number }) => void;
}) {
  const [step, setStep] = useState<Step>("calc");
  const [goalResult, setGoalResult] = useState<GoalResult | null>(null);
  const [pesoKg, setPesoKg] = useState("");
  const [pasos, setPasos] = useState("");

  const stepOrder: Step[] = ["calc", "peso", "pasos"];
  const stepIndex = stepOrder.indexOf(step);

  const finish = () => {
    if (!goalResult) return;
    onComplete({
      ...goalResult,
      pesoKg: Number(pesoKg) > 0 ? Number(pesoKg) : undefined,
      pasos: Number(pasos) > 0 ? Number(pasos) : undefined,
    });
  };

  return (
    <>
      <div className="mb-4 text-center">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold">Paso {stepIndex + 1} de {stepOrder.length}</div>
        <h1 className="mt-1 font-display text-2xl leading-tight text-text">{STEP_LABELS[step]}</h1>
      </div>

      {step === "calc" && (
        <GuidedGoalCalculator
          onApplyGoal={(gasto, objetivo, calculatorProfile) => {
            setGoalResult({ gasto, objetivo, calculatorProfile });
            setStep("peso");
          }}
        />
      )}

      {step === "peso" && (
        <div className="rounded-xl border border-sage/40 bg-surface p-4">
          <h3 className="mb-2 font-display text-lg text-text">¿Cuál es tu peso actual?</h3>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.1"
              min="0"
              autoFocus
              value={pesoKg}
              onChange={(event) => setPesoKg(event.target.value)}
              placeholder="Ej: 82.4"
              className="flex-1"
            />
            <span className="font-mono text-[11px] uppercase text-textMuted">kg</span>
          </div>
          <div className="mt-3 rounded-lg border border-border bg-bg/40 p-2.5 text-[11px] text-textMuted">
            <span className="text-gold">¿Para qué sirve?</span> Con tu peso de hoy ya arrancamos a calcular tu ranking de
            proteína diaria (cuánto necesitás para no perder masa muscular) desde el primer día, sin esperar a que cargues
            un peso semanal más adelante.
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setStep("pasos")}
              className="rounded-lg border border-border px-3 py-2.5 font-mono text-[10px] uppercase tracking-wide text-textMuted"
            >
              Saltear
            </button>
            <button
              type="button"
              onClick={() => setStep("pasos")}
              className="rounded-lg p-2.5 font-sans font-bold text-sm"
              style={{ background: "#C9A227", color: "#1C1B18" }}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {step === "pasos" && (
        <div className="rounded-xl border border-sage/40 bg-surface p-4">
          <h3 className="mb-2 font-display text-lg text-text">¿Cuántos pasos das en un día típico?</h3>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="100"
              min="0"
              autoFocus
              value={pasos}
              onChange={(event) => setPasos(event.target.value)}
              placeholder="Ej: 6000"
              className="flex-1"
            />
            <span className="font-mono text-[11px] uppercase text-textMuted">pasos</span>
          </div>
          <div className="mt-3 rounded-lg border border-border bg-bg/40 p-2.5 text-[11px] text-textMuted">
            <span className="text-gold">¿Para qué sirve?</span> Los pasos ajustan tu gasto calórico estimado del día — más
            movimiento significa más margen para comer y seguir en déficit/superávit según tu objetivo.
          </div>
          <div className="mt-2 text-[11px] text-textMuted">Ambos datos son opcionales — podés cargarlos después.</div>
          <button
            type="button"
            onClick={() => finish()}
            className="mt-3 w-full rounded-lg p-3 font-sans font-bold text-sm"
            style={{ background: "#C9A227", color: "#1C1B18" }}
          >
            Empezar a usar la app
          </button>
        </div>
      )}
    </>
  );
}
