"use client";

import { DayEntry, TrainingIntensity, INTENSITY_STYLES } from "@/lib/types";
import { dayTotal, dayProt, estimateTrainingCalories } from "@/lib/calculations";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DOW = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export function TodayCard({
  entry,
  goal,
  onUpsert,
  onLogMeal,
}: {
  entry: DayEntry;
  goal: number;
  onUpsert: (entry: DayEntry) => void;
  onLogMeal: () => void;
}) {
  const today = new Date(`${entry.fecha}T00:00:00`);
  const consumed = dayTotal(entry);
  const remaining = Math.max(0, goal - consumed);
  const protein = dayProt(entry);
  const intensidad = entry.entreno ? entry.entrenoIntensidad || "moderado" : "ninguno";

  const savePasos = (value: string) => {
    onUpsert({ ...entry, pasos: Math.max(0, Number(value) || 0) });
  };

  const saveIntensity = (value: TrainingIntensity | "ninguno") => {
    onUpsert({
      ...entry,
      entreno: value !== "ninguno",
      entrenoIntensidad: value !== "ninguno" ? value : undefined,
      entrenoMinutos: value !== "ninguno" ? entry.entrenoMinutos || 60 : undefined,
    });
  };

  return (
    <section className="mb-4 rounded-2xl border border-gold/40 bg-surface p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Hoy</div>
          <h2 className="font-display text-xl leading-none capitalize">
            {DOW[today.getDay()]} {today.getDate()} {MONTHS[today.getMonth()]}
          </h2>
        </div>
        <button
          type="button"
          onClick={onLogMeal}
          className="rounded-xl border border-gold/60 bg-gold px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-bg"
        >
          + Cargar comida
        </button>
      </div>

      <div className="mb-3 font-mono text-[11px] text-textMuted">
        Llevás <span className="text-text">{consumed.toLocaleString("es-AR")}</span> de{" "}
        {goal.toLocaleString("es-AR")} kcal · te quedan{" "}
        <span className="text-sage">{remaining.toLocaleString("es-AR")}</span> kcal · {protein.toLocaleString("es-AR")}g prot.
      </div>

      <div className="mb-3">
        <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted">Pasos</label>
        <input
          key={entry.pasos || 0}
          type="number"
          min="0"
          step="100"
          inputMode="numeric"
          defaultValue={entry.pasos || ""}
          placeholder="0"
          onBlur={(event) => savePasos(event.target.value)}
          className="w-full"
        />
      </div>

      <div>
        <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted">Entrenamiento</label>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(INTENSITY_STYLES) as Array<TrainingIntensity | "ninguno">).map((value) => {
            const style = INTENSITY_STYLES[value];
            const active = intensidad === value;
            const calories = value === "ninguno" ? 0 : estimateTrainingCalories({ ...entry, entreno: true, entrenoIntensidad: value });
            return (
              <button
                key={value}
                type="button"
                onClick={() => saveIntensity(value)}
                className={`rounded-lg border px-2 py-1.5 text-left font-mono text-[9.5px] uppercase tracking-wide transition-colors ${
                  active ? "" : "border-border text-textMuted"
                }`}
                style={active ? { background: style.background, color: style.color, borderColor: style.background } : undefined}
              >
                {style.label}
                {value !== "ninguno" && ` +${calories}`}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
