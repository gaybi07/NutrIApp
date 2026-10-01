import { BODY_METRICS, BodyGoalProgress } from "@/lib/bodyGoal";
import { DayEntry, MealKey } from "@/lib/types";
import { addDays, fmtDate, isoMonday } from "@/lib/calculations";
import { getMealItems } from "@/lib/calculations";
import { GoalProgressInfo } from "@/lib/calculations";
import { ObjectiveProgress } from "@/lib/objectiveProgress";
import { Objective } from "@/lib/types";

/**
 * Logros diarios, semanales y mensuales + avance de los objetivos propios. La app los detecta con lo que se carga y
 * los "reclama"; los puntos los decide la base (achievement_points, migration_2026-10-11) -- los valores de acá son
 * solo para mostrarlos.
 */
export type AchievementPeriod = "dia" | "semana" | "mes" | "propio";

export interface Achievement {
  kind: string;
  clave: string;
  periodo: AchievementPeriod;
  label: string;
  puntos: number;
  done: boolean;
  /** Para los pendientes: cuánto falta. */
  hint?: string;
}

export const ACHIEVEMENT_POINTS: Record<string, number> = {
  dia_objetivo: 5,
  dia_perfecto: 10,
  dia_comidas: 5,
  sem_objetivo: 25,
  sem_registro: 20,
  sem_peso: 10,
  mes_constancia: 75,
  mes_peso: 50,
  propio_25: 20,
  propio_50: 20,
  propio_75: 20,
  propio_logrado: 150,
};

const MAIN_MEALS: MealKey[] = ["des", "alm", "mer", "cen"];

/** Cuántas de las 4 comidas principales tiene cargadas ese día. */
export function mainMealsLoaded(day: DayEntry | undefined): number {
  if (!day) return 0;
  return MAIN_MEALS.filter((m) => getMealItems(day, m).length > 0).length;
}

