"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DndContext } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SortableSection } from "@/components/SortableSection";
import { useSectionOrder } from "@/lib/useSectionOrder";
import { useLocalDays } from "@/lib/useLocalDays";
import { isoMonday, addDays, fmtDate, summarizeWeek, proteinTargetForWeight, getMealItems, applyMealItems, dayTotal, weightStreak, computeGoalProgress, earliestLoggedWeight, computeFoodTrainingInsight, computeMuscleGroupVolumeTrend, totalVolume } from "@/lib/calculations";
import { useMyNutritionPlan } from "@/lib/useMyNutritionPlan";
import { GoalProgress } from "@/components/GoalProgress";
import { TabBar, MainTab } from "@/components/TabBar";
import { LockedTabNotice } from "@/components/LockedTabNotice";
import { ProfesionalesTab } from "@/components/ProfesionalesTab";
import { MyObjectivesCard } from "@/components/MyObjectivesCard";
import { AchievementsCard } from "@/components/AchievementsCard";
import { computeAchievements } from "@/lib/achievements";
import { useAchievementClaims } from "@/lib/useAchievementClaims";
import { useMyObjectives } from "@/lib/useMyObjectives";
import { useMyPoints } from "@/lib/useMyPoints";
import { computeObjectiveProgress } from "@/lib/objectiveProgress";
import { BlurLock } from "@/components/BlurLock";
import { LockedBlockCard } from "@/components/LockedBlockCard";
import { MacrosTab } from "@/components/MacrosTab";
import { ActividadTab } from "@/components/ActividadTab";
import { SummaryCards } from "@/components/SummaryCards";
import { WeeklyChart } from "@/components/WeeklyChart";
import { Collapsible } from "@/components/Collapsible";
import { Ledger } from "@/components/Ledger";
import { GoalCalculator } from "@/components/GoalCalculator";
import { AiEntryForm } from "@/components/AiEntryForm";
import { WeekPlanner } from "@/components/WeekPlanner";
import { ComidasTab } from "@/components/ComidasTab";
import { AlacenaTab } from "@/components/AlacenaTab";
import { WeeklyWeight } from "@/components/WeeklyWeight";
import { AuthPanel } from "@/components/AuthPanel";
import { DataImport } from "@/components/DataImport";
import { MealMemoryImport } from "@/components/MealMemoryImport";
import { TodayCard } from "@/components/TodayCard";
import { PurchaseHistoryCard } from "@/components/PurchaseHistoryCard";
import { WeekMealsCard } from "@/components/WeekMealsCard";
import { MealsEditor } from "@/components/MealsEditor";
import { SupplementsPanel } from "@/components/SupplementsPanel";
import { PlansCarousel } from "@/components/PlansCarousel";
import { LinkToProfessional } from "@/components/LinkToProfessional";
import { PendingLinkCard } from "@/components/PendingLinkCard";
import { TrainingEntryForm } from "@/components/TrainingEntryForm";
import { StepsEntryForm } from "@/components/StepsEntryForm";
import { SleepEntryForm } from "@/components/SleepEntryForm";
import { ThemeSettings, FontSizeSettings,
  GoalStyleSettings, TabsSettings, ToolsSettings, SectionsSettings } from "@/components/Preferences";
