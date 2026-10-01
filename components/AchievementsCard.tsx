"use client";

import { useState } from "react";
import { Achievement, AchievementPeriod } from "@/lib/achievements";
import { btn, chip } from "@/components/buttonStyles";

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
  const [openDone, setOpenDone] = useState(false);
  const list = achievements.filter((a) => a.periodo === tab);
  const isDone = (a: Achievement) => a.done || claimed.has(`${a.kind}|${a.clave}`);
  const pending = list.filter((a) => !isDone(a));
  const doneAll = achievements.filter(isDone);
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

      {pending.length === 0 ? (
        <div className="mt-2 rounded-lg border border-dashed border-border p-3 text-[12px] text-textMuted">
          {list.length > 0 ? "¡Ya conseguiste todos los de este período!" : TABS.find((t) => t.id === tab)!.vacio}
        </div>
      ) : (
        <>
          <div className="mt-2 font-mono text-[10px] text-textMuted">
            Te faltan {pending.length} · {earned} de {available} puntos posibles
          </div>
          <div className="mt-1.5 space-y-1.5">
            {pending.map((a) => (
              <div key={`${a.kind}|${a.clave}`} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg/30 px-2.5 py-2">
                <div className="min-w-0">
                  <div className="text-[12px] text-textMuted">
                    <span>○ </span>
                    {a.label}
                  </div>
                  {a.hint && <div className="pl-4 text-[10px] text-textMuted">{a.hint}</div>}
                </div>
                <span className="shrink-0 font-mono text-[11px] font-bold text-textMuted">+{a.puntos}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <button type="button" onClick={() => setOpenDone(true)} className={`${btn("secondary", "sm", true)} mt-2`}>
        Ver logros alcanzados ({doneAll.length})
      </button>

      {openDone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm" onClick={() => setOpenDone(false)}>
          <div
            className="relative my-4 max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Logros alcanzados</div>
                <div className="font-display text-xl text-text">{doneAll.length} logros · ⭐ {doneAll.reduce((n, a) => n + a.puntos, 0)} puntos</div>
              </div>
              <button type="button" onClick={() => setOpenDone(false)} className={btn("neutral", "sm")}>
                Cerrar
              </button>
            </div>
            {doneAll.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-3 text-[12px] text-textMuted">Todavía no conseguiste ningún logro. ¡Los vas a ver acá!</div>
            ) : (
              TABS.map((t) => {
                const items = doneAll.filter((a) => a.periodo === t.id);
                if (items.length === 0) return null;
                return (
                  <div key={t.id} className="mb-3">
                    <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.15em] text-textMuted">{t.label}</div>
                    <div className="space-y-1.5">
                      {items.map((a) => (
                        <div key={`${a.kind}|${a.clave}`} className="flex items-center justify-between gap-2 rounded-lg border border-sage/40 bg-sage/10 px-2.5 py-2">
                          <div className="text-[12px] text-text">
                            <span className="text-sage">✓ </span>
                            {a.label}
                          </div>
                          <span className="shrink-0 font-mono text-[11px] font-bold text-sage">+{a.puntos}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </section>
  );
}
