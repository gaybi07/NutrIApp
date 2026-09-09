"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocalDays } from "@/lib/useLocalDays";
import { isoMonday, addDays, fmtDate, summarizeWeek } from "@/lib/calculations";
import { SummaryCards } from "@/components/SummaryCards";
import { WeeklyChart } from "@/components/WeeklyChart";
import { Ledger } from "@/components/Ledger";
import { RankingCard } from "@/components/RankingCard";
import { GoalCalculator } from "@/components/GoalCalculator";
import { AiEntryForm } from "@/components/AiEntryForm";
import { RecipePlanner } from "@/components/RecipePlanner";
import { ShoppingLog } from "@/components/ShoppingLog";
import { WeeklyWeight } from "@/components/WeeklyWeight";
import { AuthPanel } from "@/components/AuthPanel";
import { DailySteps } from "@/components/DailySteps";
import { DataImport } from "@/components/DataImport";
import { TodayCard } from "@/components/TodayCard";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import { useInventory } from "@/lib/useInventory";
import { DayEntry, emptyDay, MealKey } from "@/lib/types";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export default function Home() {
  const { days, settings, loaded, upsertDay, saveDays, saveSettings } = useLocalDays();
  const { items: inventory, addText, consumeByText, consumeItem, consumeAmounts, persist: replaceInventory } = useInventory();
  const [weekOffset, setWeekOffset] = useState(0);
  const [panel, setPanel] = useState<"calc" | "ai" | "ranking" | "datos" | null>(null);
  const [, setAuthenticated] = useState(true);
  const handleAuthChange = useCallback((value: boolean) => setAuthenticated(value), []);

  useEffect(() => {
    if (loaded && !settings.calculatorProfile) setPanel("calc");
  }, [loaded, settings.calculatorProfile]);

  const monday = useMemo(() => {
    const base =
      days.length > 0
        ? isoMonday(days.reduce((a, b) => (a.fecha > b.fecha ? a : b)).fecha)
        : isoMonday(fmtDate(new Date()));
    return addDays(base, weekOffset * 7);
  }, [days, weekOffset]);

  const weekDates = useMemo(() => [...Array(7)].map((_, i) => fmtDate(addDays(monday, i))), [monday]);
  const weekDays = useMemo(() => weekDates.map((f) => days.find((d) => d.fecha === f) || null), [weekDates, days]);
  const presentDays = useMemo(() => weekDays.filter((d): d is NonNullable<typeof d> => !!d), [weekDays]);
  const summary = useMemo(() => summarizeWeek(presentDays, settings.tdeeFallback, settings.goal), [presentDays, settings]);

  const sunday = addDays(monday, 6);

  const todayEntry = useMemo(() => {
    const todayFecha = fmtDate(new Date());
    return days.find((d) => d.fecha === todayFecha) || emptyDay(todayFecha);
  }, [days]);
  const todayKcal = todayEntry.desK + todayEntry.almK + todayEntry.merK + todayEntry.cenK;

  const saveWeeklyWeight = useCallback(
    (weekKey: string, weight: number) => {
      saveSettings({
        ...settings,
        weeklyWeights: { ...(settings.weeklyWeights || {}), [weekKey]: weight },
      });
    },
    [saveSettings, settings]
  );

  const useRecipeAsMeal = useCallback((recipe: { kcal: number; protein: number }, meal: MealKey) => {
    const fecha = fmtDate(new Date());
    const existing = days.find((day) => day.fecha === fecha) || emptyDay(fecha);
    const next: DayEntry = {
      ...existing,
      [`${meal}K`]: existing[`${meal}K`] + recipe.kcal,
      [`${meal}P`]: existing[`${meal}P`] + recipe.protein,
    };
    upsertDay(next);
  }, [days, upsertDay]);

  if (!loaded) {
    return (
      <main className="pt-8">
        <AuthPanel onAuthChange={handleAuthChange} />
      </main>
    );
  }

  return (
    <main>
      <AuthPanel onAuthChange={handleAuthChange} />

      <TodayCard
        entry={todayEntry}
        goal={settings.goal}
        onUpsert={upsertDay}
        onLogMeal={() => setPanel("ai")}
      />

      <div className="mt-2 rounded-2xl border border-border/80 bg-surface/70 px-3 py-2.5 shadow-[0_0_0_1px_rgba(58,54,47,0.4)]">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold mb-1.5">Semana del</div>
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display font-semibold text-3xl leading-none -tracking-[0.04em]">
            {monday.getDate()} {MONTHS[monday.getMonth()]}
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekOffset((w) => w - 1)}
              className="bg-surfaceAlt border border-border rounded-xl w-9 h-9 text-lg text-text hover:border-gold/60 transition-colors"
            >
              ‹
            </button>
            <button
              onClick={() => setWeekOffset((w) => w + 1)}
              className="bg-surfaceAlt border border-border rounded-xl w-9 h-9 text-lg text-text hover:border-gold/60 transition-colors"
            >
              ›
            </button>
          </div>
        </div>
        <div className="mt-2 font-mono text-[11px] tracking-[0.12em] uppercase text-textMuted">
          {monday.getDate()} {MONTHS[monday.getMonth()]} — {sunday.getDate()} {MONTHS[sunday.getMonth()]}
        </div>
      </div>

      <SummaryCards summary={summary} goal={summary.avgGoal || settings.goal} weight={settings.weeklyWeights?.[fmtDate(monday)]} />
      <WeeklyWeight weekKey={fmtDate(monday)} weights={settings.weeklyWeights || {}} onSave={saveWeeklyWeight} />

      <div className="mb-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => setPanel((current) => (current === "calc" ? null : "calc"))}
          className="rounded-xl border border-border bg-surfaceAlt px-2 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-text"
        >
          Objetivo
        </button>
        <button
          onClick={() => setPanel((current) => (current === "datos" ? null : "datos"))}
          className="rounded-xl border border-border bg-surfaceAlt px-2 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-text"
        >
          Datos
        </button>
        <button
          onClick={() => setPanel((current) => (current === "ai" ? null : "ai"))}
          className="rounded-xl border border-border bg-surfaceAlt px-2 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-text"
        >
          Cargar con IA
        </button>
        <button
          onClick={() => setPanel((current) => (current === "ranking" ? null : "ranking"))}
          className="rounded-xl border border-border bg-surfaceAlt px-2 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-text"
        >
          Ranking
        </button>
      </div>

      {panel === "calc" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm">
          <div className="relative my-4 max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-3 shadow-2xl">
            <button
              onClick={() => setPanel(null)}
              className="absolute right-3 top-3 rounded-full border border-border bg-bg px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted"
            >
              Cerrar
            </button>
            <GoalCalculator
              tdeeFallback={settings.tdeeFallback}
              initialProfile={settings.calculatorProfile}
              onApplyGoal={(gasto, objetivo, calculatorProfile) => {
                saveSettings({ ...settings, tdeeFallback: gasto, goal: objetivo, calculatorProfile });
                setPanel(null);
              }}
            />
          </div>
        </div>
      )}

      {panel === "ai" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-surface p-3 shadow-2xl">
            <button
              onClick={() => setPanel(null)}
              className="absolute right-3 top-3 rounded-full border border-border bg-bg px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted"
            >
              Cerrar
            </button>
            <AiEntryForm days={days} onUpsert={upsertDay} onConsumeInventory={consumeByText} />
          </div>
        </div>
      )}

      {panel === "ranking" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-surface p-3 shadow-2xl">
            <button
              onClick={() => setPanel(null)}
              className="absolute right-3 top-3 rounded-full border border-border bg-bg px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted"
            >
              Cerrar
            </button>
            <RankingCard days={days} />
          </div>
        </div>
      )}

      {panel === "datos" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-surface p-3 shadow-2xl">
            <button
              onClick={() => setPanel(null)}
              className="absolute right-3 top-3 rounded-full border border-border bg-bg px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted"
            >
              Cerrar
            </button>
            <DataImport
              onImport={(importedDays, importedSettings) => {
                saveDays(importedDays);
                if (importedSettings) saveSettings(importedSettings);
                setPanel(null);
              }}
            />
          </div>
        </div>
      )}

      <WeeklyChart
        weekDates={weekDates}
        weekDays={weekDays}
        goal={settings.goal}
        avgGoal={summary.avgGoal || settings.goal}
        avgGasto={settings.tdeeFallback}
      />
      <Ledger weekDates={weekDates} weekDays={weekDays} goal={summary.avgGoal || settings.goal} tdeeFallback={settings.tdeeFallback} onUpsert={upsertDay} />
      <DailySteps weekDates={weekDates} weekDays={weekDays} onUpsert={upsertDay} />
      <ShoppingLog items={inventory} addInventoryText={addText} replaceItems={replaceInventory} />
      <RecipePlanner
        items={inventory}
        consumeAmounts={consumeAmounts}
        onUseRecipe={useRecipeAsMeal}
        dailyGoal={settings.goal}
        consumedKcal={todayKcal}
      />
    </main>
  );
}
