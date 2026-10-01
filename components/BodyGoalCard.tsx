"use client";

import { useState } from "react";
import { BODY_METRICS, CORE_METRICS, BodyGoal, BodyMeasurement, BodyMetric, computeBodyGoalProgress, earliestValue } from "@/lib/bodyGoal";
import { btn } from "@/components/buttonStyles";
import { fmtDate } from "@/lib/calculations";

const num = (v: string) => (v.trim() === "" ? undefined : Number(v.replace(",", ".")));
const fmt = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 1 });

/**
 * Objetivo corporal medible: estado inicial → meta con fecha (cintura, % de grasa, etc.). Sirve para recomponer, perder o
 * aumentar. Se arma una vez y después se agregan mediciones; la barra sale de inicial → actual → meta.
 */
export function BodyGoalCard({
  goal,
  measurements,
  suggestedMetric,
  requireCore = false,
  onSaveGoal,
  onSaveMeasurement,
}: {
  goal: BodyGoal | undefined;
  measurements: BodyMeasurement[];
  /** Qué medida sugerir al armar el objetivo (cintura para recomponer). */
  suggestedMetric: BodyMetric;
  /** Con Nutricionista: cintura, cadera y cuello son obligatorias en cada medición. */
  requireCore?: boolean;
  onSaveGoal: (goal: BodyGoal | undefined) => void;
  onSaveMeasurement: (m: BodyMeasurement) => Promise<string | null>;
}) {
  const today = fmtDate(new Date());
  const [mode, setMode] = useState<"none" | "goal" | "measure">("none");
  const [error, setError] = useState<string | null>(null);

  // Formulario del objetivo
  const [medida, setMedida] = useState<BodyMetric>(goal?.medida ?? suggestedMetric);
  const [inicial, setInicial] = useState(goal ? String(goal.inicial) : "");
  const [meta, setMeta] = useState(goal ? String(goal.meta) : "");
  const [fecha, setFecha] = useState(goal?.fecha ?? "");

  // Formulario de la medición
  const [values, setValues] = useState<Record<string, string>>({});
  const [showMore, setShowMore] = useState(false);

  const metric = BODY_METRICS.find((m) => m.id === (goal?.medida ?? medida))!;
  const progress = goal ? computeBodyGoalProgress(goal, measurements, today) : null;

  const openGoalForm = () => {
    // El punto de partida natural es tu primera medición de esa medida (con su fecha), no la de hoy.
    const first = earliestValue(measurements, medida);
    if (!goal && first && !inicial) setInicial(String(first.value));
    setError(null);
    setMode("goal");
  };

  const submitGoal = () => {
    const i = num(inicial);
    const m = num(meta);
    if (i == null || m == null || !fecha) return setError("Completá el valor inicial, la meta y la fecha.");
    if (i === m) return setError("La meta tiene que ser distinta del valor inicial.");
    if (fecha <= today) return setError("La fecha objetivo tiene que ser futura.");
    const first = earliestValue(measurements, medida);
    const desde = goal && goal.medida === medida && goal.inicial === i ? goal.desde : first && first.value === i ? first.fecha : today;
    onSaveGoal({ medida, inicial: i, meta: m, desde, fecha });
    // Si el valor inicial no sale de una medición ya cargada, queda como la primera de hoy (la barra arranca en 0%).
    if (!(first && first.value === i)) void onSaveMeasurement({ fecha: today, [medida]: i });
    setError(null);
    setMode("none");
  };

  const submitMeasurement = async () => {
    const m: BodyMeasurement = { fecha: today };
    for (const b of BODY_METRICS) {
      const v = num(values[b.id] ?? "");
      if (v != null && !Number.isNaN(v)) m[b.id] = v;
    }
    m.peso = num(values.peso ?? "");
    m.altura = num(values.altura ?? "");
    if (requireCore) {
      const missing = CORE_METRICS.filter((id) => m[id] == null).map((id) => BODY_METRICS.find((b) => b.id === id)!.label.split(" (")[0].toLowerCase());
      if (missing.length > 0) return setError(`Tu Nutricionista necesita estas medidas: te falta ${missing.join(", ")}.`);
    } else if (BODY_METRICS.every((b) => m[b.id] == null) && m.peso == null) return setError("Cargá al menos una medida.");
    const err = await onSaveMeasurement(m);
    if (err) return setError("No se pudo guardar: " + err);
    setValues({});
    setError(null);
    setMode("none");
  };

  return (
    <section className="rounded-2xl border border-border bg-surface/70 p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Objetivo corporal</div>

      {!goal || !progress ? (
        <>
          <div className="mt-1 text-[12px] text-textMuted">
            Ponele un número a tu objetivo: elegí una medida (la cintura es la más simple), tu valor de hoy y adónde querés llegar.
          </div>
          {mode !== "goal" && (
            <button type="button" onClick={openGoalForm} className={`${btn("primary", "sm", true)} mt-2`}>
              Armar mi objetivo
            </button>
          )}
        </>
      ) : (
        <>
          <div className="mt-0.5 font-display text-xl text-text">
            {metric.label}: {fmt(goal.inicial)} → {fmt(goal.meta)} {metric.unit}
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
                <span>
                  {progress.diasRestantes > 0 ? `${progress.diasRestantes} días para la fecha` : "La fecha ya pasó"}
                </span>
              </div>
              {progress.pctEsperado != null && (
                <div className={`mt-1.5 text-[12px] ${progress.pct >= progress.pctEsperado ? "text-sage" : "text-gold"}`}>
                  {progress.pct >= progress.pctEsperado ? "Vas a tiempo (la rayita marca dónde deberías ir hoy)." : "Vas un poco por detrás de la rayita (dónde deberías ir hoy)."}
                </div>
              )}
            </>
          )}
          {(progress.diasDesdeUltima == null || progress.diasDesdeUltima >= 14) && (
            <div className="mt-2 rounded-lg border border-yellow-500/60 bg-yellow-400/15 px-2.5 py-1.5 text-[12px] text-text">
              {progress.diasDesdeUltima == null ? "Todavía no cargaste ninguna medición." : `Hace ${progress.diasDesdeUltima} días que no te medís.`} Medite esta semana.
            </div>
          )}
        </>
      )}

      {mode === "goal" && (
        <div className="mt-2 space-y-2 rounded-lg border border-border bg-bg/40 p-2.5">
          <div>
            <label className="mb-0.5 block font-mono text-[8.5px] uppercase text-textMuted">Qué medís</label>
            <select value={medida} onChange={(event) => setMedida(event.target.value as BodyMetric)}>
              {BODY_METRICS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label} ({b.unit})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-0.5 block font-mono text-[8.5px] uppercase text-textMuted">Valor de hoy</label>
              <input type="number" inputMode="decimal" step="0.1" value={inicial} onChange={(event) => setInicial(event.target.value)} />
            </div>
            <div>
              <label className="mb-0.5 block font-mono text-[8.5px] uppercase text-textMuted">Meta</label>
              <input type="number" inputMode="decimal" step="0.1" value={meta} onChange={(event) => setMeta(event.target.value)} />
            </div>
          </div>
          <div>
            <label className="mb-0.5 block font-mono text-[8.5px] uppercase text-textMuted">Fecha objetivo</label>
            <input type="date" value={fecha} min={today} onChange={(event) => setFecha(event.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setMode("none")} className={btn("neutral", "sm")}>
              Cancelar
            </button>
            <button type="button" onClick={submitGoal} className={btn("primary", "sm")}>
              Guardar
            </button>
          </div>
        </div>
      )}

      {mode === "measure" && (
        <div className="mt-2 space-y-2 rounded-lg border border-border bg-bg/40 p-2.5">
          <div className="text-[11px] text-textMuted">
            {requireCore
              ? "Tu Nutricionista pide cintura, cadera y cuello en cada medición. Lo demás es opcional y suma a tu progreso."
              : "Cargá lo que te mediste hoy (todo es opcional)."}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[{ id: "peso", label: "Peso", unit: "kg" }, ...BODY_METRICS.filter((b) => CORE_METRICS.includes(b.id))].map((b) => (
              <div key={b.id}>
                <label className="mb-0.5 block font-mono text-[8.5px] uppercase text-textMuted">
                  {b.label} ({b.unit}){requireCore && CORE_METRICS.includes(b.id as never) ? " *" : ""}
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
          <button type="button" onClick={() => setShowMore((v) => !v)} className={btn("neutral", "sm", true)}>
            {showMore ? "Menos medidas" : "Más medidas (opcional)"}
          </button>
          <div className={`grid grid-cols-2 gap-2 ${showMore ? "" : "hidden"}`}>
            {[{ id: "altura", label: "Altura", unit: "cm" }, ...BODY_METRICS.filter((b) => !CORE_METRICS.includes(b.id))].map((b) => (
              <div key={b.id}>
                <label className="mb-0.5 block font-mono text-[8.5px] uppercase text-textMuted">
                  {b.label} ({b.unit})
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
            <button type="button" onClick={() => setMode("none")} className={btn("neutral", "sm")}>
              Cancelar
            </button>
            <button type="button" onClick={submitMeasurement} className={btn("primary", "sm")}>
              Guardar medición
            </button>
          </div>
        </div>
      )}

      {error && <div className="mt-2 text-[12px] text-rust">{error}</div>}

      {mode === "none" && goal && (
        <div className="mt-2 flex flex-wrap gap-2">
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
          <button type="button" onClick={openGoalForm} className={btn("secondary", "sm")}>
            Cambiar objetivo
          </button>
        </div>
      )}
    </section>
  );
}
