"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DndContext } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SortableSection } from "@/components/SortableSection";
import { useSectionOrder } from "@/lib/useSectionOrder";
import { useLocalDays } from "@/lib/useLocalDays";
import { isoMonday, addDays, fmtDate, summarizeWeek, proteinTargetForWeight, getMealItems, applyMealItems, dayTotal } from "@/lib/calculations";
import { TabBar, MainTab } from "@/components/TabBar";
import { MacrosTab } from "@/components/MacrosTab";
import { ActividadTab } from "@/components/ActividadTab";
import { SummaryCards } from "@/components/SummaryCards";
import { WeeklyChart } from "@/components/WeeklyChart";
import { Ledger } from "@/components/Ledger";
import { GoalCalculator } from "@/components/GoalCalculator";
import { AiEntryForm } from "@/components/AiEntryForm";
import { WeekPlanner } from "@/components/WeekPlanner";
import { ComidasTab } from "@/components/ComidasTab";
import { WeeklyWeight } from "@/components/WeeklyWeight";
import { AuthPanel } from "@/components/AuthPanel";
import { DataImport } from "@/components/DataImport";
import { MealMemoryImport } from "@/components/MealMemoryImport";
import { TodayCard } from "@/components/TodayCard";
import { TodayMealsBreakdown } from "@/components/TodayMealsBreakdown";
import { PurchaseHistoryCard } from "@/components/PurchaseHistoryCard";
import { WeekMealsCard } from "@/components/WeekMealsCard";
import { TrainingEntryForm } from "@/components/TrainingEntryForm";
import { SleepEntryForm } from "@/components/SleepEntryForm";
import { ThemeSettings, FontSizeSettings, TabsSettings, ToolsSettings, SectionsSettings } from "@/components/Preferences";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { AppTour } from "@/components/AppTour";
import { TipPopup } from "@/components/TipPopup";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import { useEscapeKey } from "@/lib/useEscapeKey";
import { useInventory } from "@/lib/useInventory";
import { useSharedInventory } from "@/lib/useSharedInventory";
import { usePurchaseHistory } from "@/lib/usePurchaseHistory";
import { useSharedPurchases } from "@/lib/useSharedPurchases";
import { useHousehold } from "@/lib/useHousehold";
import { useProductMemory } from "@/lib/useProductMemory";
import { emptyDay, MealKey, DEFAULT_ENABLED_TABS, DEFAULT_INICIO_ORDER, resolveOrder } from "@/lib/types";
import { SECTION_HELP } from "@/lib/helpText";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export default function Home() {
  const { days, settings, loaded, syncError, upsertDay, saveDays, saveSettings } = useLocalDays();
  const [authenticated, setAuthenticated] = useState(!isSupabaseConfigured);
  const handleAuthChange = useCallback((value: boolean) => setAuthenticated(value), []);

  const localInventory = useInventory();
  const household = useHousehold(authenticated);
  const sharedInventory = useSharedInventory(household.household?.id ?? null);
  // La alacena "de verdad" es la local hasta que te sumás a un grupo -- a
  // partir de ahí, toda la app (Alacena, Compras, Desde Alacena, etc.) lee
  // y escribe la compartida en su lugar, sin que esos componentes sepan
  // cuál de las dos es.
  const {
    items: inventory,
    addStructuredItems,
    updateItem: updateInventoryItem,
    applyReview: applyInventoryReview,
    consumeByText,
    consumeItem,
    consumeAmounts,
    persist: replaceInventory,
  } = household.household ? sharedInventory : localInventory;

  const localPurchases = usePurchaseHistory();
  const sharedPurchases = useSharedPurchases(household.household?.id ?? null);
  const { purchases, addPurchases, removePurchase } = household.household ? sharedPurchases : localPurchases;

  const productMemory = useProductMemory();
  const [weekOffset, setWeekOffset] = useState(0);
  const [activeTab, setActiveTab] = useState<MainTab>("inicio");
  const [panel, setPanel] = useState<
    | "calc" | "ai" | "entreno" | "sueno" | "datos" | "planificador"
    | "tema" | "tamano-letra" | "solapas" | "herramientas" | "secciones"
    | null
  >(null);
  useEscapeKey(() => setPanel(null), panel !== null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.theme || "oscuro");
  }, [settings.theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-font-size", settings.fontSize || "chico");
  }, [settings.fontSize]);

  const inicioOrder = resolveOrder(settings.inicioOrder, DEFAULT_INICIO_ORDER);
  const inicioDrag = useSectionOrder(inicioOrder, (next) => saveSettings({ ...settings, inicioOrder: next }));
  const inicioHidden = settings.inicioHidden || [];
  const inicioVisible = inicioOrder.filter((id) => !inicioHidden.includes(id));
  const hideInicioBlock = (id: (typeof inicioOrder)[number]) =>
    saveSettings({ ...settings, inicioHidden: [...inicioHidden, id] });

  const enabledTabs = resolveOrder(settings.enabledTabs, DEFAULT_ENABLED_TABS);
  useEffect(() => {
    if (activeTab !== "inicio" && !enabledTabs.includes(activeTab)) setActiveTab("inicio");
  }, [activeTab, enabledTabs]);

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
  const todayKcal = dayTotal(todayEntry);

  const currentWeightKg = useMemo(() => {
    const lastDailyWeight = [...days].sort((a, b) => b.fecha.localeCompare(a.fecha)).find((d) => d.pesoKg)?.pesoKg;
    if (lastDailyWeight) return lastDailyWeight;
    const weekKeys = Object.keys(settings.weeklyWeights || {}).sort();
    const lastWeeklyWeight = weekKeys.length ? settings.weeklyWeights![weekKeys[weekKeys.length - 1]] : undefined;
    if (lastWeeklyWeight) return lastWeeklyWeight;
    const profileWeight = settings.calculatorProfile?.actual ? Number(settings.calculatorProfile.actual) : undefined;
    return profileWeight || 75;
  }, [days, settings]);

  const weightTrend = useMemo(() => {
    const currentWeight = settings.weeklyWeights?.[fmtDate(monday)];
    const previousWeight = settings.weeklyWeights?.[fmtDate(addDays(monday, -7))];
    if (currentWeight == null || previousWeight == null) return null;
    return currentWeight - previousWeight;
  }, [settings.weeklyWeights, monday]);

  const sleepAvg = useMemo(() => {
    const withSleep = presentDays.filter((d) => d.suenoHoras != null);
    if (withSleep.length === 0) return null;
    return withSleep.reduce((sum, d) => sum + (d.suenoHoras || 0), 0) / withSleep.length;
  }, [presentDays]);

  const saveWeeklyWeight = useCallback(
    (weekKey: string, weight: number) => {
      saveSettings({
        ...settings,
        weeklyWeights: { ...(settings.weeklyWeights || {}), [weekKey]: weight },
      });
    },
    [saveSettings, settings]
  );

  const useRecipeAsMeal = useCallback((recipe: { kcal: number; protein: number; title?: string }, meal: MealKey) => {
    const fecha = fmtDate(new Date());
    const existing = days.find((day) => day.fecha === fecha) || emptyDay(fecha);
    const items = getMealItems(existing, meal);
    const newItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      nombre: recipe.title || "Receta",
      kcal: recipe.kcal,
      protein: recipe.protein,
    };
    upsertDay(applyMealItems(existing, meal, [...items, newItem]));
  }, [days, upsertDay]);

  if (!loaded || !authenticated) {
    return (
      <main className="mx-auto max-w-md pt-8">
        <AuthPanel onAuthChange={handleAuthChange} />
      </main>
    );
  }

  if (!settings.calculatorProfile) {
    return (
      <main className="mx-auto max-w-md pt-8">
        <AuthPanel onAuthChange={handleAuthChange} />
        <OnboardingWizard
          tdeeFallback={settings.tdeeFallback}
          fontSize={settings.fontSize}
          onSelectFontSize={(fontSize) => saveSettings({ ...settings, fontSize })}
          onComplete={({ gasto, objetivo, calculatorProfile, pesoKg, pasos }) => {
            saveSettings({ ...settings, tdeeFallback: gasto, goal: objetivo, calculatorProfile });
            if (pesoKg || pasos) {
              const fecha = fmtDate(new Date());
              const existing = days.find((d) => d.fecha === fecha) || emptyDay(fecha);
              upsertDay({ ...existing, pesoKg: pesoKg || existing.pesoKg, pasos: pasos || existing.pasos });
            }
          }}
        />
      </main>
    );
  }

  return (
    <main>
      <AuthPanel
        onAuthChange={handleAuthChange}
        onOpenTheme={() => setPanel("tema")}
        onOpenFontSize={() => setPanel("tamano-letra")}
        onOpenTabs={() => setPanel("solapas")}
        onOpenSections={() => setPanel("secciones")}
        onOpenTools={() => setPanel("herramientas")}
      />

      {syncError && (
        <div className="mb-4 rounded-xl border border-rust/40 bg-rust/10 px-3 py-2 text-[11px] text-rust">
          ⚠ {syncError}
        </div>
      )}

      {!settings.tourDone && (
        <AppTour onFinish={() => saveSettings({ ...settings, tourDone: true })} />
      )}

      {settings.tourDone && (
        <TipPopup
          presentDays={presentDays}
          summary={summary}
          proteinTarget={proteinTargetForWeight(currentWeightKg)}
          goalMode={settings.calculatorProfile?.modo}
          weightTrend={weightTrend}
          sleepAvg={sleepAvg}
        />
      )}

      <TabBar active={activeTab} onChange={setActiveTab} enabledTabs={enabledTabs} />

      {/* Selector de semana global -- afecta a Inicio/Macros/Actividad por
          igual (las tres leen weekDates/weekDays), así que vive acá arriba
          en vez de adentro del bloque "Semana" de Inicio, donde antes solo
          se podía cambiar la semana estando en esa solapa puntual. Comidas
          y Gastos no dependen de la semana, así que no lo muestran. */}
      {(activeTab === "inicio" || activeTab === "macros" || activeTab === "actividad") && (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-border bg-surface/70 px-2 py-1.5 lg:px-3">
          <button
            type="button"
            onClick={() => setWeekOffset((w) => w - 1)}
            aria-label="Semana anterior"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surfaceAlt text-text hover:border-gold/60"
          >
            ‹
          </button>
          <div className="text-center">
            <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-textMuted">Semana</div>
            <div className="font-sans text-sm font-semibold leading-none text-text">
              {monday.getDate()} {MONTHS[monday.getMonth()]} – {sunday.getDate()} {MONTHS[sunday.getMonth()]}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setWeekOffset((w) => w + 1)}
            aria-label="Semana siguiente"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surfaceAlt text-text hover:border-gold/60"
          >
            ›
          </button>
        </div>
      )}

      {activeTab === "macros" && (
        <MacrosTab
          entry={todayEntry}
          goal={settings.goal}
          proteinTarget={proteinTargetForWeight(currentWeightKg)}
          weekDates={weekDates}
          weekDays={weekDays}
          onLogMeal={() => setPanel("ai")}
          weightKg={currentWeightKg}
          tdeeFallback={settings.tdeeFallback}
          onUpsert={upsertDay}
          order={settings.macrosOrder}
          onReorder={(macrosOrder) => saveSettings({ ...settings, macrosOrder })}
          hidden={settings.macrosHidden}
          onHide={(id) => saveSettings({ ...settings, macrosHidden: [...(settings.macrosHidden || []), id] })}
        />
      )}

      {activeTab === "actividad" && (
        <ActividadTab
          entry={todayEntry}
          weekDates={weekDates}
          weekDays={weekDays}
          onLogTraining={() => setPanel("entreno")}
          onLogSleep={() => setPanel("sueno")}
          onUpsert={upsertDay}
          routines={settings.routines || []}
          schedule={settings.trainingSchedule || {}}
          onSaveRoutines={(routines) => saveSettings({ ...settings, routines })}
          onSaveSchedule={(trainingSchedule) => saveSettings({ ...settings, trainingSchedule })}
          order={settings.actividadOrder}
          onReorder={(actividadOrder) => saveSettings({ ...settings, actividadOrder })}
          hidden={settings.actividadHidden}
          onHide={(id) => saveSettings({ ...settings, actividadHidden: [...(settings.actividadHidden || []), id] })}
        />
      )}

      {activeTab === "gastos" && <PurchaseHistoryCard purchases={purchases} removePurchase={removePurchase} />}

      {activeTab === "inicio" && (
      <div className="mx-auto max-w-lg lg:max-w-6xl 2xl:max-w-[1800px]">
        {/* En PC (>=1024px) los bloques se acomodan solos en columnas tipo
            mosaico ("newspaper flow": llenan la columna 1 de arriba a abajo,
            después la 2, etc.) en vez del layout fijo de antes -- así, al
            apagar un bloque con el foquito o volver a prenderlo desde
            Preferencias > Secciones, el resto se reacomoda solo sin dejar
            huecos. El arrastre (la "manito") se oculta en PC porque no tiene
            sentido con este layout (el orden real en pantalla lo decide el
            navegador acomodando alturas, no el orden de la lista); en mobile
            sigue siendo una sola tira vertical con arrastre como siempre. */}
        <DndContext sensors={inicioDrag.sensors} collisionDetection={inicioDrag.collisionDetection} onDragStart={inicioDrag.handleDragStart} onDragEnd={inicioDrag.handleDragEnd} onDragCancel={inicioDrag.handleDragCancel}>
          <SortableContext items={inicioVisible} strategy={verticalListSortingStrategy}>
            <div className="min-w-0 space-y-4 lg:columns-2 lg:gap-4 lg:space-y-0 xl:columns-3">
              {inicioVisible.map((blockId) => {
                if (blockId === "hoy") {
                  return (
                    <SortableSection key="hoy" id="hoy" onHide={() => hideInicioBlock("hoy")} dragDisabledOnDesktop>
                      <TodayCard
                        entry={todayEntry}
                        goal={settings.goal}
                        tdeeFallback={settings.tdeeFallback}
                        onLogMeal={() => setPanel("ai")}
                        onLogTraining={() => setPanel("entreno")}
                      />
                    </SortableSection>
                  );
                }
                if (blockId === "comidas") {
                  return (
                    <SortableSection key="comidas" id="comidas" onHide={() => hideInicioBlock("comidas")} dragDisabledOnDesktop>
                      <TodayMealsBreakdown entry={todayEntry} onUpsert={upsertDay} openOnDesktop />
                    </SortableSection>
                  );
                }
                if (blockId === "peso") {
                  return (
                    <SortableSection key="peso" id="peso" onHide={() => hideInicioBlock("peso")} dragDisabledOnDesktop>
                      <WeeklyWeight
                        weekKey={fmtDate(monday)}
                        weights={settings.weeklyWeights || {}}
                        goalMode={settings.calculatorProfile?.modo}
                        onSave={saveWeeklyWeight}
                      />
                    </SortableSection>
                  );
                }
                if (blockId === "indicadores") {
                  return (
                    <SortableSection key="indicadores" id="indicadores" onHide={() => hideInicioBlock("indicadores")} dragDisabledOnDesktop>
                      <SummaryCards
                        summary={summary}
                        goal={summary.avgGoal || settings.goal}
                        weight={settings.weeklyWeights?.[fmtDate(monday)]}
                        openOnDesktop
                      />
                    </SortableSection>
                  );
                }
                if (blockId === "kcal") {
                  return (
                    <SortableSection key="kcal" id="kcal" onHide={() => hideInicioBlock("kcal")} dragDisabledOnDesktop>
                      <WeeklyChart
                        weekDates={weekDates}
                        weekDays={weekDays}
                        goal={settings.goal}
                        avgGoal={summary.avgGoal || settings.goal}
                        avgGasto={settings.tdeeFallback}
                        openOnDesktop
                      />
                    </SortableSection>
                  );
                }
                if (blockId === "comidasSemana") {
                  return (
                    <SortableSection key="comidasSemana" id="comidasSemana" onHide={() => hideInicioBlock("comidasSemana")} dragDisabledOnDesktop>
                      <WeekMealsCard weekDates={weekDates} weekDays={weekDays} onUpsert={upsertDay} openOnDesktop />
                    </SortableSection>
                  );
                }
                return (
                  <SortableSection key="tabla" id="tabla" onHide={() => hideInicioBlock("tabla")} dragDisabledOnDesktop>
                    <Ledger
                      weekDates={weekDates}
                      weekDays={weekDays}
                      goal={summary.avgGoal || settings.goal}
                      tdeeFallback={settings.tdeeFallback}
                      onUpsert={upsertDay}
                      variant="actividad"
                      openOnDesktop
                    />
                  </SortableSection>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </div>
      )}

      {activeTab === "comidas" && (
        <ComidasTab
          items={inventory}
          consumeAmounts={consumeAmounts}
          onUseRecipe={useRecipeAsMeal}
          dailyGoal={settings.goal}
          consumedKcal={todayKcal}
          weekPlan={settings.weekPlan || {}}
          onOpenPlanificador={() => setPanel("planificador")}
          addStructuredItems={addStructuredItems}
          updateInventoryItem={updateInventoryItem}
          applyInventoryReview={applyInventoryReview}
          productMemory={productMemory}
          replaceItems={replaceInventory}
          order={settings.comidasOrder}
          onReorder={(comidasOrder) => saveSettings({ ...settings, comidasOrder })}
          hidden={settings.comidasHidden}
          onHide={(id) => saveSettings({ ...settings, comidasHidden: [...(settings.comidasHidden || []), id] })}
          aiReviewLockedUntil={settings.aiReviewLockedUntil}
          onAiReviewLockedUntilChange={(aiReviewLockedUntil) => saveSettings({ ...settings, aiReviewLockedUntil })}
          todayEntry={todayEntry}
          onUpsertDay={upsertDay}
          household={household.household}
          householdLoaded={household.loaded}
          householdStatus={household.status}
          householdBusy={household.busy}
          createHousehold={household.create}
          joinHousehold={household.join}
          leaveHousehold={household.leave}
          getInviteCode={household.getInviteCode}
          addPurchases={addPurchases}
        />
      )}

      {panel === "calc" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm" onClick={() => setPanel(null)}>
          <div
            className="relative my-4 max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-3 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
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
        <div
          className="fixed inset-0 z-50 bg-bg sm:flex sm:items-center sm:justify-center sm:bg-bg/80 sm:p-4 sm:backdrop-blur-sm"
          onClick={() => setPanel(null)}
        >
          <div
            className="relative flex h-full w-full flex-col overflow-y-auto bg-surface sm:my-4 sm:h-auto sm:max-h-[calc(100vh-2rem)] sm:max-w-lg sm:rounded-2xl sm:border sm:border-border sm:shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-3 py-2.5">
              <span className="font-display text-base text-text">Cargar comida</span>
              <button
                onClick={() => setPanel(null)}
                className="rounded-full border border-border bg-bg px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted"
              >
                Cerrar
              </button>
            </div>
            <div className="flex-1 p-3">
              <AiEntryForm days={days} onUpsert={upsertDay} onConsumeInventory={consumeByText} inventory={inventory} consumeAmounts={consumeAmounts} />
            </div>
          </div>
        </div>
      )}

      {panel === "entreno" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm" onClick={() => setPanel(null)}>
          <div
            className="relative my-4 max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-3 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => setPanel(null)}
              className="absolute right-3 top-3 rounded-full border border-border bg-bg px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted"
            >
              Cerrar
            </button>
            <TrainingEntryForm
              entry={todayEntry}
              onSave={(entry) => {
                upsertDay(entry);
                setPanel(null);
              }}
            />
          </div>
        </div>
      )}

      {panel === "sueno" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm" onClick={() => setPanel(null)}>
          <div
            className="relative my-4 max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-3 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => setPanel(null)}
              className="absolute right-3 top-3 rounded-full border border-border bg-bg px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted"
            >
              Cerrar
            </button>
            <SleepEntryForm
              entry={todayEntry}
              onSave={(entry) => {
                upsertDay(entry);
                setPanel(null);
              }}
            />
          </div>
        </div>
      )}

      {panel === "planificador" && (
        <div
          className="fixed inset-0 z-50 bg-bg sm:flex sm:items-center sm:justify-center sm:bg-bg/80 sm:p-4 sm:backdrop-blur-sm"
          onClick={() => setPanel(null)}
        >
          <div
            className="relative flex h-full w-full flex-col overflow-y-auto bg-surface sm:my-4 sm:h-auto sm:max-h-[calc(100vh-2rem)] sm:max-w-lg sm:rounded-2xl sm:border sm:border-border sm:shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-3 py-2.5">
              <span className="font-display text-base text-text">Planificador de la semana</span>
              <button
                onClick={() => setPanel(null)}
                className="rounded-full border border-border bg-bg px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted"
              >
                Cerrar
              </button>
            </div>
            <div className="flex-1 p-3">
              <WeekPlanner
                items={inventory}
                weekPlan={settings.weekPlan || {}}
                onSave={(weekPlan) => saveSettings({ ...settings, weekPlan })}
              />
            </div>
          </div>
        </div>
      )}

      {panel === "datos" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm" onClick={() => setPanel(null)}>
          <div
            className="relative my-4 max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-3 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => setPanel(null)}
              className="absolute right-3 top-3 rounded-full border border-border bg-bg px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted"
            >
              Cerrar
            </button>
            <DataImport
              days={days}
              settings={settings}
              onImport={(importedDays, importedSettings) => {
                saveDays(importedDays);
                if (importedSettings) saveSettings(importedSettings);
              }}
            />
            <MealMemoryImport />
          </div>
        </div>
      )}

      {panel === "tema" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm" onClick={() => setPanel(null)}>
          <div
            className="relative my-4 max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-3 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => setPanel(null)}
              className="absolute right-3 top-3 rounded-full border border-border bg-bg px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted"
            >
              Cerrar
            </button>
            <ThemeSettings settings={settings} onSave={saveSettings} />
          </div>
        </div>
      )}

      {panel === "tamano-letra" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm" onClick={() => setPanel(null)}>
          <div
            className="relative my-4 max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-3 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => setPanel(null)}
              className="absolute right-3 top-3 rounded-full border border-border bg-bg px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted"
            >
              Cerrar
            </button>
            <FontSizeSettings settings={settings} onSave={saveSettings} />
          </div>
        </div>
      )}

      {panel === "solapas" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm" onClick={() => setPanel(null)}>
          <div
            className="relative my-4 max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-3 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => setPanel(null)}
              className="absolute right-3 top-3 rounded-full border border-border bg-bg px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted"
            >
              Cerrar
            </button>
            <TabsSettings settings={settings} onSave={saveSettings} />
          </div>
        </div>
      )}

      {panel === "secciones" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm" onClick={() => setPanel(null)}>
          <div
            className="relative my-4 max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-3 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => setPanel(null)}
              className="absolute right-3 top-3 rounded-full border border-border bg-bg px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted"
            >
              Cerrar
            </button>
            <SectionsSettings settings={settings} onSave={saveSettings} />
          </div>
        </div>
      )}

      {panel === "herramientas" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm" onClick={() => setPanel(null)}>
          <div
            className="relative my-4 max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-3 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => setPanel(null)}
              className="absolute right-3 top-3 rounded-full border border-border bg-bg px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted"
            >
              Cerrar
            </button>
            <ToolsSettings
              onOpenCalc={() => setPanel("calc")}
              onOpenAI={() => setPanel("ai")}
              onOpenDatos={() => setPanel("datos")}
            />
          </div>
        </div>
      )}
    </main>
  );
}