export function computeAchievements(input: {
  days: DayEntry[];
  objectives: { objective: Objective; progress: ObjectiveProgress }[];
  weeklyWeights: Record<string, number> | undefined;
  goalProgress: GoalProgressInfo | null;
  /** Progreso del objetivo corporal medible (cintura, % de grasa...), si lo armó. */
  bodyProgress?: BodyGoalProgress | null;
  today: string;
}): Achievement[] {
  const { days, objectives, weeklyWeights, goalProgress, bodyProgress, today } = input;
  const byFecha = new Map(days.map((d) => [d.fecha, d]));
  const out: Achievement[] = [];
  const add = (a: Omit<Achievement, "puntos">) => out.push({ ...a, puntos: ACHIEVEMENT_POINTS[a.kind] });

  const weekStart = fmtDate(isoMonday(today));
  const month = today.slice(0, 7);

  // ---------- Diarios ----------
  const daily = objectives.filter((o) => o.objective.estado === "activo" && o.objective.ventana === "dia");
  for (const { objective, progress } of daily) {
    add({
      kind: "dia_objetivo",
      clave: `${today}|${objective.id}`,
      periodo: "dia",
      label: `Cumpliste hoy: ${objective.nombre}`,
      done: progress.todayMet === true,
      hint: progress.manual ? "Marcalo en tus objetivos" : "Todavía no llegaste hoy",
    });
  }
  if (daily.length >= 2) {
    add({
      kind: "dia_perfecto",
      clave: today,
      periodo: "dia",
      label: "Día perfecto: todos tus objetivos diarios",
      done: daily.every((o) => o.progress.todayMet === true),
      hint: `${daily.filter((o) => o.progress.todayMet === true).length} de ${daily.length} cumplidos hoy`,
    });
  }
  const loadedToday = mainMealsLoaded(byFecha.get(today));
  add({ kind: "dia_comidas", clave: today, periodo: "dia", label: "Registraste tus comidas de hoy", done: loadedToday >= 3, hint: `${loadedToday} de 3 comidas cargadas` });

  // ---------- Semanales ----------
  const weekDates = [...Array(7)].map((_, i) => fmtDate(addDays(new Date(`${weekStart}T00:00:00`), i)));
  for (const { objective, progress } of objectives.filter((o) => o.objective.estado === "activo" && o.objective.ventana !== "total")) {
    add({
      kind: "sem_objetivo",
      clave: `${weekStart}|${objective.id}`,
      periodo: "semana",
      label: `Cumpliste esta semana: ${objective.nombre}`,
      done: progress.weekMet,
      hint: progress.headline,
    });
  }
  const daysLoaded = weekDates.filter((f) => mainMealsLoaded(byFecha.get(f)) >= 3).length;
  add({ kind: "sem_registro", clave: weekStart, periodo: "semana", label: "Semana de registro: comidas cargadas 5 días", done: daysLoaded >= 5, hint: `${daysLoaded} de 5 días` });
  add({ kind: "sem_peso", clave: weekStart, periodo: "semana", label: "Cargaste tu peso de la semana", done: weeklyWeights?.[weekStart] != null, hint: "Falta cargar el peso semanal" });

  // ---------- Mensuales ----------
  const monthDays = days.filter((d) => d.fecha.startsWith(month) && d.fecha <= today);
  const daysInMonthLoaded = monthDays.filter((d) => mainMealsLoaded(d) >= 3).length;
  add({ kind: "mes_constancia", clave: month, periodo: "mes", label: "Constancia del mes: comidas cargadas 20 días", done: daysInMonthLoaded >= 20, hint: `${daysInMonthLoaded} de 20 días` });
  const mondaysInMonth: string[] = [];
  for (let d = new Date(`${month}-01T00:00:00`); fmtDate(d).startsWith(month) && fmtDate(d) <= today; d = addDays(d, 1)) {
    if (d.getDay() === 1) mondaysInMonth.push(fmtDate(d));
  }
  const weightsLoaded = mondaysInMonth.filter((m) => weeklyWeights?.[m] != null).length;
  add({
    kind: "mes_peso",
    clave: month,
    periodo: "mes",
    label: "Cargaste el peso todas las semanas del mes",
    done: mondaysInMonth.length >= 3 && weightsLoaded === mondaysInMonth.length,
    hint: `${weightsLoaded} de ${Math.max(mondaysInMonth.length, 3)} semanas`,
  });

  // ---------- Tus propios objetivos (el de la calculadora) ----------
  if (goalProgress && goalProgress.modo !== "recomponer" && goalProgress.kgTotalPlan > 0) {
    const pct = (goalProgress.kgYaLogrados / goalProgress.kgTotalPlan) * 100;
    const base = `${goalProgress.metaKg}|${goalProgress.modo}`;
    for (const step of [25, 50, 75]) {
      add({ kind: `propio_${step}`, clave: `${base}|${step}`, periodo: "propio", label: `Tu objetivo: ${step}% del camino`, done: pct >= step, hint: `Vas ${Math.max(0, Math.round(pct))}%` });
    }
    add({ kind: "propio_logrado", clave: base, periodo: "propio", label: "Llegaste a tu objetivo", done: goalProgress.yaLlego, hint: `Te faltan ${Math.max(0, Math.round(goalProgress.kgRestantes * 10) / 10)} kg` });
  }

  // El objetivo corporal medible da los mismos hitos que el de peso (misma tabla de puntos, otra clave).
  if (bodyProgress && bodyProgress.goal.inicial !== bodyProgress.goal.meta) {
    const g = bodyProgress.goal;
    const base = `corp|${g.medida}|${g.meta}`;
    const name = BODY_METRICS.find((m) => m.id === g.medida)?.label.toLowerCase() ?? g.medida;
    for (const step of [25, 50, 75]) {
      add({ kind: `propio_${step}`, clave: `${base}|${step}`, periodo: "propio", label: `Tu ${name}: ${step}% del camino`, done: bodyProgress.pct >= step, hint: `Vas ${bodyProgress.pct}%` });
    }
    add({ kind: "propio_logrado", clave: base, periodo: "propio", label: `Llegaste a tu meta de ${name}`, done: bodyProgress.yaLlego, hint: `Te faltan ${Math.round(bodyProgress.restante * 10) / 10}` });
  }

  return out;
}
