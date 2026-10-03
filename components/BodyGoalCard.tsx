"use client";

import { useState } from "react";
import { BODY_METRICS, CORE_METRICS, BodyGoal, BodyMeasurement, computeBodyGoalProgress, estimateBodyGoal, latestValue } from "@/lib/bodyGoal";
import { btn } from "@/components/buttonStyles";
import { fmtDate } from "@/lib/calculations";

const num = (v: string) => (v.trim() === "" ? undefined : Number(v.replace(",", ".")));
const fmt = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 1 });
const fmtAr = (iso: string) => iso.split("-").reverse().join("/");

/** Cada cuántos días se piden las medidas. */
export const MEASURE_EVERY_DAYS = 21;

/**
 * Objetivo corporal medible (solo con Nutricionista). Nunca lo escribe la persona: lo propone el profesional o una
 * estimación según su dieta y la fecha. Se pide cintura, cadera y cuello; si no las pasa, sigue usando la app sin objetivo.
 */
export function BodyGoalCard({
  goal,
  measurements,
  dailyDeficit,
  sexo,
  onSaveGoal,
  onSaveMeasurement,
}: {
  goal: BodyGoal | undefined;
  measurements: BodyMeasurement[];
  /** Déficit diario promedio en kcal (0 o menos = mantenimiento / recomposición). */
  dailyDeficit: number;
  sexo: "hombre" | "mujer";
  onSaveGoal: (goal: BodyGoal | undefined) => void;
  onSaveMeasurement: (m: BodyMeasurement) => Promise<string | null>;
}) {
  const today = fmtDate(new Date());
  const [mode, setMode] = useState<"none" | "measure" | "estimate">("none");
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [weeks, setWeeks] = useState(12);
  // La medición se abrió para poder pedir la estimación (hacen falta cintura, cadera y cuello).
  const [forGoal, setForGoal] = useState(false);

  const coreMissing = CORE_METRICS.some((id) => latestValue(measurements, id) == null);
  const progress = goal ? computeBodyGoalProgress(goal, measurements, today) : null;
  const metric = goal ? BODY_METRICS.find((m) => m.id === goal.medida)! : null;

  const openEstimate = () => {
    setError(null);
    if (coreMissing) {
      setForGoal(true);
      setMode("measure");
    } else setMode("estimate");
  };

  const proposal = (() => {
    const cintura = latestValue(measurements, "cintura");
    return cintura ? estimateBodyGoal({ actual: cintura.value, desde: cintura.fecha, semanas: weeks, dailyDeficit, sexo, todayIso: today }) : null;
  })();

  const acceptProposal = () => {
    if (!proposal) return;
    onSaveGoal(proposal);
    setMode("none");
  };

  const submitMeasurement = async () => {
    const m: BodyMeasurement = { fecha: today };
    for (const b of BODY_METRICS) {
      const v = num(values[b.id] ?? "");
      if (v != null && !Number.isNaN(v)) m[b.id] = v;
    }
    m.peso = num(values.peso ?? "");
    if (forGoal) {
      const missing = CORE_METRICS.filter((id) => m[id] == null && latestValue(measurements, id) == null).map((id) =>
        BODY_METRICS.find((b) => b.id === id)!.label.split(" (")[0].toLowerCase()
      );
      if (missing.length > 0) return setError(`Para la estimación hacen falta las tres: te falta ${missing.join(", ")}.`);
    } else if (goal && CORE_METRICS.some((id) => m[id] == null)) {
      return setError("Tu Nutricionista pide cintura, cadera y cuello en cada medición.");
    }
    if (BODY_METRICS.every((b) => m[b.id] == null) && m.peso == null) return setError("Cargá al menos una medida.");
    const err = await onSaveMeasurement(m);
    if (err) return setError("No se pudo guardar: " + err);
    setValues({});
    setError(null);
    if (forGoal) {
      setForGoal(false);
      setMode("estimate");
      return;
    }
    setMode("none");
  };

  return (
    <section className="rounded-2xl border border-border bg-surface/70 p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Objetivo corporal</div>

      {!goal || !progress || !metric ? (
        <>
          <div className="mt-1 text-[12px] text-textMuted">
            Es opcional. Tu Nutricionista puede proponértelo, o podés pedir una estimación de cuánto te conviene bajar de cintura para una fecha, según tu dieta.
          </div>
          <div className="mt-1.5 rounded-lg border border-gold/30 bg-gold/5 px-2.5 py-1.5 text-[11px] text-textMuted">
            Para armarlo se piden cintura, cadera y cuello. Si preferís no pasarlas, seguís usando la app igual, sin objetivo corporal.
          </div>
        </>
      ) : (
        <>
          <div className="mt-0.5 font-display text-xl text-text">
            {metric.label}: {fmt(goal.inicial)} → {fmt(goal.meta)} {metric.unit}
          </div>
          <div className="font-mono text-[9px] uppercase tracking-wide text-textMuted">
            {goal.propuestoPor === "profesional" ? "Lo propuso tu Nutricionista" : "Estimación según tu dieta"} · para el {fmtAr(goal.fecha)}
          </div>
          {progress.yaLlego ? (
            <div className="mt-2 rounded-lg border border-sage/40 bg-sage/10 px-3 py-2 text-[13px] text-sage">¡Llegaste a tu meta!</div>
          ) : (
            <>
              <div className="mt-2 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-wide text-textMuted">
                <span>
                  Hoy {fmt(progress.actual)} {metric.unit} · faltan {fmt(progress.restante)}
                </span>
                <span>{progress.pct}%</span>
              </div>
              <div className="relative mt-1 h-2 w-full overflow-hidden rounded-full bg-bg">
                <div className="h-full rounded-full bg-gold" style={{ width: `${progress.pct}%` }} />
                {progress.pctEsperado != null && <div className="absolute top-0 h-full w-0.5 bg-text/70" style={{ left: `${progress.pctEsperado}%` }} />}
              </div>
              <div className="mt-1 flex justify-between font-mono text-[9px] text-textMuted">
                <span>Empezaste en {fmt(goal.inicial)}</span>
                <span>{progress.diasRestantes > 0 ? `${progress.diasRestantes} días para la fecha` : "La fecha ya pasó"}</span>
              </div>
              {progress.pctEsperado != null && (
                <div className={`mt-1.5 text-[12px] ${progress.pct >= progress.pctEsperado ? "text-sage" : "text-gold"}`}>
                  {progress.pct >= progress.pctEsperado ? "Vas a tiempo (la rayita marca dónde deberías ir hoy)." : "Vas un poco por detrás de la rayita (dónde deberías ir hoy)."}
                </div>
              )}
            </>
          )}
        </>
      )}

      {mode === "estimate" && (
        <div className="mt-2 space-y-2 rounded-lg border border-border bg-bg/40 p-2.5">
          <div>
            <label className="mb-0.5 block font-mono text-[8.5px] uppercase text-textMuted">¿En cuánto tiempo?</label>
            <select value={weeks} onChange={(event) => setWeeks(Number(event.target.value))}>
              {[6, 9, 12, 16].map((w) => (
                <option key={w} value={w}>
                  {w} semanas
                </option>
              ))}
            </select>
          </div>
          {proposal ? (
            <div className="rounded-lg border border-gold/40 bg-gold/5 px-2.5 py-2">
              <div className="font-mono text-[9px] uppercase tracking-wide text-gold">Estimación</div>
              <div className="font-display text-lg text-text">
                Cintura {fmt(proposal.inicial)} → {fmt(proposal.meta)} cm
              </div>
              <div className="text-[11px] text-textMuted">
                Para el {fmtAr(proposal.fecha)}, con tu dieta actual
                {dailyDeficit > 0 ? ` (déficit de ~${Math.round(dailyDeficit)} kcal por día)` : " (en mantenimiento, recomposición suave)"}. Es una estimación, no una promesa.
              </div>
            </div>
          ) : (
            <div className="text-[12px] text-textMuted">Necesito tu medición de cintura para estimar.</div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setMode("none")} className={btn("neutral", "sm")}>
              No, gracias
            </button>
            <button type="button" onClick={acceptProposal} disabled={!proposal} className={btn("primary", "sm")}>
              Aceptar objetivo
            </button>
          </div>
        </div>
      )}

      {mode === "measure" && (
        <div className="mt-2 space-y-2 rounded-lg border border-border bg-bg/40 p-2.5">
          <div className="text-[11px] text-textMuted">
            {goal || forGoal
              ? "Tu Nutricionista pide cintura, cadera y cuello. Las demás medidas las cargás aparte, en «Mis medidas», en el menú."
              : "Cargá lo que te mediste hoy."}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[{ id: "peso", label: "Peso", unit: "kg" }, ...BODY_METRICS.filter((b) => CORE_METRICS.includes(b.id))].map((b) => (
              <div key={b.id}>
                <label className="mb-0.5 block font-mono text-[8.5px] uppercase text-textMuted">
                  {b.label} ({b.unit}){(goal || forGoal) && CORE_METRICS.includes(b.id as never) ? " *" : ""}
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={values[b.id] ?? ""}
                  onChange={(event) => setValues((prev) => ({ ...prev, [b.id]: event.target.value }))}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setForGoal(false);
                setMode("none");
              }}
              className={btn("neutral", "sm")}
            >
              {forGoal ? "No quiero pasarlas" : "Cancelar"}
            </button>
            <button type="button" onClick={submitMeasurement} className={btn("primary", "sm")}>
              Guardar medición
            </button>
          </div>
        </div>
      )}

      {error && <div className="mt-2 text-[12px] text-rust">{error}</div>}

      {mode === "none" && (
        <div className="mt-2 flex flex-wrap gap-2">
          {(goal || !coreMissing) && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode("measure");
              }}
              className={btn("primary", "sm")}
            >
              + Cargar medición
            </button>
          )}
          <button type="button" onClick={openEstimate} className={btn(goal || !coreMissing ? "secondary" : "primary", "sm", !goal && coreMissing)}>
            {goal ? "Pedir nueva estimación" : "Pedir una estimación"}
          </button>
        </div>
      )}
    </section>
  );
}
