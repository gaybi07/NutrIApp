"use client";

import { useState } from "react";
import { DayEntry, emptyDay } from "@/lib/types";

export function DailySteps({ weekDates, weekDays, onUpsert }: { weekDates: string[]; weekDays: (DayEntry | null)[]; onUpsert: (entry: DayEntry) => void }) {
  const [status, setStatus] = useState("");

  const saveSteps = (date: string, value: string) => {
    const steps = Math.max(0, Number(value) || 0);
    const existing = weekDays[weekDates.indexOf(date)] || emptyDay(date);
    onUpsert({ ...existing, pasos: steps });
    setStatus(`Pasos guardados para ${date}`);
    window.setTimeout(() => setStatus(""), 1800);
  };

  return (
    <section className="mb-4 rounded-2xl border border-border bg-surface/70 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Movimiento diario</div>
          <h2 className="font-display text-xl leading-none">Pasos de la semana</h2>
        </div>
        {status && <div className="font-mono text-[9px] uppercase text-sage">{status}</div>}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {weekDates.map((date, index) => {
          const day = new Date(`${date}T00:00:00`);
          return (
            <label key={`${date}-${weekDays[index]?.pasos || 0}`} className="rounded-xl border border-border bg-bg/40 p-2">
              <span className="mb-1 flex items-center justify-between text-[10px] text-textMuted">
                <span>{day.toLocaleDateString("es-AR", { weekday: "short" }).toUpperCase()}</span>
                <span>{day.getDate()}/{day.getMonth() + 1}</span>
              </span>
              <input
                type="number"
                min="0"
                step="100"
                inputMode="numeric"
                aria-label={`Pasos del ${date}`}
                defaultValue={weekDays[index]?.pasos || ""}
                placeholder="0"
                onBlur={(event) => saveSteps(date, event.target.value)}
              />
            </label>
          );
        })}
      </div>
    </section>
  );
}