import { TrainerPanel } from "@/components/TrainerPanel";
import { NutricionistaPanel } from "@/components/NutricionistaPanel";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { TipPopup } from "@/components/TipPopup";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import { useEscapeKey } from "@/lib/useEscapeKey";
import { useInventory } from "@/lib/useInventory";
import { useSharedInventory } from "@/lib/useSharedInventory";
import { usePurchaseHistory } from "@/lib/usePurchaseHistory";
import { useSharedPurchases } from "@/lib/useSharedPurchases";
import { useSharedWeekPlan } from "@/lib/useSharedWeekPlan";
import { useHousehold } from "@/lib/useHousehold";
import { useTrainerApplication } from "@/lib/useTrainerApplication";
import { useTrainerLink } from "@/lib/useTrainerLink";
import { computeBodyGoalProgress } from "@/lib/bodyGoal";
import { MeasurementsPanel } from "@/components/MeasurementsPanel";
import { BodyGoalCard } from "@/components/BodyGoalCard";
import { useBodyMeasurements } from "@/lib/useBodyMeasurements";
import { GlobalWorkoutTimer } from "@/components/GlobalWorkoutTimer";
import { useMyAssignedSessions } from "@/lib/useAssignedSessions";
import { useNextWeekTrainingPlan } from "@/lib/useNextWeekTrainingPlan";
import { useProductMemory } from "@/lib/useProductMemory";
import { ingredientsToText, inventoryMessage } from "@/lib/planInventory";
import { optionGrams, planDayDensity } from "@/lib/density";
import { emptyDay, MealKey, MealOption, MEAL_LABELS, DEFAULT_ENABLED_TABS, DEFAULT_INICIO_ORDER, resolveOrder, WEEKDAYS } from "@/lib/types";
import { SECTION_HELP } from "@/lib/helpText";
import { TriangleAlert, Flame } from "lucide-react";

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
    restoreAmounts,
    persist: replaceInventory,
  } = household.household ? sharedInventory : localInventory;

  // Reconcilia la alacena cuando se edita/borra una comida cargada desde ahí
  // (ver MealsEditor.onInventoryDelta) -- delta>0 es "comiste más" (descontar
  // de nuevo), delta<0 es "comiste menos o borraste" (devolver stock).
  const handleMealInventoryDelta = useCallback(
    (deltas: Array<{ itemId: string; delta: number; fallback?: Parameters<typeof restoreAmounts>[0][number]["fallback"] }>) => {
      const toConsume = deltas.filter((d) => d.delta > 0).map((d) => ({ id: d.itemId, quantity: d.delta }));
      const toRestore = deltas.filter((d) => d.delta < 0).map((d) => ({ id: d.itemId, quantity: -d.delta, fallback: d.fallback }));
      if (toConsume.length > 0) consumeAmounts(toConsume);
      if (toRestore.length > 0) restoreAmounts(toRestore);
    },
    [consumeAmounts, restoreAmounts]
  );

  const localPurchases = usePurchaseHistory();
  const sharedPurchases = useSharedPurchases(household.household?.id ?? null);
  const { purchases, addPurchases, removePurchase } = household.household ? sharedPurchases : localPurchases;

  // Igual que la alacena: el plan de la semana que viene se comparte entre
  // los dos integrantes del grupo apenas hay uno armado (households.week_plan)
  // -- así cualquiera ve si el otro ya planificó, en vez de cada cuenta
  // teniendo su propio plan invisible para el resto (como pasaba antes con
  // settings.weekPlan, que ahora solo se usa sin grupo).
  const sharedWeekPlan = useSharedWeekPlan(household.household?.id ?? null);
  const weekPlan = household.household ? sharedWeekPlan.weekPlan : settings.weekPlan || {};
  const saveWeekPlan = useCallback(
    (next: typeof weekPlan) => {
      if (household.household) sharedWeekPlan.savePlan(next);
      else saveSettings({ ...settings, weekPlan: next });
    },
    [household.household, sharedWeekPlan, settings, saveSettings]
  );

  const productMemory = useProductMemory();
  const [weekOffset, setWeekOffset] = useState(0);
  const [activeTab, setActiveTab] = useState<MainTab>("inicio");
  const [panel, setPanel] = useState<
    | "calc" | "ai" | "pasos" | "entreno" | "sueno" | "datos" | "planificador"
    | "tema" | "tamano-letra" | "meta-diaria" | "medidas" | "solapas" | "herramientas" | "secciones" | "entrenador"
    | "nutricionista" | "ver-comidas" | "suplementos" | "planes" | "vincular-profesional"
    | null
  >(null);
  // Qué comida se tocó en Inicio (Desayuno/Almuerzo/etc.) para que el panel
  // "ai" abra directo en esa comida, sin el desplegable de selección --
  // null cuando se abre desde un lugar que no sabe cuál (ej. Macros).
  const [aiMeal, setAiMeal] = useState<MealKey | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const trainerApplication = useTrainerApplication(authenticated, userEmail);
  const isApprovedTrainer = trainerApplication.application?.status === "aprobado";
  const nutricionistaApplication = useTrainerApplication(authenticated, userEmail, "nutricion");
  const isApprovedNutricionista = nutricionistaApplication.application?.status === "aprobado";
  // Lado ALUMNO (no confundir con isApprovedTrainer, que es el lado profe) --
  // Boolean(link) es exactamente "¿tengo un profe vinculado activo?". Sin
  // vínculo, useMyAssignedSessions ni siquiera consulta la base (mismo
  // guard que useTrainerRoutinesForStudent) -- así un Autoentrenador no
  // dispara ningún request nuevo.
  const { link: trainerLink } = useTrainerLink(authenticated);
  const hasTrainerLink = Boolean(trainerLink);
  const { link: nutricionistaLink } = useTrainerLink(authenticated, "nutricion");
  const hasNutricionistaLink = Boolean(nutricionistaLink);
  const assignedSessions = useMyAssignedSessions(authenticated, hasTrainerLink);
  const nextWeekTraining = useNextWeekTrainingPlan(authenticated, hasTrainerLink);

  // Objetivo que puso cada profesional -- independiente de qué semana se
  // esté navegando con las flechas de arriba (weekOffset), siempre la
  // semana REAL de hoy. Se muestra en Comidas/Actividad (cada uno el suyo)
  // y combinado en Inicio.
  const thisWeekStart = useMemo(() => fmtDate(isoMonday(fmtDate(new Date()))), []);
  const nutritionPlanThisWeek = useMyNutritionPlan(authenticated, hasNutricionistaLink, thisWeekStart);
  const nutritionGoal = useMemo(() => {
    if (!hasNutricionistaLink) return null;
    const days = Object.values(nutritionPlanThisWeek.days);
    let kcalSum = 0;
    let proteinSum = 0;
    let count = 0;
    for (const day of days) {
      let dayKcal = 0;
      let dayProtein = 0;
      for (const meal of Object.values(day || {})) {
        if (meal && meal[0]) {
          dayKcal += meal[0].kcal;
          dayProtein += meal[0].protein;
        }
      }
      if (dayKcal > 0) {
        kcalSum += dayKcal;
        proteinSum += dayProtein;
        count++;
      }
    }
    if (count === 0) return null;
    return { kcalPromedio: Math.round(kcalSum / count), proteinPromedio: Math.round(proteinSum / count) };
  }, [hasNutricionistaLink, nutritionPlanThisWeek.days]);

  const trainingGoal = useMemo(() => {
    if (!hasTrainerLink || assignedSessions.sessions.length === 0) return null;
    const volumen = assignedSessions.sessions.reduce((sum, s) => sum + totalVolume(s.routineSnapshot), 0);
    return { sesionesSemana: assignedSessions.sessions.length, volumenPlanificado: Math.round(volumen) };
  }, [hasTrainerLink, assignedSessions.sessions]);
  useEscapeKey(() => setPanel(null), panel !== null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.theme || "oscuro");
  }, [settings.theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-font-size", settings.fontSize || "chico");
  }, [settings.fontSize]);

  // Básico/Premium/Premium+ -- ver migration_2026-09-21g_add_plan_gating.sql.
  // Estas listas son la única fuente de verdad de qué tapa el plan gratis;
  // a diferencia de enabledTabs/inicioHidden/macrosHidden (elección del
  // usuario, reversible desde Preferencias), esto no se puede apagar ni
  // prender a mano -- se resuelve solo con lo que cuenta Settings.plan.
  const clientPlan = settings.plan || "basico";
  const isBasico = clientPlan === "basico";
  // Se VEN con candado (no desaparecen) y al tocarlas muestran qué desbloquean.
  // Cargar comidas (desde Inicio), Macros y Entreno quedan con lo básico -- ver PLAN_LOCKED_ACTIVIDAD_BLOCKS.
  const PLAN_LOCKED_TABS: MainTab[] = ["alacena", "comidas", "gastos"];
  const PLAN_LOCKED_ACTIVIDAD_BLOCKS = ["planSemanaFuerza", "objetivoEntreno", "reporte", "pasosEditar", "rutinas"] as const;
  // "comidasSemana" (Modificar comidas de la semana) queda afuera de esta
  // lista a propósito -- es la única forma de corregir un error en algo ya
  // cargado (no es un "reporte", es edición básica), así que se mantiene
  // disponible para básico igual que "hoy" y "peso".
  // "objetivo" queda visible en Básico (solo el progreso de la calculadora, sin objetivos de
  // profesionales); "vinculo" y "seguimiento" se ven con candado, ver el map de Inicio.
  const PLAN_LOCKED_INICIO_BLOCKS = [] as const;
  const PLAN_LOCKED_MACROS_BLOCKS = ["ranking", "reporte", "cruceEntreno", "diversidad", "tabla"] as const;

  const inicioOrder = resolveOrder(settings.inicioOrder, DEFAULT_INICIO_ORDER);
  const inicioDrag = useSectionOrder(inicioOrder, (next) => saveSettings({ ...settings, inicioOrder: next }));
  const inicioHidden = isBasico ? [...(settings.inicioHidden || []), ...PLAN_LOCKED_INICIO_BLOCKS] : settings.inicioHidden || [];
  const hideInicioBlock = (id: (typeof inicioOrder)[number]) => {
    if (id === "hoy") return;
    saveSettings((prev) => ({ ...prev, inicioHidden: [...(prev.inicioHidden || []), id] }));
  };
  const macrosHidden = settings.macrosHidden || [];
  // En Básico estos bloques se ven desenfocados (BlurLock), no ocultos.
  // Espejo de Entreno: las herramientas de nutrición (planificación de Comidas, reportes de Macros) salen de un
  // Nutricionista vinculado o del plan Autoentreno. Con Entrenador solo (o Básico) queda la carga básica de comidas.
  // Cupos de vínculo con profesionales: Premium 1, Premium+ 2. Con todos usados, el acceso pasa a "Mis profesionales".
  const linkSlots = clientPlan === "premium_plus" ? 2 : 1;
  // Falta vincular profesional(es) del plan: Premium necesita 1, Premium+ los dos (Nutricionista y Entrenador).
  const linkPending =
    clientPlan === "premium"
      ? !hasTrainerLink && !hasNutricionistaLink
      : clientPlan === "premium_plus"
        ? !hasTrainerLink || !hasNutricionistaLink
        : false;
  const missingLinkText =
    clientPlan === "premium_plus"
      ? !hasTrainerLink && !hasNutricionistaLink
        ? "tu Entrenador y tu Nutricionista"
        : !hasTrainerLink
          ? "tu Entrenador"
          : "tu Nutricionista"
      : "tu profesional";
  const hasFreeLinkSlot = (hasTrainerLink ? 1 : 0) + (hasNutricionistaLink ? 1 : 0) < linkSlots;
  // Un Nutricionista aprobado también arma su propia nutrición (se auto-gestiona), igual que un Entrenador aprobado su entrenamiento.
  const comidasBasic = isBasico || (!hasNutricionistaLink && !isApprovedNutricionista && clientPlan !== "autoentreno");
  const macrosBlurred = comidasBasic ? PLAN_LOCKED_MACROS_BLOCKS : [];

  // "entrenador" no es una preferencia (no vive en settings.enabledTabs, no
  // se puede ocultar desde Ajustes > Solapas) -- aparece sola cuando la
  // postulación está aprobada, se apaga sola si se te vence/retiran el rol,
  // igual que PLAN_LOCKED_TABS pero al revés (agrega en vez de sacar).
  const enabledTabs = resolveOrder(settings.enabledTabs, DEFAULT_ENABLED_TABS);
  const lockedTabs = isBasico ? PLAN_LOCKED_TABS : comidasBasic ? (["comidas"] as MainTab[]) : [];
  const tabLocked = lockedTabs.includes(activeTab);
  const actividadHidden = settings.actividadHidden;
