import { DayEntry, MealKey, MEAL_LABELS, TrainingIntensity, TrainingSession, GoalMode } from "./types";

/**
 * Sesiones de entrenamiento del día. Si ya tiene el formato nuevo
 * (`entrenamientos`), lo usa; si no, arma una sesión única a partir de los
 * campos viejos (`entreno`/`entrenoIntensidad`/`entrenoMinutos`) para que los
 * días cargados antes de soportar múltiples entrenamientos sigan funcionando.
 */
export function getTrainingSessions(d: DayEntry): TrainingSession[] {
  if (d.entrenamientos && d.entrenamientos.length > 0) return d.entrenamientos;
  if (d.entreno && d.entrenoIntensidad) return [{ intensidad: d.entrenoIntensidad, minutos: d.entrenoMinutos || 60 }];
  return [];
}

/** Total kcal consumidas en el día (suma de las 4 comidas). */
export function dayTotal(d: DayEntry): number {
  return (d.desK || 0) + (d.almK || 0) + (d.merK || 0) + (d.cenK || 0);
}

/** Total de proteína (g) consumida en el día. */
export function dayProt(d: DayEntry): number {
  return (d.desP || 0) + (d.almP || 0) + (d.merP || 0) + (d.cenP || 0);
}

/**
 * Estima el gasto calórico diario (TDEE) en base a pasos + si hubo entrenamiento.
 * Si el día no tiene pasos cargados, cae al valor de referencia de settings.
 *
 * IMPORTANTE (ver spec de producto, sección 2.3): estos umbrales son una
 * aproximación conversacional para un caso puntual. En una versión real,
 * reemplazar por una fórmula calibrada por usuario (Mifflin-St Jeor + factor
 * de actividad), usando peso/altura/edad/sexo reales.
 */
export function estimateGasto(d: DayEntry, tdeeFallback: number): number {
  const pasos = Math.max(0, d.pasos || 0);
  const ajustePasos = pasos > 0 ? Math.max(-150, Math.min(350, (pasos - 5000) * 0.04)) : 0;
  const ajusteEntrenamiento = estimateTrainingCalories(d);
  return Math.round(Math.max(0, tdeeFallback + ajustePasos + ajusteEntrenamiento));
}

/** Estima el gasto adicional de todas las sesiones del día, sin contar el reposo. */
export function estimateTrainingCalories(d: DayEntry): number {
  const sessions = getTrainingSessions(d);
  if (sessions.length === 0) return 0;
  const intensityMet: Record<TrainingIntensity, number> = { leve: 3, moderado: 4, exigente: 5, fallo: 6 };
  const peso = d.pesoKg || 75;
  return sessions.reduce((total, session) => {
    const met = intensityMet[session.intensidad];
    return total + Math.round(Math.max(0, (met - 1) * 3.5 * peso * session.minutos / 200));
  }, 0);
}

/** Ajusta el objetivo base con la actividad registrada en ese día. */
export function dayGoal(d: DayEntry, goal: number, tdeeFallback: number): number {
  return Math.round(Math.max(0, goal + estimateGasto(d, tdeeFallback) - tdeeFallback));
}

/** Déficit (positivo) o superávit (negativo) de un día dado. */
export function dayDeficit(d: DayEntry, tdeeFallback: number): number {
  return estimateGasto(d, tdeeFallback) - dayTotal(d);
}

export interface WeekSummary {
  avgKcal: number;
  avgProt: number;
  avgSteps: number;
  avgGasto: number;
  avgGoal: number;
  avgDeficit: number;
  trainedDays: number;
  totalDays: number;
  deficitAcumulado: number;
}

export function summarizeWeek(days: DayEntry[], tdeeFallback: number, goal: number): WeekSummary {
  const present = days.filter((d) => dayTotal(d) > 0);
  const n = present.length || 1;
  const avgKcal = Math.round(present.reduce((a, d) => a + dayTotal(d), 0) / n);
  const avgProt = Math.round(present.reduce((a, d) => a + dayProt(d), 0) / n);
  const avgSteps = Math.round(present.reduce((a, d) => a + (d.pasos || 0), 0) / n);
  const gastos = present.map((d) => estimateGasto(d, tdeeFallback));
  const avgGasto = Math.round(gastos.reduce((a, b) => a + b, 0) / (gastos.length || 1));
  const avgGoal = Math.round(present.reduce((a, d) => a + dayGoal(d, goal, tdeeFallback), 0) / n);
  const trainedDays = present.filter((d) => d.entreno).length;
  const deficitAcumulado = present.reduce((a, d) => a + dayDeficit(d, tdeeFallback), 0);
  const avgDeficit = Math.round(deficitAcumulado / (present.length || 1));
  return { avgKcal, avgProt, avgSteps, avgGasto, avgGoal, avgDeficit, trainedDays, totalDays: present.length, deficitAcumulado };
}

