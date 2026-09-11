"use client";

import { useEffect, useState } from "react";
import { Tip, generateTip } from "@/lib/tips";
import { DayEntry, GoalMode } from "@/lib/types";
import { WeekSummary } from "@/lib/calculations";

const KEY = "registro:lastTipShownAt";
const MIN_INTERVAL_MS = 2 * 24 * 60 * 60 * 1000; // no más de una vez cada 2 días, para que no canse

export function TipPopup({
  presentDays,
  summary,
  proteinTarget,
  goalMode,
  weightTrend,
  sleepAvg,
}: {
  presentDays: DayEntry[];
  summary: WeekSummary;
  proteinTarget: number;
  goalMode?: GoalMode;
  weightTrend: number | null;
  sleepAvg: number | null;
}) {
  const [tip, setTip] = useState<Tip | null>(null);

  useEffect(() => {
    try {
      const lastShown = Number(localStorage.getItem(KEY) || 0);
      if (Date.now() - lastShown < MIN_INTERVAL_MS) return;
      const generated = generateTip({ presentDays, summary, proteinTarget, goalMode, weightTrend, sleepAvg });
      if (generated) {
        setTip(generated);
        localStorage.setItem(KEY, String(Date.now()));
      }
    } catch {
      // localStorage no disponible — no mostramos nada, no rompe la app.
    }
    // Solo se evalúa una vez al entrar a la app, no cada vez que cambian los datos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!tip) return null;

  return (
    <div
      className={`mb-4 flex items-start justify-between gap-3 rounded-xl border p-3 ${
        tip.kind === "felicitacion" ? "border-sage/40 bg-sage/10" : "border-gold/40 bg-gold/10"
      }`}
    >
      <div className="flex-1 text-[13px] leading-snug text-text">{tip.text}</div>
      <button
        type="button"
        onClick={() => setTip(null)}
        className="shrink-0 rounded-full border border-border bg-bg/60 px-2 py-1 font-mono text-[9px] uppercase tracking-wide text-textMuted"
        aria-label="Cerrar"
      >
        ×
      </button>
    </div>
  );
}
