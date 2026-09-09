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
  const [open, setOpen] = useState(true);
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

  const segments = [
    { key: "des", label: "Desayuno", kcal: r.day.desK, protein: r.day.desP },
    { key: "alm", label: "Almuerzo", kcal: r.day.almK, protein: r.day.almP },
    { key: "mer", label: "Merienda", kcal: r.day.merK, protein: r.day.merP },
    { key: "cen", label: "Cena", kcal: r.day.cenK, protein: r.day.cenP },
  ];

  const weakSegment = segments
    .filter((s) => s.kcal > 0)
    .sort((a, b) => (a.protein * 100) / Math.max(a.kcal, 1) - (b.protein * 100) / Math.max(b.kcal, 1))[0];

  const improvementText = weakSegment
    ? `Mejorá ${weakSegment.label.toLowerCase()} con más proteína y menos calorías vacías.`
    : "Muy buen balance general. Mantené la consistencia en la estructura diaria.";

  return (
    <div className="group relative">
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

      <div className="pointer-events-none absolute left-0 top-full z-20 mt-1 w-[260px] max-w-[80vw] rounded-xl border border-border bg-surface p-2.5 text-left shadow-2xl opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-gold mb-2">Detalle del día</div>
        <div className="space-y-1.5">
          {segments.map((segment) => {
            const density = segment.kcal > 0 ? (segment.protein * 100) / segment.kcal : 0;
            const quality =
              segment.kcal <= 0
                ? { label: "sin datos", color: "text-textMuted", dot: "bg-textMuted", panel: "border-l-border" }
                : density >= 2.5
                ? { label: "bueno", color: "text-sage", dot: "bg-sage", panel: "border-l-sage/70" }
                : density >= 1.5
                ? { label: "medio", color: "text-gold", dot: "bg-gold", panel: "border-l-gold/70" }
                : { label: "malo", color: "text-rust", dot: "bg-rust", panel: "border-l-rust/70" };
            return (
              <div key={segment.key} className={`flex items-center justify-between gap-2 border-l-2 pl-2 text-[11px] text-textMuted ${quality.panel}`}>
                <span className={`flex items-center gap-1.5 font-semibold ${quality.color}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${quality.dot}`} />
                  {segment.label}
                </span>
                <span className="font-mono text-text">
                  {segment.kcal} kcal · {segment.protein}g · {density.toFixed(1)}g/100kcal · {quality.label}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-2 border-t border-dashed border-border pt-2 text-[11px] text-textMuted">
          <span className="text-text">Cómo mejorar:</span> {improvementText}
        </div>
      </div>
    </div>
  );
}
