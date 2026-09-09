"use client";

import { useState } from "react";
import { GoalCalculator } from "@/components/GoalCalculator";
import { CalculatorProfile } from "@/lib/types";

type GoalResult = { gasto: number; objetivo: number; calculatorProfile: CalculatorProfile };

export function OnboardingWizard({
  tdeeFallback,
  onComplete,
}: {
  tdeeFallback: number;
  onComplete: (data: { gasto: number; objetivo: number; calculatorProfile: CalculatorProfile; pesoKg?: number; pasos?: number }) => void;
}) {
  const [step, setStep] = useState<"calc" | "inicial">("calc");
  const [goalResult, setGoalResult] = useState<GoalResult | null>(null);
  const [pesoKg, setPesoKg] = useState("");
  const [pasos, setPasos] = useState("");

  const handleFinish = () => {
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
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
          Paso {step === "calc" ? "1" : "2"} de 2
        </div>
        <h1 className="mt-1 font-display text-2xl leading-tight text-text">
          {step === "calc" ? "Definí tu objetivo" : "Un par de datos más"}
        </h1>
        <p className="mt-1 text-[12px] text-textMuted">
          {step === "calc"
            ? "Con tu peso, altura y edad calculamos cuánto necesitás comer por día."
            : "Con esto la app arranca a estimar tu gasto real desde el primer día."}
        </p>
      </div>

      {step === "calc" && (
        <GoalCalculator
          tdeeFallback={tdeeFallback}
          onApplyGoal={(gasto, objetivo, calculatorProfile) => {
            setGoalResult({ gasto, objetivo, calculatorProfile });
            setStep("inicial");
          }}
        />
      )}

      {step === "inicial" && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label>Peso actual (kg)</label>
              <input
                type="number"
                step="0.1"
                min="1"
                value={pesoKg}
                onChange={(event) => setPesoKg(event.target.value)}
                placeholder="Ej: 82.4"
              />
            </div>
            <div>
              <label>Pasos típicos de un día</label>
              <input
                type="number"
                step="100"
                min="0"
                value={pasos}
                onChange={(event) => setPasos(event.target.value)}
                placeholder="Ej: 6000"
              />
            </div>
          </div>
          <div className="mt-2 text-[11px] text-textMuted">
            Ambos son opcionales — podés dejarlos vacíos y cargarlos después.
          </div>
          <button
            type="button"
            onClick={handleFinish}
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
