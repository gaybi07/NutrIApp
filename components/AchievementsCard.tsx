"use client";

import { useState } from "react";
import { Achievement, AchievementPeriod } from "@/lib/achievements";
import { chip } from "@/components/buttonStyles";

const TABS: { id: AchievementPeriod; label: string; vacio: string }[] = [
  { id: "dia", label: "Hoy", vacio: "Todavía no hay logros para hoy." },
  { id: "semana", label: "Semana", vacio: "Todavía no hay logros para esta semana." },
  { id: "mes", label: "Mes", vacio: "Todavía no hay logros para este mes." },
  { id: "propio", label: "Míos", vacio: "Armá tu objetivo con la calculadora para ganar puntos avanzando hacia él." },
];

/**
 * Logros diarios, semanales y mensuales, y el avance de los objetivos propios. Cada uno muestra cuántos puntos vale;
 * los ya conseguidos figuran tildados y los que faltan dicen cuánto falta.
 */
export function AchievementsCard({ achievements, claimed, totalPoints }: { achievements: Achievement[]; claimed: Set<string>; totalPoints: number }) {
  const [tab, setTab] = useState<AchievementPeriod>("dia");
  const list = achievements.filter((a) => a.periodo === tab);
  const isDone = (a: Achievement) => a.done || claimed.has(`${a.kind}|${a.clave}`);
  const earned = achievements.filter((a) => a.periodo === tab && isDone(a)).reduce((s, a) => s + a.puntos, 0);
  const available = achievements.filter((a) => a.periodo === tab).reduce((s, a) => s + a.puntos, 0);

  return (
    <section className="rounded-2xl border border-border bg-surface/70 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Logros</div>
          <div className="font-display text-xl text-text">Sumá puntos</div>
        </div>
        <span className="shrink-0 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 font-mono text-[11px] font-bold text-gold">⭐ {totalPoints}</span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} className={chip(tab === t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="mt-2 rounded-lg border border-dashed border-border p-3 text-[12px] text-textMuted">{TABS.find((t) => t.id === tab)!.vacio}</div>
      ) : (
        <>
          <div className="mt-2 font-mono text-[10px] text-textMuted">
            {earned} de {available} puntos posibles
          </div>
          <div className="mt-1.5 space-y-1.5">
            {list.map((a) => {
              const done = isDone(a);
              return (
                <div
                  key={`${a.kind}|${a.clave}`}
                  className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 ${done ? "border-sage/40 bg-sage/10" : "border-border bg-bg/30"}`}
                >
                  <div className="min-w-0">
                    <div className={`text-[12px] ${done ? "text-text" : "text-textMuted"}`}>
                      <span className={done ? "text-sage" : "text-textMuted"}>{done ? "✓ " : "○ "}</span>
                      {a.label}
                    </div>
                    {!done && a.hint && <div className="pl-4 text-[10px] text-textMuted">{a.hint}</div>}
                  </div>
                  <span className={`shrink-0 font-mono text-[11px] font-bold ${done ? "text-sage" : "text-textMuted"}`}>+{a.puntos}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