// Las herramientas de fuerza (rutinas, entrenamiento en vivo, planificación, reportes) salen de un Entrenador vinculado
  // o del plan Autoentreno. Sin ninguno de los dos (Básico, o Premium solo con Nutricionista) queda el registro básico.
  const entrenoBasic = isBasico || (!hasTrainerLink && !isApprovedTrainer && clientPlan !== "autoentreno");
  const actividadBlurred = entrenoBasic ? PLAN_LOCKED_ACTIVIDAD_BLOCKS : [];
  // "Profesionales" (cliente): aparece sola en cuanto hay al menos un profesional vinculado y reemplaza el ítem del menú.
  if (hasTrainerLink || hasNutricionistaLink) enabledTabs.push("profesionales");
  if (isApprovedTrainer) enabledTabs.push("entrenador");
  if (isApprovedNutricionista) enabledTabs.push("nutricionista");
  useEffect(() => {
    if (activeTab !== "inicio" && !enabledTabs.includes(activeTab)) setActiveTab("inicio");
  }, [activeTab, enabledTabs]);

  // weekOffset 0 siempre es la semana calendario REAL de hoy -- antes
  // arrancaba de la semana del último día cargado en `days`, así que si
  // todavía no habías cargado nada hoy (ej. estabas revisando la
  // planificación antes de comer), "semana actual" te mostraba una semana
  // vieja en vez de la de hoy.
  const monday = useMemo(() => addDays(isoMonday(fmtDate(new Date())), weekOffset * 7), [weekOffset]);

  // "hoy" nunca se puede apagar -- es el bloque más importante de Inicio y ya
  // pasó que alguien lo apagó sin querer y no encontraba cómo volver a
  // prenderlo. Se ignora si quedó en inicioHidden de antes (arreglo
  // retroactivo) y no se le pasa onHide más abajo (así ni aparece el foquito).
  // "peso" además desaparece del todo (no solo se achica) una vez cargado el
  // peso de la semana que se está viendo -- reaparece la semana siguiente.
  const pesoCargadoEstaSemana = settings.weeklyWeights?.[fmtDate(monday)] != null;
  const inicioVisible = inicioOrder.filter(
    (id) => (id === "hoy" || !inicioHidden.includes(id)) && !(id === "peso" && pesoCargadoEstaSemana)
  );

  // Plan de la Nutricionista de la semana que se está mirando con las flechas (el de la semana real
  // de hoy ya está en nutritionPlanThisWeek) -- alimenta el almanaque de Comidas.
  const nutritionPlanViewed = useMyNutritionPlan(authenticated, hasNutricionistaLink, fmtDate(monday));
  const nutritionPlanNext = useMyNutritionPlan(authenticated, hasNutricionistaLink, fmtDate(addDays(isoMonday(fmtDate(new Date())), 7)));

  const weekDates = useMemo(() => [...Array(7)].map((_, i) => fmtDate(addDays(monday, i))), [monday]);
  const weekDays = useMemo(() => weekDates.map((f) => days.find((d) => d.fecha === f) || null), [weekDates, days]);
  const presentDays = useMemo(() => weekDays.filter((d): d is NonNullable<typeof d> => !!d), [weekDays]);

  const sunday = addDays(monday, 6);

  const todayEntry = useMemo(() => {
    const todayFecha = fmtDate(new Date());
    return days.find((d) => d.fecha === todayFecha) || emptyDay(todayFecha);
  }, [days]);
  const todayKcal = dayTotal(todayEntry);

  // "Agregar a comidas" desde "Lo que te toca comer" (Comidas): la opción elegida del plan entra como comida de hoy.
  const addPlannedMeal = useCallback(
    (meal: MealKey, option: MealOption) => {
      const fecha = fmtDate(new Date());
      const existing = days.find((d) => d.fecha === fecha) || emptyDay(fecha);
      const item = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        nombre: option.nombre,
        kcal: option.kcal,
        protein: option.protein,
        carbs: option.carbs,
        fat: option.fat,
        fiber: 0,
        gramos: optionGrams(option) ?? undefined,
      };
      upsertDay(applyMealItems(existing, meal, [...getMealItems(existing, meal), item]));
      // Lo que se come del plan se descuenta de la Alacena (por ingrediente y cantidad).
      const text = ingredientsToText(option);
      return text ? inventoryMessage(consumeByText(text)) : "";
    },
    [days, upsertDay, consumeByText]
  );

  const currentWeightKg = useMemo(() => {
    // El único DayEntry con pesoKg suele ser el del día del onboarding (ver
    // más abajo, OnboardingWizard.onComplete) -- nadie vuelve a escribir ahí
    // después, así que ese valor queda "congelado" para siempre. Si se lo
    // prioriza a ciegas sobre settings.weeklyWeights (que sí se actualiza
    // semana a semana desde el bloque "peso"), el peso actual nunca avanza
    // aunque cargues pesos nuevos -- hay que comparar fechas de verdad y
    // quedarse con el más reciente de los dos, no asumir que "el día" siempre gana.
    const lastDaily = [...days].sort((a, b) => b.fecha.localeCompare(a.fecha)).find((d) => d.pesoKg);
    const weekKeys = Object.keys(settings.weeklyWeights || {}).sort();
    const lastWeeklyKey = weekKeys.length ? weekKeys[weekKeys.length - 1] : undefined;
    const lastWeeklyWeight = lastWeeklyKey ? settings.weeklyWeights![lastWeeklyKey] : undefined;
    if (lastDaily && lastWeeklyKey && lastWeeklyWeight != null) {
      return lastDaily.fecha >= lastWeeklyKey ? lastDaily.pesoKg! : lastWeeklyWeight;
    }
    if (lastDaily) return lastDaily.pesoKg!;
    if (lastWeeklyWeight != null) return lastWeeklyWeight;
    const profileWeight = settings.calculatorProfile?.actual ? Number(settings.calculatorProfile.actual) : undefined;
    return profileWeight || 75;
  }, [days, settings]);

  // Con Nutricionista vinculado, lo que ella fija manda: kcal y proteína del día salen de su plan
  // esta semana (una sola fuente para Hoy, Seguimiento, Objetivo y Macros), no de la calculadora.
  // Excepción de la cuenta de Gabi: mide el déficit a su manera (gasto basal + pasos + entrenamiento, comiendo ~2100 los días
  // activos y menos los de descanso), así que su meta diaria sigue siendo la propia y no el promedio del plan.
  const ownDeficitMethod = userEmail === "jgabrielrosa8@gmail.com";
  const goalKcal = (!ownDeficitMethod && nutritionGoal?.kcalPromedio) || settings.goal;
  const proteinTarget = (!ownDeficitMethod && nutritionGoal?.proteinPromedio) || proteinTargetForWeight(currentWeightKg);
  const proteinTargetG = proteinTarget;
  // Meta variable (sube/baja con pasos y entrenamiento) solo si hay alguien que planifique el entrenamiento: con Nutricionista
  // pero sin Entrenador no se sabe cuánto se va a gastar, así que la meta es constante. Sin profesionales, elige la persona.
  // Autoentreno planifica su propio entrenamiento (con IA), así que ahí también puede ser variable.
  const goalStyleLocked = hasNutricionistaLink && !hasTrainerLink && settings.plan !== "autoentreno" && !ownDeficitMethod;
  const goalFixed = goalStyleLocked || settings.goalStyle === "constante";

  const summary = useMemo(
    () => summarizeWeek(presentDays, settings.tdeeFallback, goalKcal, settings.weeklyWeights, currentWeightKg, days, goalFixed),
    [presentDays, settings, currentWeightKg, days, goalKcal, goalFixed]
  );

  const weightTrend = useMemo(() => {
    const currentWeight = settings.weeklyWeights?.[fmtDate(monday)];
    const previousWeight = settings.weeklyWeights?.[fmtDate(addDays(monday, -7))];
    if (currentWeight == null || previousWeight == null) return null;
    return currentWeight - previousWeight;
  }, [settings.weeklyWeights, monday]);

  // Objetivos medibles que fijaron los profesionales: se miden solos con lo que se carga, y al cumplirse se marcan
  // como logrados (el profesional se entera y puede dejar un mensaje).
  const myPoints = useMyPoints(authenticated);
  const myObjectives = useMyObjectives(authenticated, myPoints.refetch);
  const objectivesWithProgress = useMemo(
    () =>
      myObjectives.objectives.map((objective) => ({
        objective,
        progress: computeObjectiveProgress(
          objective,
          days,
          settings.weeklyWeights,
          myObjectives.checks.filter((c) => c.objectiveId === objective.id),
          fmtDate(new Date())
        ),
      })),
    [myObjectives.objectives, myObjectives.checks, days, settings.weeklyWeights]
  );
  const achievedMarkedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const { objective, progress } of objectivesWithProgress) {
      if (objective.estado === "activo" && progress.achieved && !achievedMarkedRef.current.has(objective.id)) {
        achievedMarkedRef.current.add(objective.id);
        myObjectives.markAchieved(objective.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectivesWithProgress]);

  const bodyMeasurements = useBodyMeasurements(authenticated);
  const goalProgress = useMemo(() => {
    if (!settings.calculatorProfile) return null;
    return computeGoalProgress(
      settings.calculatorProfile,
      currentWeightKg,
      weightTrend,
      proteinTarget,
      goalKcal,
      earliestLoggedWeight(days, settings.weeklyWeights) ?? undefined
    );
  }, [settings.calculatorProfile, currentWeightKg, weightTrend, goalKcal, proteinTarget, days, settings.weeklyWeights]);

  // Logros diarios / semanales / mensuales y de los objetivos propios: se detectan con lo que se carga y se reclaman en
  // la base (que decide los puntos).
  const bodyProgress = useMemo(() => {
    const g = settings.calculatorProfile?.metaCorporal;
    return g ? computeBodyGoalProgress(g, bodyMeasurements.items, fmtDate(new Date())) : null;
  }, [settings.calculatorProfile, bodyMeasurements.items]);
  const achievements = useMemo(
    () =>
      computeAchievements({
        days,
        objectives: objectivesWithProgress,
        weeklyWeights: settings.weeklyWeights,
        goalProgress,
        bodyProgress,
        today: fmtDate(new Date()),
      }),
    [days, objectivesWithProgress, settings.weeklyWeights, goalProgress, bodyProgress]
  );
  const achievementClaims = useAchievementClaims(authenticated, achievements, myPoints.refetch);

  const muscleGroupTrend = useMemo(
    () => computeMuscleGroupVolumeTrend(days, weekDates, currentWeightKg),
    [days, weekDates]
  );

  const foodTrainingInsight = useMemo(
    () => computeFoodTrainingInsight(days, settings.weeklyWeights),
    [days, settings.weeklyWeights]
  );

  // Para la franja fija de arriba (TabBar + selector de semana): mismo peso,
  // racha y criterio de "¿la tendencia va bien?" que ya muestra la tarjeta
  // "Peso de esta semana" en Inicio, para no tener dos lugares con lógica
  // separada que puedan mostrar cosas distintas.
  const weightThisWeek = settings.weeklyWeights?.[fmtDate(monday)];
  const weightStreakCount = weightStreak(settings.weeklyWeights || {}, fmtDate(monday));
  const weightTrendGood = (() => {
    if (weightTrend == null || weightTrend === 0) return null;
    const wantsDown = settings.calculatorProfile?.modo === "perder";
    const wantsUp = settings.calculatorProfile?.modo === "aumentar";
    return wantsDown ? weightTrend < 0 : wantsUp ? weightTrend > 0 : null;
  })();

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
          onComplete={({ gasto, objetivo, calculatorProfile, pesoKg, pasos, enabledTabs: chosenTabs }) => {
            saveSettings({ ...settings, tdeeFallback: gasto, goal: objetivo, calculatorProfile, enabledTabs: chosenTabs });
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
      <GlobalWorkoutTimer onOpen={() => setActiveTab("actividad")} hidden={activeTab === "actividad"} />
      {syncError && (
        <div className="mb-4 flex items-center gap-1.5 rounded-xl border border-rust/40 bg-rust/10 px-3 py-2 text-[11px] text-rust">
          <TriangleAlert size={16} strokeWidth={1.8} />
          {syncError}
        </div>
      )}

      {/* El tour de 8 tarjetas (AppTour) está apagado a pedido -- era largo y tedioso.
          El componente queda en el repo para rehacerlo más corto. */}
      <TipPopup
        presentDays={presentDays}
        summary={summary}
        proteinTarget={proteinTarget}
        goalMode={settings.calculatorProfile?.modo}
        weightTrend={weightTrend}
        sleepAvg={sleepAvg}
      />

      {/* Fijo arriba (TabBar + selector de semana + peso/racha), un solo
          contenedor sticky para que se queden pegados juntos como una sola
          unidad sin tener que calcular a mano la altura de cada fila. */}
      <div className="sticky top-0 z-30 mb-4">
        <AuthPanel
          onAuthChange={handleAuthChange}
          onUserEmailChange={setUserEmail}
          onOpenTheme={() => setPanel("tema")}
          onOpenFontSize={() => setPanel("tamano-letra")}
          onOpenGoalStyle={() => setPanel("meta-diaria")}
          onOpenMeasures={() => setPanel("medidas")}
          onOpenTabs={() => setPanel("solapas")}
          onOpenSections={() => setPanel("secciones")}
          onOpenTools={() => setPanel("herramientas")}
          onOpenTrainer={isBasico ? undefined : () => setPanel("entrenador")}
          isApprovedTrainer={isApprovedTrainer}
          onOpenNutricionista={isBasico ? undefined : () => setPanel("nutricionista")}
          isApprovedNutricionista={isApprovedNutricionista}
          onOpenPlanes={() => setPanel("planes")}
          onOpenLinkToProfessional={hasTrainerLink || hasNutricionistaLink ? undefined : () => setPanel("vincular-profesional")}
          centerContent={
            <div className="flex w-full min-w-0 items-center justify-between gap-1">
              <button
                type="button"
                onClick={() => setWeekOffset((w) => w - 1)}
                aria-label="Semana anterior"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-surfaceAlt text-text hover:border-gold/60"
              >
                ‹
              </button>
              <div className="flex min-w-0 items-center gap-1.5 font-mono text-[11px] leading-none">
                <span className="shrink-0 text-textMuted">
                  {monday.getDate()}/{monday.getMonth() + 1}–{sunday.getDate()}/{sunday.getMonth() + 1}
                </span>
                {/* El peso/racha solo tiene sentido en las solapas que lo usan
                    (Inicio, Macros, Entreno) -- en Comidas y Gastos se oculta,
                    pero las flechas de semana siguen andando en todas. */}
                {(activeTab === "inicio" || activeTab === "macros" || activeTab === "actividad") && (
                  <>
                    {weightThisWeek != null ? (
                      <span className="shrink-0 font-sans font-bold text-text">{weightThisWeek.toFixed(1)}kg</span>
                    ) : (
                      <span className="shrink-0 text-rust">peso pend.</span>
                    )}
                    {weightTrend != null && weightTrend !== 0 && (
                      <span className={`shrink-0 ${weightTrendGood == null ? "text-textMuted" : weightTrendGood ? "text-sage" : "text-rust"}`}>
                        {weightTrend > 0 ? "▲" : "▼"}
                      </span>
                    )}
                    {weightStreakCount >= 2 && (
                      <span className="shrink-0 flex items-center gap-0.5 text-gold">
                        <Flame size={16} strokeWidth={1.8} />
                        {weightStreakCount}
                      </span>
                    )}
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => setWeekOffset((w) => w + 1)}
                aria-label="Semana siguiente"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-surfaceAlt text-text hover:border-gold/60"
              >
                ›
              </button>
            </div>
          }
        />
        <TabBar active={activeTab} onChange={setActiveTab} enabledTabs={enabledTabs} lockedTabs={lockedTabs} />
      </div>

      {activeTab === "macros" && (
        <MacrosTab
          entry={todayEntry}
          goal={goalKcal}
          proteinTarget={proteinTarget}
          weekDates={weekDates}
          weekDays={weekDays}
          onLogMeal={() => {
            setAiMeal(null);
            setPanel("ai");
          }}
          weightKg={currentWeightKg}
          tdeeFallback={settings.tdeeFallback}
          onUpsert={upsertDay}
          order={settings.macrosOrder}
          onReorder={(macrosOrder) => saveSettings({ ...settings, macrosOrder })}
          hidden={macrosHidden}
          blurred={macrosBlurred}
          lockedHint={isBasico ? undefined : "Con un Nutricionista o el plan Autoentreno"}
          onUpgrade={() => setPanel("planes")}
          onHide={(id) => saveSettings((prev) => ({ ...prev, macrosHidden: [...(prev.macrosHidden || []), id] }))}
          foodTrainingInsight={foodTrainingInsight}
          goalMode={settings.calculatorProfile?.modo}
          densityGoal={hasNutricionistaLink ? planDayDensity(nutritionPlanThisWeek.days[WEEKDAYS[new Date().getDay()]], weekPlan[fmtDate(new Date())]) : null}
        />
      )}

      {activeTab === "actividad" && (
        <ActividadTab
          basic={entrenoBasic}
          blurred={actividadBlurred}
          lockedHint={isBasico ? undefined : "Con un Entrenador o el plan Autoentreno"}
          bodyKg={currentWeightKg}
          onUpgrade={() => setPanel("planes")}
          entry={todayEntry}
          weekDates={weekDates}
          weekDays={weekDays}
          onLogSteps={() => setPanel("pasos")}
          onLogTraining={() => setPanel("entreno")}
          onLogSleep={() => setPanel("sueno")}
          onUpsert={upsertDay}
          routines={settings.routines || []}
          schedule={settings.trainingSchedule || {}}
          onSaveRoutines={(routines) => saveSettings({ ...settings, routines })}
          onSaveSchedule={(trainingSchedule) => saveSettings({ ...settings, trainingSchedule })}
          order={settings.actividadOrder}
          onReorder={(actividadOrder) => saveSettings({ ...settings, actividadOrder })}
          hidden={actividadHidden}
          onHide={(id) => {
            if (id === "resumen") return; // "Hoy" nunca se apaga -- ver comentario en ActividadTab.tsx
            saveSettings((prev) => ({ ...prev, actividadHidden: [...(prev.actividadHidden || []), id] }));
          }}
          workoutSuggestions={settings.workoutSuggestions || {}}
          onSaveWorkoutSuggestions={(updates) =>
            saveSettings({ ...settings, workoutSuggestions: { ...(settings.workoutSuggestions || {}), ...updates } })
          }
          onCreateAndAssignRoutine={(routine, weekday) =>
            saveSettings({
              ...settings,
              routines: [...(settings.routines || []), routine],
              trainingSchedule: { ...(settings.trainingSchedule || {}), [weekday]: routine.id },
            })
          }
          isApprovedTrainer={isApprovedTrainer}
          hasTrainerLink={hasTrainerLink}
          assignedSession={assignedSessions.todaySession}
          onStartAssignedSession={assignedSessions.start}
          onCompleteAssignedSession={assignedSessions.complete}
          weekSessions={assignedSessions.sessions}
          nextWeekReady={nextWeekTraining.ready}
          trainingGoal={trainingGoal}
          muscleGroupTrend={muscleGroupTrend}
          goalMode={settings.calculatorProfile?.modo}
        />
      )}

      {tabLocked && activeTab === "alacena" && (
        <LockedTabNotice
          title="Alacena"
          unlocks={["Stock de tu cocina, con grupo compartido", "Descuento automático al cargar una comida", "Sugerencias de recetas con lo que tenés"]}
          onUpgrade={() => setPanel("planes")}
        />
      )}
      {tabLocked && activeTab === "comidas" && (
        <LockedTabNotice
          title="Comidas"
          headline={isBasico ? undefined : "Las herramientas de Comidas necesitan un Nutricionista"}
          unlocks={["Planificador semanal de comidas", "Plan semanal de tu Nutricionista, con opciones", "Lista de compras armada con lo que planificaste"]}
          onUpgrade={() => setPanel(isBasico ? "planes" : "vincular-profesional")}
          cta={isBasico ? "Ver planes" : "Vincular un Nutricionista"}
        />
      )}
      {tabLocked && activeTab === "gastos" && (
        <LockedTabNotice
          title="Gastos"
          unlocks={["Historial de compras con precio y marca", "Lo que gastás por semana y por producto"]}
          onUpgrade={() => setPanel("planes")}
        />
      )}
      {activeTab === "profesionales" && (
        <ProfesionalesTab
          authenticated={authenticated}
          hasFreeSlot={hasFreeLinkSlot}
          nutritionGoalLine={nutritionGoal ? `${nutritionGoal.kcalPromedio} kcal por día · ${nutritionGoal.proteinPromedio} g de proteína` : null}
          trainingGoalLine={trainingGoal ? `${trainingGoal.sesionesSemana} sesiones por semana · ~${trainingGoal.volumenPlanificado.toLocaleString("es-AR")} kg de volumen` : null}
          nutritionStatus={
            Object.keys(nutritionPlanNext.days).length > 0
              ? "Tu plan de la semana que viene ya está publicado: elegí tus comidas."
              : Object.keys(nutritionPlanThisWeek.days).length > 0
                ? "Tu plan de esta semana está en Comidas."
                : "Todavía no publicó un plan."
          }
          onGoToTab={setActiveTab}
        />
      )}
      {activeTab === "gastos" && !tabLocked && <PurchaseHistoryCard purchases={purchases} removePurchase={removePurchase} />}

      {activeTab === "entrenador" && (
        <div className="mx-auto max-w-lg">
          <TrainerPanel
            authenticated={authenticated}
            userEmail={userEmail}
            routines={settings.routines || []}
            onSaveRoutines={(routines) => saveSettings({ ...settings, routines })}
          />
        </div>
      )}

      {activeTab === "nutricionista" && (
        <div className="mx-auto max-w-lg">
          <NutricionistaPanel authenticated={authenticated} userEmail={userEmail} />
        </div>
      )}

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
                    <SortableSection key="hoy" id="hoy" dragDisabledOnDesktop>
                      <TodayCard
                        entry={todayEntry}
                        goal={goalKcal}
                        tdeeFallback={settings.tdeeFallback}
                        fixedGoal={goalFixed}
                        pesoKg={currentWeightKg}
                        onLogMeal={(meal) => {
                          setAiMeal(meal);
                          setPanel("ai");
                        }}
                        onViewMeals={() => setPanel("ver-comidas")}
                        onLogSupplements={() => setPanel("suplementos")}
                        onLogSteps={() => setPanel("pasos")}
                        onLogTraining={() => setPanel("entreno")}
                      />
                    </SortableSection>
                  );
                }
                if (blockId === "peso") {
                  // Antes, una vez cargado el peso de la semana, TODO el bloque
                  // desaparecía -- pero WeeklyWeight ya se achica solo a una fila
                  // compacta en ese caso (nada de cartel grande de "pendiente"),
                  // y ahí es donde vive el historial completo de pesos -- si se
                  // sigue ocultando el bloque entero, el historial nunca se
                  // llega a ver. Se deja siempre montado; WeeklyWeight decide su
                  // propio tamaño según haya o no peso cargado esta semana.
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
                if (isBasico && blockId === "vinculo") {
                  return (
                    <LockedBlockCard
                      key="vinculo"
                      title="Vincularme a un profesional"
                      description="Conecta con un Entrenador o Nutricionista que te arme el plan."
                      onUpgrade={() => setPanel("planes")}
                    />
                  );
                }
                if (blockId === "vinculo") {
                  // Solo tiene sentido para Premium/Premium+ (los planes que
                  // incluyen vínculo con un profesional) y solo si falta algo
                  // -- el chequeo se hace ACÁ (no dentro de PendingLinkCard)
                  // para no dejar el envoltorio de SortableSection (borde,
                  // manito de arrastre, foquito) montado alrededor de nada.
                  if (!linkPending) return null;
                  return (
                    <SortableSection key="vinculo" id="vinculo" onHide={() => hideInicioBlock("vinculo")} dragDisabledOnDesktop>
                      <PendingLinkCard
                        plan={clientPlan}
                        hasTrainerLink={hasTrainerLink}
                        hasNutricionistaLink={hasNutricionistaLink}
                        onOpen={() => setPanel("vincular-profesional")}
                      />
                    </SortableSection>
                  );
                }
                if (blockId === "objetivo") {
                  return (
                    <SortableSection key="objetivo" id="objetivo" onHide={() => hideInicioBlock("objetivo")} dragDisabledOnDesktop>
                      {linkPending && (
                        <button
                          type="button"
                          onClick={() => setPanel("vincular-profesional")}
                          className="mb-2 w-full rounded-xl border border-yellow-500/60 bg-yellow-400/15 p-3 text-left"
                        >
                          <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-yellow-500">Falta vincular</div>
                          <div className="mt-0.5 text-[12px] text-text">
                            Vinculá {missingLinkText} para tener objetivos de entrenamiento y nutrición validados, y poder elegir una meta variable o constante. Tocá para vincular.
                          </div>
                        </button>
                      )}
                      {((nutritionGoal && !goalProgress) || trainingGoal) && !goalProgress && (
                        <div className="mb-2 rounded-xl border border-gold/40 bg-gold/5 p-3">
                          <div className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.15em] text-gold">Objetivo de tus profesionales</div>
                          <div className="grid grid-cols-2 gap-2">
                            {nutritionGoal && !goalProgress && (
                              <div>
                                <div className="font-mono text-[8px] uppercase tracking-wide text-textMuted">Nutricionista</div>
                                <div className="text-[13px] font-semibold text-text">{nutritionGoal.kcalPromedio} kcal/día</div>
                                <div className="font-mono text-[10px] text-textMuted">{nutritionGoal.proteinPromedio}g proteína</div>
                              </div>
                            )}
                            {trainingGoal && (
                              <div>
                                <div className="font-mono text-[8px] uppercase tracking-wide text-textMuted">Entrenador</div>
                                <div className="text-[13px] font-semibold text-text">{trainingGoal.sesionesSemana} sesiones/sem.</div>
                                <div className="font-mono text-[10px] text-textMuted">~{trainingGoal.volumenPlanificado.toLocaleString("es-AR")}kg volumen</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {goalProgress && <GoalProgress progress={goalProgress} openOnDesktop setBy={nutritionGoal ? (trainingGoal ? "Objetivo validado por tus profesionales" : "Objetivo validado por tu Nutricionista") : trainingGoal ? "Objetivo validado por tu Entrenador" : undefined}
                        extraLines={trainingGoal ? [`Entrenador: ${trainingGoal.sesionesSemana} sesiones por semana · ~${trainingGoal.volumenPlanificado.toLocaleString("es-AR")} kg de volumen`] : undefined} />}
                      {nutritionGoal && !settings.goalStyle && !goalStyleLocked && !ownDeficitMethod && (
                        <button
                          type="button"
                          onClick={() => setPanel("meta-diaria")}
                          className="mt-2 flex w-full items-center justify-between gap-2 rounded-lg border border-gold/40 px-3 py-2 text-left"
                        >
                          <span className="text-[12px] text-text">Elegí cómo seguir tu meta diaria: variable o constante</span>
                          <span className="font-mono text-[9px] uppercase tracking-wide text-gold">Elegir</span>
                        </button>
                      )}
                      {objectivesWithProgress.length > 0 && (
                        <div className={goalProgress ? "mt-3" : ""}>
                          <MyObjectivesCard items={objectivesWithProgress} onCheck={myObjectives.saveCheck} todayFecha={fmtDate(new Date())} totalPoints={myPoints.total} pointsByObjective={myPoints.byObjective} />
                        </div>
                      )}
                      {/* Todo lo de objetivos y logros vive acá, en una sola sección. */}
                      {settings.calculatorProfile && hasNutricionistaLink && (
                        <div className="mt-3">
                          <BodyGoalCard
                            goal={settings.calculatorProfile.metaCorporal}
                            measurements={bodyMeasurements.items}
                            dailyDeficit={summary.avgDeficit > 0 ? summary.avgDeficit : Math.max(0, settings.tdeeFallback - goalKcal)}
                            sexo={settings.calculatorProfile.sexo}
                            onSaveGoal={(metaCorporal) => saveSettings((prev) => (prev.calculatorProfile ? { ...prev, calculatorProfile: { ...prev.calculatorProfile, metaCorporal } } : prev))}
                            onSaveMeasurement={bodyMeasurements.save}
                          />
                        </div>
                      )}
                      <div className="mt-3">
                        <AchievementsCard achievements={achievements} claimed={achievementClaims.claimed} totalPoints={myPoints.total} />
                      </div>
                    </SortableSection>
                  );
                }
                // "Logros y puntos" ahora vive dentro del bloque "Tu objetivo" (todo junto en una sola sección).
                if (blockId === "logros") return null;
                if (blockId === "seguimiento") {
                  return (
                    <SortableSection key="seguimiento" id="seguimiento" onHide={() => hideInicioBlock("seguimiento")} dragDisabledOnDesktop>
                      <Collapsible
                        eyebrow="Semana"
                        title="Seguimiento semanal"
                        info={SECTION_HELP.semana}
                        scrollable={false}
                        openOnDesktop={!isBasico}
                      >
                        <BlurLock active={isBasico} title="Seguimiento semanal" onUpgrade={() => setPanel("planes")}>
                        <div className="mb-2 font-display text-base leading-none text-text">Indicadores</div>
                        <SummaryCards
                          summary={summary}
                          goal={summary.avgGoal || goalKcal}
                          weight={settings.weeklyWeights?.[fmtDate(monday)]}
                        />
                        <div className="my-3 border-t border-dashed border-border" />
                        <WeeklyChart
                          weekDates={weekDates}
                          weekDays={weekDays}
                          goal={goalKcal}
                          avgGoal={summary.avgGoal || goalKcal}
                          avgGasto={settings.tdeeFallback}
                          weeklyWeights={settings.weeklyWeights}
                          fallbackWeightKg={currentWeightKg}
                          fixedGoal={goalFixed}
                        />
                        
                        {!isBasico && (
                        <>
                        <div className="my-3 border-t border-dashed border-border" />
                        <Ledger
                          weekDates={weekDates}
                          weekDays={weekDays}
                          goal={summary.avgGoal || goalKcal}
                          tdeeFallback={settings.tdeeFallback}
                          onUpsert={upsertDay}
                          variant="actividad"
                          bare
                          weeklyWeights={settings.weeklyWeights}
                          fallbackWeightKg={currentWeightKg}
                        />
                        </>
                        )}
                        </BlurLock>
                      </Collapsible>
                    </SortableSection>
                  );
                }
                return (
                  <SortableSection key="comidasSemana" id="comidasSemana" onHide={() => hideInicioBlock("comidasSemana")} dragDisabledOnDesktop>
                    <WeekMealsCard
                      weekDates={weekDates}
                      weekDays={weekDays}
                      onUpsert={upsertDay}
                      openOnDesktop
                      onInventoryDelta={handleMealInventoryDelta}
                      preparationsLocked={isBasico}
                      onUpgrade={() => setPanel("planes")}
                    />
                  </SortableSection>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </div>
      )}

      {activeTab === "alacena" && !tabLocked && (
        <AlacenaTab
          items={inventory}
          consumeAmounts={consumeAmounts}
          onUseRecipe={useRecipeAsMeal}
          goalMode={settings.calculatorProfile?.modo}
          dailyGoal={goalKcal}
          consumedKcal={todayKcal}
          addStructuredItems={addStructuredItems}
          updateInventoryItem={updateInventoryItem}
          applyInventoryReview={applyInventoryReview}
          productMemory={productMemory}
          replaceItems={replaceInventory}
          order={settings.alacenaOrder}
          onReorder={(alacenaOrder) => saveSettings({ ...settings, alacenaOrder })}
          hidden={settings.alacenaHidden}
          onHide={(id) => saveSettings((prev) => ({ ...prev, alacenaHidden: [...(prev.alacenaHidden || []), id] }))}
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

      {activeTab === "comidas" && !tabLocked && (
        <ComidasTab
          weekPlan={weekPlan}
          weekDates={weekDates}
          onOpenPlanificador={() => setPanel("planificador")}
          hasNutricionistaLink={hasNutricionistaLink}
          nutritionGoal={nutritionGoal}
          days={days}
          todayFecha={fmtDate(new Date())}
          planThisWeek={nutritionPlanThisWeek.days}
          planViewedWeek={nutritionPlanViewed.days}
          planNextWeek={nutritionPlanNext.days}
          inventory={inventory}
          onAddPlannedMeal={addPlannedMeal}
          order={settings.comidasOrder}
          onReorder={(comidasOrder) => saveSettings({ ...settings, comidasOrder })}
          hidden={settings.comidasHidden}
          onHide={(id) => saveSettings((prev) => ({ ...prev, comidasHidden: [...(prev.comidasHidden || []), id] }))}
          household={household.household}
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
                saveSettings({ ...settings, tdeeFallback: gasto, goal: objetivo, calculatorProfile: { ...calculatorProfile, metaCorporal: settings.calculatorProfile?.metaCorporal } });
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
              <span className="font-display text-base text-text">{aiMeal ? `Cargar ${MEAL_LABELS[aiMeal]}` : "Cargar comida"}</span>
              <button
                onClick={() => setPanel(null)}
                className="rounded-full border border-border bg-bg px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted"
              >
                Cerrar
              </button>
            </div>
            <div className="flex-1 p-3">
              <AiEntryForm
                days={days}
                onUpsert={upsertDay}
                onConsumeInventory={consumeByText}
                inventory={inventory}
                consumeAmounts={consumeAmounts}
                disableAi={isBasico}
                initialMeal={aiMeal}
                onInventoryDelta={handleMealInventoryDelta}
                authenticated={authenticated}
                hasNutricionistaLink={hasNutricionistaLink}
                weekPlan={weekPlan}
              />
            </div>
          </div>
        </div>
      )}

      {panel === "pasos" && (
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
            <StepsEntryForm
              entry={todayEntry}
              onSave={(entry) => {
                upsertDay(entry);
                setPanel(null);
              }}
            />
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

      {panel === "ver-comidas" && (
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
            <div className="mb-3 font-display text-base text-text">Comidas de hoy</div>
            <MealsEditor
              entry={todayEntry}
              onUpsert={upsertDay}
              emptyMessage="Todavía no cargaste comidas hoy."
              onInventoryDelta={handleMealInventoryDelta}
              preparationsLocked={isBasico}
              onUpgrade={() => setPanel("planes")}
            />
          </div>
        </div>
      )}

      {panel === "suplementos" && (
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
            <SupplementsPanel entry={todayEntry} onUpsert={upsertDay} />
          </div>
        </div>
      )}

      {panel === "planes" && (
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
            <PlansCarousel currentPlan={clientPlan} />
          </div>
        </div>
      )}

      {panel === "vincular-profesional" && (
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
            <LinkToProfessional hasFreeSlot={hasFreeLinkSlot} authenticated={authenticated} routines={settings.routines || []} onSaveRoutines={(routines) => saveSettings({ ...settings, routines })} />
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
              <span className="font-display text-base text-text">{hasNutricionistaLink ? "Plan del Nutricionista" : "Planificador de la semana"}</span>
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
                weekPlan={weekPlan}
                onSave={saveWeekPlan}
                dailyGoal={goalKcal}
                proteinTargetG={proteinTargetG}
                authenticated={authenticated}
                hasNutricionistaLink={hasNutricionistaLink}
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

      {panel === "meta-diaria" && (
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
            <GoalStyleSettings settings={settings} onSave={saveSettings} locked={goalStyleLocked} />
          </div>
        </div>
      )}

      {panel === "medidas" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm" onClick={() => setPanel(null)}>
          <div
            className="relative my-4 max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <MeasurementsPanel measurements={bodyMeasurements.items} onSave={bodyMeasurements.save} onClose={() => setPanel(null)} />
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

      {panel === "entrenador" && (
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
            <TrainerPanel
              authenticated={authenticated}
              userEmail={userEmail}
              routines={settings.routines || []}
              onSaveRoutines={(routines) => saveSettings({ ...settings, routines })}
            />
          </div>
        </div>
      )}

      {panel === "nutricionista" && (
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
            <NutricionistaPanel authenticated={authenticated} userEmail={userEmail} />
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
              onOpenAI={
                isBasico
                  ? undefined
                  : () => {
                      setAiMeal(null);
                      setPanel("ai");
                    }
              }
              onOpenDatos={() => setPanel("datos")}
            />
          </div>
        </div>
      )}
    </main>
  );
}
