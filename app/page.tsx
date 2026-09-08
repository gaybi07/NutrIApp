"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocalDays } from "@/lib/useLocalDays";
import { isoMonday, addDays, fmtDate, summarizeWeek } from "@/lib/calculations";
import { SummaryCards } from "@/components/SummaryCards";
import { WeeklyChart } from "@/components/WeeklyChart";
import { Ledger } from "@/components/Ledger";
import { RankingCard } from "@/components/RankingCard";
import { GoalCalculator } from "@/components/GoalCalculator";
import { AiEntryForm } from "@/components/AiEntryForm";
import { AuthPanel } from "@/components/AuthPanel";
import { isSupabaseConfigured } from "@/lib/supabase/browser";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export default function Home() {
  const { days, settings, loaded, upsertDay } = useLocalDays();
  const [weekOffset, setWeekOffset] = useState(0);
  const [, setAuthenticated] = useState(true);
  const handleAuthChange = useCallback((value: boolean) => setAuthenticated(value), []);

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
  const summary = useMemo(() => summarizeWeek(presentDays, settings.tdeeFallback), [presentDays, settings]);

  const sunday = addDays(monday, 6);

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
      <div className="font-mono text-[11px] tracking-widest uppercase text-gold mb-0.5">Semana del</div>
      <h1 className="font-display font-semibold text-2xl -tracking-wide">
        {monday.getDate()} {MONTHS[monday.getMonth()]}
      </h1>

      <div className="flex items-center justify-between my-4 font-mono text-xs text-textMuted">
        <button
          onClick={() => setWeekOffset((w) => w - 1)}
          className="bg-surfaceAlt border border-border rounded-lg w-8 h-8"
        >
          ‹
        </button>
        <span>
          {monday.getDate()} {MONTHS[monday.getMonth()]} — {sunday.getDate()} {MONTHS[sunday.getMonth()]}
        </span>
        <button
          onClick={() => setWeekOffset((w) => w + 1)}
          className="bg-surfaceAlt border border-border rounded-lg w-8 h-8"
        >
          ›
        </button>
      </div>

      <SummaryCards summary={summary} goal={settings.goal} />
      <WeeklyChart weekDates={weekDates} weekDays={weekDays} goal={settings.goal} avgGasto={summary.avgGasto || settings.tdeeFallback} />
      <Ledger weekDates={weekDates} weekDays={weekDays} goal={settings.goal} tdeeFallback={settings.tdeeFallback} />
      <RankingCard days={days} />
      <GoalCalculator avgGasto={summary.avgGasto} tdeeFallback={settings.tdeeFallback} />
      <AiEntryForm days={days} onUpsert={upsertDay} />
    </main>
  );
}