/** Gramos de proteína cada 100 kcal — métrica de "eficiencia" usada en el ranking. */
export function proteinDensity(kcal: number, protein: number): number | null {
  if (kcal <= 0) return null;
  return (protein * 100) / kcal;
}

export type ProteinQualityTier = "bueno" | "medio" | "malo";

/**
 * Umbral único de densidad proteica, compartido por el ranking de días y el
 * detalle por comida — así un mismo valor siempre se clasifica igual en toda
 * la app (antes el ranking usaba "mejores 3 / peores 3" relativos mientras el
 * detalle usaba este umbral fijo, y podían contradecirse).
 */
export function proteinQualityTier(density: number): ProteinQualityTier {
  if (density >= 2.5) return "bueno";
  if (density >= 1.5) return "medio";
  return "malo";
}

/**
 * Proteína diaria (g) para mantener masa muscular sin pérdidas, según el peso.
 * 1.3 g/kg/día, a pedido del usuario (más alcanzable que el 1.6 g/kg citado en
 * algunos estudios de nutrición deportiva como piso conservador en déficit).
 */
export function proteinTargetForWeight(weightKg: number): number {
  return Math.round(weightKg * 1.3);
}

/**
 * Clasifica la proteína TOTAL de un día contra el objetivo de mantenimiento
 * muscular (no contra la densidad por caloría, que es una medida distinta
 * usada para comparar comidas entre sí, no días contra un objetivo real).
 */
export function proteinDailyTier(totalProtein: number, target: number): ProteinQualityTier {
  if (target <= 0) return "malo";
  if (totalProtein >= target) return "bueno";
  if (totalProtein >= target * 0.9) return "medio";
  return "malo";
}

export interface RankedDay {
  day: DayEntry;
  total: number;
  protein: number;
  density: number;
  bestMeal: { label: string; density: number } | null;
  worstMeal: { label: string; density: number | null } | null;
}

/** Rankea días por densidad de proteína (g proteína / 100 kcal), de mejor a peor. */
export function rankDays(days: DayEntry[]): RankedDay[] {
  const mealKeys: MealKey[] = ["des", "alm", "mer", "cen"];
  const complete = days.filter((d) => dayTotal(d) > 0);

  const scored: RankedDay[] = complete.map((d) => {
    const total = dayTotal(d);
    const protein = dayProt(d);
    const density = proteinDensity(total, protein) ?? 0;

    const meals = mealKeys
      .map((k) => {
        const kcal = (d[`${k}K`] as number) || 0;
        const prot = (d[`${k}P`] as number) || 0;
        return { label: MEAL_LABELS[k].toLowerCase(), kcal, density: proteinDensity(kcal, prot) };
      })
      .filter((m) => m.kcal > 0)
      .sort((a, b) => (b.density ?? -1) - (a.density ?? -1));

    return {
      day: d,
      total,
      protein,
      density,
      bestMeal: meals[0] ? { label: meals[0].label, density: meals[0].density ?? 0 } : null,
      worstMeal: meals.length ? meals[meals.length - 1] : null,
    };
  });

  return scored.sort((a, b) => b.density - a.density);
}

export interface GoalCalcResult {
  diasRestantes: number;
  kgABajar: number;
  deficitDiarioNecesario: number;
  kcalObjetivoSugerido: number;
  pctDelGasto: number;
  kgPorSemana: number;
  esAgresivo: boolean;
}

/**
 * Calculadora de objetivo → déficit necesario.
 * Es una herramienta de validación: no modifica el objetivo diario configurado
 * por el usuario, solo indica si su plan actual es coherente con su meta.
 */
