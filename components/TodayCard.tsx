"use client";

import { DayEntry, INTENSITY_STYLES } from "@/lib/types";
import { dayTotal, dayProt, dayGoal } from "@/lib/calculations";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DOW = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export function TodayCard({
  entry,
  goal,
  tdeeFallback,
  onLogMeal,
  onLogTraining,
}: {
  entry: DayEntry;
  goal: number;
  tdeeFallback: number;
  onLogMeal: () => void;
  onLogTraining: () => void;
}) {
  const today = new Date(`${entry.fecha}T00:00:00`);
  const consumed = dayTotal(entry);
  const adjustedGoal = dayGoal(entry, goal, tdeeFallback);
  const remaining = Math.max(0, adjustedGoal - consumed);
  const protein = dayProt(entry);
  const over = consumed > adjustedGoal;
  const pct = adjustedGoal > 0 ? Math.min(100, Math.round((consumed / adjustedGoal) * 100)) : 0;
  const intensidad = entry.entreno ? entry.entrenoIntensidad || "moderado" : "ninguno";
  const trainingStyle = INTENSITY_STYLES[intensidad];

  return (
    <section className="mb-4 rounded-2xl border border-gold/40 bg-surface p-3">
      <div className="mb-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Hoy</div>
        <h2 className="font-display text-xl leading-none capitalize">
          {DOW[today.getDay()]} {today.getDate()} {MONTHS[today.getMonth()]}
        </h2>
      </div>

      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="font-display text-2xl leading-none text-text">{consumed.toLocaleString("es-AR")}</span>
        <span className="font-mono text-[11px] text-textMuted">de {adjustedGoal.toLocaleString("es-AR")} kcal</span>
      </div>
      <div className="mb-3 h-2.5 w-full overflow-hidden rounded-full border border-border bg-bg/60">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: over ? "#B5533C" : "#C9A227" }}
        />
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-textMuted">Restantes</div>
          <div className={`font-display text-base leading-tight ${over ? "text-rust" : "text-sage"}`}>
            {remaining.toLocaleString("es-AR")}
          </div>
        </div>
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-textMuted">Proteína</div>
          <div className="font-display text-base leading-tight text-text">{protein.toLocaleString("es-AR")}g</div>
        </div>
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-textMuted">Pasos</div>
          <div className="font-display text-base leading-tight text-text">{(entry.pasos || 0).toLocaleString("es-AR")}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onLogMeal}
          className="rounded-xl border border-gold/60 bg-gold px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-bg"
        >
          + Cargar comida
        </button>
        <button
          type="button"
          onClick={onLogTraining}
          className="flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em]"
          style={
            entry.entreno
              ? { background: trainingStyle.background, color: trainingStyle.color, borderColor: trainingStyle.background }
              : { background: "#8A9A7C", color: "#1C1B18", borderColor: "rgba(138,154,124,0.6)" }
          }
        >
          {entry.entreno && <span className="h-2 w-2 rounded-full bg-current opacity-70" />}
          {entry.entreno ? trainingStyle.label : "+ Entrenamiento"}
        </button>
      </div>
    </section>
  );
}
