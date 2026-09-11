"use client";

import { useMealMemory } from "@/lib/useMealMemory";
import { proteinDensity, proteinQualityTier, ProteinQualityTier } from "@/lib/calculations";
import { MealKey, MEAL_LABELS } from "@/lib/types";
import { Collapsible } from "@/components/Collapsible";
import { SECTION_HELP } from "@/lib/helpText";

const MEAL_KEYS: MealKey[] = ["des", "alm", "mer", "cen"];
const MAX_PER_MEAL = 5;

const TIER_STYLE: Record<ProteinQualityTier, { label: string; dot: string }> = {
  bueno: { label: "bueno", dot: "bg-sage" },
  medio: { label: "medio", dot: "bg-gold" },
  malo: { label: "a mejorar", dot: "bg-rust" },
};

export function CommonMealsCard() {
  const { memory } = useMealMemory();
  const hasAny = memory.some((h) => h.kcal > 0);

  return (
    <Collapsible eyebrow="Memoria" title="Comidas más comunes" info={SECTION_HELP.comidasComunes}>
      {!hasAny ? (
        <div className="rounded-xl border border-dashed border-border p-3 text-[12px] text-textMuted">
          Todavía no tenés comidas guardadas. Se van completando solas a medida que cargás comidas con IA.
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-3 font-mono text-[9px] text-textMuted">
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-sage" /> ≥2.5g prot/100kcal bueno</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-gold" /> 1.5–2.5g medio</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-rust" /> &lt;1.5g a mejorar</span>
          </div>
          <div className="space-y-3">
            {MEAL_KEYS.map((meal) => {
              const entries = memory.filter((h) => h.meal === meal && h.kcal > 0).slice(0, MAX_PER_MEAL);
              return (
                <div key={meal}>
                  <div className="mb-1 font-mono text-[9px] uppercase tracking-wide text-textMuted">{MEAL_LABELS[meal]}</div>
                  {entries.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {entries.map((entry) => {
                        const density = proteinDensity(entry.kcal, entry.protein) ?? 0;
                        const tier = proteinQualityTier(density);
                        const style = TIER_STYLE[tier];
                        return (
                          <span
                            key={entry.text}
                            className="flex items-center gap-1.5 rounded-full border border-border bg-bg/60 px-2.5 py-1 font-mono text-[10px] text-text"
                            title={`${style.label} · ${density.toFixed(1)}g prot/100kcal`}
                          >
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
                            {entry.text} <span className="text-textMuted">· {entry.kcal} kcal</span>
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-[11px] text-textMuted">Todavía no tenés comidas guardadas para {MEAL_LABELS[meal].toLowerCase()}.</div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </Collapsible>
  );
}