export function calcGoalDeficit(
  pesoActual: number,
  pesoObjetivo: number,
  fechaObjetivo: string,
  gastoReferencia: number
): GoalCalcResult | { error: string } {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const objetivo = new Date(`${fechaObjetivo}T00:00:00`);
  const diasRestantes = Math.round((objetivo.getTime() - hoy.getTime()) / 86400000);
  const kgABajar = pesoActual - pesoObjetivo;

  if (diasRestantes <= 0) return { error: "La fecha objetivo ya pasó o es hoy — elegí una fecha futura." };
  if (kgABajar <= 0) return { error: "El peso objetivo es igual o mayor al actual — no hay déficit que calcular." };

  const kcalTotalesNecesarias = kgABajar * 7700;
  const deficitDiarioNecesario = Math.round(kcalTotalesNecesarias / diasRestantes);
  const kcalObjetivoSugerido = Math.round(gastoReferencia - deficitDiarioNecesario);
  const pctDelGasto = (deficitDiarioNecesario / gastoReferencia) * 100;
  const kgPorSemana = kgABajar / (diasRestantes / 7);
  const pctPesoPorSemana = (kgPorSemana / pesoActual) * 100;
  const esAgresivo = pctDelGasto > 30 || pctPesoPorSemana > 1;

  return { diasRestantes, kgABajar, deficitDiarioNecesario, kcalObjetivoSugerido, pctDelGasto, kgPorSemana, esAgresivo };
}

export interface BmiInfo {
  bmi: number;
  categoria: "bajo peso" | "normal" | "sobrepeso" | "obesidad";
  saludableMin: number;
  saludableMax: number;
}

/** IMC actual + rango de peso saludable (IMC 18.5–24.9) para una altura dada. */
export function bmiInfo(pesoKg: number, alturaCm: number): BmiInfo | null {
  if (pesoKg <= 0 || alturaCm <= 0) return null;
  const alturaM = alturaCm / 100;
  const bmi = pesoKg / (alturaM * alturaM);
  const categoria = bmi < 18.5 ? "bajo peso" : bmi < 25 ? "normal" : bmi < 30 ? "sobrepeso" : "obesidad";
  return {
    bmi,
    categoria,
    saludableMin: Math.round(18.5 * alturaM * alturaM * 10) / 10,
    saludableMax: Math.round(24.9 * alturaM * alturaM * 10) / 10,
  };
}

export interface GoalComputation {
  basal: number;
  gastoBase: number;
  objetivo: number;
  detalle: string;
  deficit: GoalCalcResult | null;
}

/**
 * Fórmula de Mifflin-St Jeor (metabolismo basal) + factor de actividad fijo,
 * y objetivo diario según el modo elegido. Única fuente de verdad para este
 * cálculo — la usan tanto la calculadora rápida como el wizard guiado, para
 * que nunca puedan mostrar números distintos para los mismos datos.
 */
export function computeGoal(params: {
  actual: number;
  altura: number;
  edad: number;
  sexo: "hombre" | "mujer";
  modo: GoalMode;
  meta?: number;
  fecha?: string;
}): GoalComputation | { error: string } {
  const { actual, altura, edad, sexo, modo, meta, fecha } = params;
  if (!actual || !altura || !edad || actual <= 0 || altura <= 0 || edad <= 0) {
    return { error: "Completá peso, altura y edad para calcular." };
  }

  const basal = sexo === "hombre" ? 10 * actual + 6.25 * altura - 5 * edad + 5 : 10 * actual + 6.25 * altura - 5 * edad - 161;
  const gastoBase = Math.round(basal * 1.2);
  let objetivo = gastoBase;
  let detalle = "Consumo de mantenimiento para recomposición corporal.";
  let deficit: GoalCalcResult | null = null;

  if (modo === "perder") {
    if (!meta || !fecha) return { error: "Completá peso objetivo y fecha para calcular la pérdida." };
    const result = calcGoalDeficit(actual, meta, fecha, gastoBase);
    if ("error" in result) return result;
    deficit = result;
    objetivo = result.kcalObjetivoSugerido;
    detalle = `Déficit gradual para llegar a ${meta.toLocaleString("es-AR")} kg.`;
  } else if (modo === "aumentar") {
    objetivo = gastoBase + 250;
    detalle = "Superávit moderado para favorecer el aumento de masa.";
  }

  return { basal, gastoBase, objetivo, detalle, deficit };
}

/** Devuelve el lunes (inicio de semana) de la fecha dada. */
export function isoMonday(dateStr: string): Date {
  const d = new Date(`${dateStr}T00:00:00`);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

/**
 * Formatea una fecha como YYYY-MM-DD usando el huso horario LOCAL del
 * dispositivo, no UTC. `toISOString()` siempre da la fecha en UTC — en un
 * huso horario detrás de UTC (ej. Argentina, UTC-3), pasada cierta hora de
 * la noche ya es "mañana" en UTC aunque localmente siga siendo hoy, lo que
 * hacía que la app mostrara el día equivocado según dónde/cuándo se abriera.
 */
export function fmtDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(d: Date, n: number): Date {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + n);
  return nd;
}
