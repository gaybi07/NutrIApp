"use client";

import { InventoryItem, MealKey, WeekPlan } from "@/lib/types";
import { RecipePlanner } from "@/components/RecipePlanner";
import { CommonMealsCard } from "@/components/CommonMealsCard";
import { countPlannedMeals } from "@/components/WeekPlanner";

export function ComidasTab({
  items,
  consumeAmounts,
  onUseRecipe,
  dailyGoal,
  consumedKcal,
  weekPlan,
  onOpenPlanificador,
}: {
  items: InventoryItem[];
  consumeAmounts: (amounts: Array<{ id: string; quantity: number }>) => void;
  onUseRecipe: (recipe: { kcal: number; protein: number }, meal: MealKey) => void;
  dailyGoal: number;
  consumedKcal: number;
  weekPlan: WeekPlan;
  onOpenPlanificador: () => void;
}) {
  return (
    <div>
      <RecipePlanner
        items={items}
        consumeAmounts={consumeAmounts}
        onUseRecipe={onUseRecipe}
        dailyGoal={dailyGoal}
        consumedKcal={consumedKcal}
      />
      <CommonMealsCard />
      <button
        type="button"
        onClick={onOpenPlanificador}
        className="mb-4 flex w-full items-center justify-between gap-2 rounded-2xl border border-border bg-surface/70 p-3 text-left shadow-[0_0_0_1px_rgba(58,54,47,0.4)]"
      >
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Planificador</div>
          <div className="font-display text-xl leading-none -tracking-[0.04em]">Semana que viene</div>
        </div>
        <div className="rounded-full border border-border bg-bg/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted">
          {countPlannedMeals(weekPlan)} comidas
        </div>
      </button>
    </div>
  );
}
