"use client";

import { useState } from "react";
import { DayEntry } from "@/lib/types";
import { rankDays } from "@/lib/calculations";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const fmtDay = (fecha: string) => {
  const d = new Date(`${fecha}T00:00:00`);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

export function RankingCard({ days }: { days: DayEntry[] }) {
  const [open, setOpen] = useState(false);
  const ranked = rankDays(days);

  return (
    <div className="bg-surface border border-border rounded-xl mb-3">
      <button
        className="w-full flex justify-between items-center px-4 py-3.5 font-semibold text-sm"
        onClick={() => setOpen((o) => !o)}
      >
        🏆 Ranking de días <span className="text-gold">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="px-4 pb-4">
          {ranked.length < 2 ? (
            <div className="text-center text-textMuted text-sm py-4">Cargá al menos 2 días para ver el ranking.</div>
          ) : (
            <>
              <div className="font-mono text-[9px] uppercase tracking-wide text-textMuted mb-1">
                Mejores días (más proteína por caloría)
              </div>
              {ranked.slice(0, 3).map((r) => (
                <RankRow key={r.day.fecha} r={r} isBest />
              ))}
              <div className="font-mono text-[9px] uppercase tracking-wide text-textMuted mt-3 mb-1">
                Días para mejorar
              </div>
              {ranked.slice(-3).reverse().map((r) => (
                <RankRow key={r.day.fecha} r={r} isBest={false} />
              ))}
              <div className="text-[11px] text-textMuted italic mt-3">
                Puntaje = gramos de proteína cada 100 kcal del día. Más alto = comiste más proteína en relación a las
                calorías totales.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function RankRow({ r, isBest }: { r: ReturnType<typeof rankDays>[number]; isBest: boolean }) {
  const reason = isBest
    ? r.bestMeal
      ? `Mucha proteína por caloría en ${r.bestMeal.label} (${r.bestMeal.density.toFixed(1)}g/100kcal)`
      : ""
    : r.worstMeal
    ? `${r.worstMeal.label.charAt(0).toUpperCase() + r.worstMeal.label.slice(1)} aportó pocas kcal de proteína (${(
        r.worstMeal.density ?? 0
      ).toFixed(1)}g/100kcal)`
    : "";

  return (
    <div className="flex justify-between items-center py-2.5 border-b border-dashed border-border last:border-0 gap-2.5">
      <div className="flex-1">
        <div className="font-semibold text-[13px]">
          {fmtDay(r.day.fecha)} · {r.total.toLocaleString("es-AR")} kcal · {r.protein.toLocaleString("es-AR")}g
        </div>
        <div className="text-[11px] text-textMuted mt-0.5">{reason}</div>
      </div>
      <div className={`font-mono text-sm font-semibold ${isBest ? "text-sage" : "text-rust"}`}>
        {r.density.toFixed(1)}
      </div>
    </div>
  );
}
