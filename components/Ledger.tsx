"use client";

import { useState } from "react";
import { DayEntry, emptyDay, TrainingIntensity, INTENSITY_STYLES } from "@/lib/types";
import { dayTotal, dayProt, dayDeficit, estimateTrainingCalories } from "@/lib/calculations";
import { Collapsible } from "@/components/Collapsible";
import { useEscapeKey } from "@/lib/useEscapeKey";

const DOW = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function Ledger({
  weekDates,
  weekDays,
  goal,
  tdeeFallback,
  onUpsert,
}: {
  weekDates: string[];
  weekDays: (DayEntry | null)[];
  goal: number;
  tdeeFallback: number;
  onUpsert: (entry: DayEntry) => void;
}) {
  const anyData = weekDays.some((d) => d);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  useEscapeKey(() => setActiveDate(null), activeDate !== null);

  const activeDay = activeDate ? weekDays[weekDates.indexOf(activeDate)] : null;
  const activeIntensity = activeDay?.entreno ? activeDay.entrenoIntensidad || "moderado" : "ninguno";

  const saveIntensity = (intensidad: TrainingIntensity | "ninguno") => {
    if (!activeDate) return;
    const existing = activeDay || emptyDay(activeDate);
    const minutos = existing.entrenoMinutos || 60;
    onUpsert({
      ...existing,
      entreno: intensidad !== "ninguno",
      entrenoIntensidad: intensidad !== "ninguno" ? intensidad : undefined,
      entrenoMinutos: intensidad !== "ninguno" ? minutos : undefined,
      entrenamientos: intensidad !== "ninguno" ? [{ intensidad, minutos }] : [],
    });
    setActiveDate(null);
  };

  return (
    <Collapsible eyebrow="Detalle diario" title="Tabla de la semana">
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="grid grid-cols-[1.1fr_0.85fr_0.75fr_0.85fr_0.8fr_0.6fr] px-3 py-2 font-mono text-[8.5px] uppercase tracking-wide text-textMuted border-b border-border">
        <span>Día</span><span>Kcal</span><span>Prot.</span><span>Déficit</span><span>Pasos</span><span>Entr.</span>
      </div>
      {!anyData && <div className="p-6 text-center text-textMuted text-sm">Sin datos esta semana.</div>}
      {anyData &&
        weekDates.map((fecha, i) => {
          const d = weekDays[i];
          const dateObj = new Date(`${fecha}T00:00:00`);
          const total = d ? dayTotal(d) : null;
          const prot = d ? dayProt(d) : null;
          const deficit = d ? dayDeficit(d, tdeeFallback) : null;
          const intensidad = d?.entreno ? d.entrenoIntensidad || "moderado" : "ninguno";
          const trainingStyle = INTENSITY_STYLES[intensidad];
          const overClass = total !== null ? (total > goal ? "text-rust" : "text-sage") : "";
          const deficitClass = deficit !== null ? (deficit >= 0 ? "text-sage" : "text-rust") : "";

          return (
            <div
              key={fecha}
              className={`grid grid-cols-[1.1fr_0.85fr_0.75fr_0.85fr_0.8fr_0.6fr] px-3 py-3 items-center border-b border-dashed border-border last:border-0 font-mono text-[11.5px] ${d?.entreno ? "bg-gold/[0.07]" : ""}`}
            >
              <span className="font-sans font-medium text-[12px]">
                {dateObj.getDate()} {MONTHS[dateObj.getMonth()]}
                <span className="block font-mono text-[9px] text-textMuted uppercase">{DOW[dateObj.getDay()]}</span>
              </span>
              <span className={overClass}>{total !== null ? total.toLocaleString("es-AR") : "—"}</span>
              <span>{prot !== null ? `${prot.toLocaleString("es-AR")}g` : "—"}</span>
              <span className={deficitClass}>{deficit !== null ? `${deficit >= 0 ? "+" : ""}${deficit.toLocaleString("es-AR")}` : "—"}</span>
              <span>{d?.pasos ? d.pasos.toLocaleString("es-AR") : "—"}</span>
              <button
                type="button"
                aria-label={`Elegir intensidad del ${fecha}`}
                onClick={() => setActiveDate(fecha)}
                className="flex min-w-0 items-center gap-1 text-left"
              >
                <span
                  className="h-5 w-5 shrink-0 rounded-full border border-border/80 shadow-inner"
                  style={{ backgroundColor: trainingStyle.background }}
                />
              </button>
            </div>
          );
        })}
      {activeDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm" onClick={() => setActiveDate(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-1 font-display text-xl text-text">Intensidad del entrenamiento</div>
            <div className="mb-3 text-[11px] text-textMuted">Elegí la opción para ese día. El gasto se calcula con tu peso y duración.</div>
            <div className="space-y-2">
              {Object.entries(INTENSITY_STYLES).map(([value, style]) => {
                const intensity = value as TrainingIntensity | "ninguno";
                const calories = intensity === "ninguno" ? 0 : estimateTrainingCalories({
                  ...(activeDay || emptyDay(activeDate)),
                  entreno: true,
                  entrenoIntensidad: intensity,
                });
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => saveIntensity(intensity)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${activeIntensity === intensity ? "border-gold" : "border-border"}`}
                  >
                    <span className="h-5 w-5 shrink-0 rounded-full border border-border/80" style={{ backgroundColor: style.background }} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-sm text-text">{style.label}</span>
                      <span className="block text-[11px] text-textMuted">{style.description}</span>
                    </span>
                    <span className="font-mono text-[11px] text-textMuted">+{calories} kcal</span>
                  </button>
                );
              })}
            </div>
            <button type="button" onClick={() => setActiveDate(null)} className="mt-3 w-full rounded-lg border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-textMuted">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
    </Collapsible>
  );
}
