import { DayEntry, MealKey, MEAL_LABELS, TrainingIntensity, TrainingSession, GoalMode, ExerciseEntry, ExerciseSetEntry, Weekday, WEEKDAYS, MealItem, InventoryNutrition, WorkoutVerdict, TrainingSchedule, MuscleGroup, MUSCLE_GROUP_LABELS } from "./types";

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

const MEAL_SEQUENCE: MealKey[] = ["des", "alm", "mer", "cen"];

function timeBasedMeal(hour: number): MealKey {
  if (hour < 11) return "des";
  if (hour < 15) return "alm";
  if (hour < 19) return "mer";
  return "cen";
}

/**
 * Qué comida conviene sugerir por default al abrir "Registrar con IA": la
 * que corresponde a la hora actual, salvo que esa ya esté cargada — en ese
 * caso avanza a la siguiente de la secuencia (des→alm→mer→cen) que todavía
 * no tenga nada. Si las 4 principales ya están cargadas, cae en Colación
 * (que es justamente para lo que sobra de esas 4).
 */
export function suggestedMeal(entry: DayEntry | undefined, hour: number): MealKey {
  const start = timeBasedMeal(hour);
  if (!entry) return start;
  const startIdx = MEAL_SEQUENCE.indexOf(start);
  for (let i = 0; i < MEAL_SEQUENCE.length; i++) {
    const key = MEAL_SEQUENCE[(startIdx + i) % MEAL_SEQUENCE.length];
    const kcal = (entry[`${key}K` as keyof DayEntry] as number) || 0;
    if (kcal <= 0) return key;
  }
  return "col";
}

/** Total kcal consumidas en el día (suma de las 5 comidas). */
export function dayTotal(d: DayEntry): number {
  return (d.desK || 0) + (d.almK || 0) + (d.merK || 0) + (d.cenK || 0) + (d.colK || 0);
}

/** Total de proteína (g) consumida en el día. */
export function dayProt(d: DayEntry): number {
  return (d.desP || 0) + (d.almP || 0) + (d.merP || 0) + (d.cenP || 0) + (d.colP || 0);
}

/** Total de carbohidratos (g) consumidos en el día. */
export function dayCarbs(d: DayEntry): number {
  return (d.desC || 0) + (d.almC || 0) + (d.merC || 0) + (d.cenC || 0) + (d.colC || 0);
}

/** Total de grasas (g) consumidas en el día. */
export function dayFat(d: DayEntry): number {
  return (d.desG || 0) + (d.almG || 0) + (d.merG || 0) + (d.cenG || 0) + (d.colG || 0);
}

/** Total de fibra (g) consumida en el día. */
export function dayFiber(d: DayEntry): number {
  return (d.desF || 0) + (d.almF || 0) + (d.merF || 0) + (d.cenF || 0) + (d.colF || 0);
}

const ALL_MEAL_KEYS: MealKey[] = ["des", "alm", "mer", "cen", "col"];

/**
 * Densidad calórica promedio de lo comido en el día (kcal por gramo) --
 * pensada como una señal de "qué tan bien elegís los alimentos", no solo
 * cuánto comés. Más alto = comida más concentrada en calorías (frituras,
 * grasas, ultraprocesados); más bajo = alimentos con más agua/fibra
 * (verduras, frutas, proteínas magras). Solo cuenta los alimentos que
 * tienen gramos cargados -- null si ninguno los tiene todavía ese día.
 */
export function dayCaloricDensity(d: DayEntry): number | null {
  let kcal = 0;
  let gramos = 0;
  for (const meal of ALL_MEAL_KEYS) {
    for (const item of getMealItems(d, meal)) {
      if (item.gramos && item.gramos > 0) {
        kcal += item.kcal;
        gramos += item.gramos;
      }
    }
  }
  if (gramos <= 0) return null;
  return kcal / gramos;
}

/**
 * Desglose editable de una comida del día. Si ya tiene items guardados, los
 * devuelve tal cual. Si no (comidas cargadas antes de este desglose, o
 * importadas de un respaldo viejo), arma un único item "sin desglosar" a
 * partir del total agregado — así sigue siendo editable/borrable en vez de
 * quedar como un número fijo que no se puede tocar.
 */
export function getMealItems(entry: DayEntry, meal: MealKey): MealItem[] {
  const itemsKey = `${meal}Items` as keyof DayEntry;
  const items = entry[itemsKey] as MealItem[] | undefined;
  if (items && items.length > 0) return items;
  const kKey = `${meal}K` as keyof DayEntry;
  const kcal = (entry[kKey] as number) || 0;
  if (kcal <= 0) return [];
  const pKey = `${meal}P` as keyof DayEntry;
  const cKey = `${meal}C` as keyof DayEntry;
  const gKey = `${meal}G` as keyof DayEntry;
  const fKey = `${meal}F` as keyof DayEntry;
  return [
    {
      id: "legacy",
      nombre: "Comida cargada",
      kcal,
      protein: (entry[pKey] as number) || 0,
      carbs: (entry[cKey] as number) || 0,
      fat: (entry[gKey] as number) || 0,
      fiber: (entry[fKey] as number) || 0,
    },
  ];
}

/**
 * Nutrición real de una cantidad de un producto de alacena, a partir de su
 * valor "por 100g/100ml" (o "por unidad" si se mide en "u."). Compartida por
 * todo lo que descuenta de la alacena y lo suma a una comida a la vez
 * (MealFromAlacena, el escáner de productos) — una sola fórmula, no una
 * copia por pantalla.
 */
export function nutritionForAmount(
  item: { unit: "g" | "ml" | "u."; nutritionPer100g?: InventoryNutrition },
  amount: number
): InventoryNutrition | null {
  if (!item.nutritionPer100g) return null;
  const factor = item.unit === "u." ? amount : amount / 100;
  const n = item.nutritionPer100g;
  return {
    kcal: Math.round(n.kcal * factor),
    protein: Math.round(n.protein * factor),
    carbs: Math.round((n.carbs || 0) * factor),
    fat: Math.round((n.fat || 0) * factor),
    fiber: Math.round((n.fiber || 0) * factor),
  };
}

/** Conversión unidades↔gramos para alimentos con peso-por-unidad conocido
 * (tabla `foods`, ver lib/useFoods.ts) — para que alguien que no pesa la
 * comida pueda cargar "1 banana" y por atrás se sepa que son ~120 g. No
 * reemplaza a nutritionForAmount (que sigue usando "u." como "por unidad"
 * tal cual, sin pasar por gramos) — esto es solo para mostrar el
 * equivalente y para convertir ANTES de que la cantidad entre a un flujo
 * que sí trabaja en gramos. */
export function unitsToGrams(units: number, gramsPerUnit: number): number {
  return Math.round(units * gramsPerUnit);
}

export function gramsToUnits(grams: number, gramsPerUnit: number): number {
  if (gramsPerUnit <= 0) return 0;
  return Math.round((grams / gramsPerUnit) * 10) / 10; // 1 decimal -- "0.5 banana" tiene sentido, "0.53" no
}

/** Macros de una cantidad de un alimento de la tabla `foods` (siempre por
 * 100 g/ml) -- comparte la conversión "u." → gramos con nutritionForAmount,
 * pero esta necesita gramosPorUnidad porque `foods` no tiene un concepto de
 * "por unidad" propio como sí tiene un InventoryItem. Devuelve null si es
 * "u." y no se conoce el peso por unidad -- no hay forma honesta de
 * calcularlo. Usado tanto al desglosar un plato (IngredientBreakdown) como
 * al reusar una preparación guardada (AiEntryForm.usePreparacion). */
export function macrosForFoodQuantity(
  food: { kcal: number; protein: number; carbs: number; fat: number; fiber: number; gramosPorUnidad?: number },
  cantidad: number,
  unidad: "g" | "ml" | "u."
): { kcal: number; protein: number; carbs: number; fat: number; fiber: number; gramos: number } | null {
  const gramos = unidad === "u." ? (food.gramosPorUnidad ? cantidad * food.gramosPorUnidad : null) : cantidad;
  if (gramos == null) return null;
  const factor = gramos / 100;
  return {
    gramos: Math.round(gramos),
    kcal: Math.round(food.kcal * factor),
    protein: Math.round(food.protein * factor),
    carbs: Math.round(food.carbs * factor),
    fat: Math.round(food.fat * factor),
    fiber: Math.round(food.fiber * factor),
  };
}

/** Suma kcal/proteína/carbohidratos/grasas/fibra de una lista de items. */
export function sumMealItems(items: MealItem[]): { kcal: number; protein: number; carbs: number; fat: number; fiber: number } {
  return items.reduce(
    (acc, item) => ({
      kcal: acc.kcal + item.kcal,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + (item.carbs || 0),
      fat: acc.fat + (item.fat || 0),
      fiber: acc.fiber + (item.fiber || 0),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );
}

/** Marca un conjunto de items como un solo plato nombrado -- mismo grupoId
 * nuevo para todos, así MealsEditor los puede mostrar colapsados en una
 * sola línea en vez de una tarjeta por ingrediente. */
export function tagGroup(items: MealItem[], nombre: string): MealItem[] {
  const grupoId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return items.map((item) => ({ ...item, grupoId, grupoNombre: nombre }));
}

/** Agrupa una lista de items por `grupoId`, preservando el orden -- items
 * sueltos (sin grupoId) quedan cada uno en su propio grupo (`grupoId:
 * null`), items que comparten grupoId quedan juntos en uno solo. */
export function groupMealItems(items: MealItem[]): { grupoId: string | null; grupoNombre?: string; items: MealItem[] }[] {
  const groups: { grupoId: string | null; grupoNombre?: string; items: MealItem[] }[] = [];
  const byGrupoId = new Map<string, { grupoId: string | null; grupoNombre?: string; items: MealItem[] }>();
  for (const item of items) {
    if (!item.grupoId) {
      groups.push({ grupoId: null, items: [item] });
      continue;
    }
    let group = byGrupoId.get(item.grupoId);
    if (!group) {
      group = { grupoId: item.grupoId, grupoNombre: item.grupoNombre, items: [] };
      byGrupoId.set(item.grupoId, group);
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}

/** Reemplaza los items de una comida y recalcula sus totales agregados (K/P/C/G/F) a partir de ellos. */
export function applyMealItems(entry: DayEntry, meal: MealKey, items: MealItem[]): DayEntry {
  const sums = sumMealItems(items);
  return {
    ...entry,
    [`${meal}Items`]: items,
    [`${meal}K`]: sums.kcal,
    [`${meal}P`]: sums.protein,
    [`${meal}C`]: sums.carbs,
    [`${meal}G`]: sums.fat,
    [`${meal}F`]: sums.fiber,
  };
}

export interface MacroTargets {
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  proteinKcal: number;
  carbsKcal: number;
  fatKcal: number;
}

/**
 * Reparto de macros objetivo a partir del objetivo diario de kcal y la
 * proteína objetivo (por peso corporal, ver `proteinTargetForWeight`). Las
 * kcal que sobran después de la proteína se reparten entre carbohidratos y
 * grasas -- el reparto ya no es siempre 50/50, depende del modo:
 * - "aumentar" (volumen): más carbohidratos (65/35) — son el combustible
 *   principal para entrenar fuerte y sostener el estímulo de crecimiento.
 * - "perder" (déficit): también más carbohidratos (60/40) — con menos kcal
 *   totales, priorizar carbos ayuda a sostener el rendimiento y la saciedad;
 *   la grasa igual no baja de un piso razonable.
 * - "recomponer" (o sin modo): 50/50, reparto neutro.
 * La fibra no resta kcal (ya está incluida en los carbohidratos) — el
 * objetivo es la recomendación genérica de ~14g cada 1000 kcal (guía USDA),
 * no depende del peso ni del modo.
 */
export function macroTargets(goalKcal: number, proteinTargetG: number, modo?: GoalMode): MacroTargets {
  const proteinKcal = proteinTargetG * 4;
  const remaining = Math.max(0, goalKcal - proteinKcal);
  const carbShare = modo === "aumentar" ? 0.65 : modo === "perder" ? 0.6 : 0.5;
  const carbsKcal = remaining * carbShare;
  const fatKcal = remaining * (1 - carbShare);
  return {
    proteinG: proteinTargetG,
    carbsG: Math.round(carbsKcal / 4),
    fatG: Math.round(fatKcal / 9),
    fiberG: Math.round((goalKcal / 1000) * 14),
    proteinKcal: Math.round(proteinKcal),
    carbsKcal: Math.round(carbsKcal),
    fatKcal: Math.round(fatKcal),
  };
}

/** Peso de referencia cuando no hay ningún dato real (ni de ese día, ni
 * semanal, ni de la calculadora) -- mismo valor que ya se usaba como
 * fallback en app/page.tsx (currentWeightKg). */
export const DEFAULT_PESO_KG = 75;

/** Kcal quemadas por paso, por kg de peso corporal -- ~0,04 kcal/kg cada 100
 * pasos es la estimación estándar de gasto caminando (fuente: aproximación
 * conversacional habitual, no una tabla clínica; ver comentario de
 * estimateGasto). Antes era un coeficiente fijo (0.04 kcal/paso) igual para
 * cualquier persona -- alguien de 100kg y alguien de 50kg quemaban "lo
 * mismo" por paso, lo cual no tiene sentido: caminar cuesta más caro
 * metabólicamente cuanto más pesás. */
const STEP_KCAL_PER_KG = 0.0004;

/**
 * Estima el gasto calórico diario (TDEE) en base a pasos + si hubo entrenamiento.
 * Si el día no tiene pasos cargados, cae al valor de referencia de settings.
 *
 * 5.000 pasos es el "piso neutral" -- se asume que ese movimiento mínimo ya
 * está adentro de `tdeeFallback` (que hoy usa un factor de actividad fijo
 * de sedentario, 1.2x el metabolismo basal). Por arriba o por debajo de esa
 * marca, el ajuste ahora escala con el peso de la persona (`pesoKg`) en vez
 * de ser un coeficiente fijo para cualquiera -- y el techo/piso del ajuste
 * escala igual, así alguien más pesado no se queda pisando el límite antes
 * que alguien liviano solo porque camina lo mismo.
 *
 * `pesoKg` es opcional para no romper ningún llamado viejo (cae a
 * DEFAULT_PESO_KG) -- pero para que el número sea real hay que pasar el
 * peso de ESE día puntual (ver `resolveWeightForDate`), no siempre el peso
 * de hoy, sobre todo mirando hacia atrás en el historial.
 */
export function estimateGasto(d: DayEntry, tdeeFallback: number, pesoKg: number = DEFAULT_PESO_KG): number {
  const pasos = Math.max(0, d.pasos || 0);
  const stepCoef = pesoKg * STEP_KCAL_PER_KG;
  // Sin techo a propósito -- caminar mucho de verdad (>15-20k pasos) suma
  // proporcional, sin plancharse. El piso de abajo se mantiene: un día muy
  // sedentario no resta más de lo que ya restaba, para no exagerar el
  // castigo por un día flojo.
  const pisoMagnitude = pesoKg * 4;
  const ajustePasos = pasos > 0 ? Math.max(-pisoMagnitude, (pasos - 5000) * stepCoef) : 0;
  const ajusteEntrenamiento = estimateTrainingCalories(d);
  return Math.round(Math.max(0, tdeeFallback + ajustePasos + ajusteEntrenamiento));
}

/**
 * Peso a usar para el gasto de UN día puntual -- el propio (si ese
 * DayEntry.pesoKg está cargado), sino el peso semanal cargado esa semana o
 * la más reciente ANTERIOR a esa fecha (no una futura -- no tendría sentido
 * usar un peso que todavía no tenías), sino la más antigua que exista (mejor
 * que asumir el peso de HOY para un día de hace meses), sino el fallback.
 */
export function resolveWeightForDate(
  fecha: string,
  days: DayEntry[],
  weeklyWeights: Record<string, number> | undefined,
  fallback: number = DEFAULT_PESO_KG
): number {
  const ownDay = days.find((d) => d.fecha === fecha);
  if (ownDay?.pesoKg) return ownDay.pesoKg;
  const weekKeys = Object.keys(weeklyWeights || {}).sort();
  if (weekKeys.length === 0) return fallback;
  const weekOf = fmtDate(isoMonday(fecha));
  const atOrBefore = [...weekKeys].reverse().find((k) => k <= weekOf);
  if (atOrBefore) return weeklyWeights![atOrBefore];
  return weeklyWeights![weekKeys[0]];
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

/** Volumen de un solo ejercicio (series × repeticiones × peso). Ejercicios
 * sin peso (corporal) suman igual con peso 1, para que sigan contando en la
 * tendencia. Si hay `sets` (detalle real serie por serie), se usa eso en vez
 * del resumen series/repeticiones/peso. */
function exerciseVolume(e: ExerciseEntry): number {
  if (e.sets && e.sets.length > 0) return e.sets.reduce((s, set) => s + set.repeticiones * (set.peso || 1), 0);
  return e.series * e.repeticiones * (e.peso || 1);
}

/** Volumen total entrenado, sumado entre todos los ejercicios de ese día (con o sin grupo muscular etiquetado). */
export function totalVolume(ejercicios: ExerciseEntry[] | undefined): number {
  if (!ejercicios || ejercicios.length === 0) return 0;
  return ejercicios.reduce((total, e) => total + exerciseVolume(e), 0);
}

/** Volumen entrenado ese día, agrupado por grupo muscular -- solo cuenta los
 * ejercicios que tienen `grupoMuscular` etiquetado (los agregados a mano sin
 * pasar por la biblioteca quedan afuera del desglose, aunque sí cuentan en
 * `totalVolume`). Devuelve los 6 grupos siempre, en 0 si no hubo nada. */
export function volumeByMuscleGroup(ejercicios: ExerciseEntry[] | undefined): Record<MuscleGroup, number> {
  const result = Object.fromEntries(Object.keys(MUSCLE_GROUP_LABELS).map((g) => [g, 0])) as Record<MuscleGroup, number>;
  if (!ejercicios) return result;
  for (const e of ejercicios) {
    if (!e.grupoMuscular) continue;
    result[e.grupoMuscular] += exerciseVolume(e);
  }
  return result;
}

/** Compara el volumen por grupo muscular de la semana seleccionada (`weekDates`)
 * contra la semana inmediatamente anterior -- para ver si el estímulo por
 * zona sube, se sostiene o cae, semana a semana. Busca en TODO `days` (no
 * solo `weekDays`) porque la semana anterior puede no estar cargada como
 * prop en el tab que llama a esto. */
export function computeMuscleGroupVolumeTrend(
  days: DayEntry[],
  weekDates: string[]
): Record<MuscleGroup, { actual: number; anterior: number }> {
  const groups = Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[];
  const result = Object.fromEntries(groups.map((g) => [g, { actual: 0, anterior: 0 }])) as Record<
    MuscleGroup,
    { actual: number; anterior: number }
  >;
  if (weekDates.length === 0) return result;

  const actualSet = new Set(weekDates);
  const previousDates = weekDates.map((fecha) => fmtDate(addDays(new Date(`${fecha}T00:00:00`), -7)));
  const previousSet = new Set(previousDates);

  for (const day of days) {
    if (!actualSet.has(day.fecha) && !previousSet.has(day.fecha)) continue;
    const volumes = volumeByMuscleGroup(day.ejercicios);
    const bucket = actualSet.has(day.fecha) ? "actual" : "anterior";
    for (const group of groups) result[group][bucket] += volumes[group];
  }
  return result;
}

/** Cómo salió un ejercicio del entrenamiento en vivo comparado contra lo planificado en la
 * rutina: si el volumen real (según las series cargadas) superó, empató o quedó por debajo
 * del volumen planificado (series x reps x peso de la plantilla). */
export function compareExerciseVolume(planned: ExerciseEntry, sets: ExerciseSetEntry[]): WorkoutVerdict {
  const plannedVolume = planned.series * planned.repeticiones * (planned.peso || 1);
  const actualVolume = sets.reduce((s, set) => s + set.repeticiones * (set.peso || 1), 0);
  if (plannedVolume <= 0) return "similar";
  const ratio = actualVolume / plannedVolume;
  if (ratio > 1.05) return "mejor";
  if (ratio < 0.95) return "peor";
  return "similar";
}

/** Sugerencia de peso/nota para la próxima vez que se entrene este ejercicio, en base a
 * cómo se sintieron las series completadas ahora (mayoría de intensidad reportada). */
export function suggestNextSession(sets: ExerciseSetEntry[]): { nota: string; pesoSugerido?: number } {
  const done = sets.filter((s) => s.repeticiones > 0);
  if (done.length === 0) return { nota: "No se completaron series — probá de nuevo la próxima." };
  const counts: Record<TrainingIntensity, number> = { leve: 0, moderado: 0, exigente: 0, fallo: 0 };
  let pesoRef: number | undefined;
  for (const s of done) {
    counts[s.intensidad]++;
    if (s.peso != null) pesoRef = pesoRef == null ? s.peso : Math.max(pesoRef, s.peso);
  }
  const mayoria = (Object.entries(counts) as [TrainingIntensity, number][]).sort((a, b) => b[1] - a[1])[0][0];
  if (mayoria === "leve") {
    return {
      nota: "Te resultó liviano — para la próxima probá con más peso.",
      pesoSugerido: pesoRef != null ? Math.round((pesoRef + 2.5) * 2) / 2 : undefined,
    };
  }
  if (mayoria === "fallo") {
    return {
      nota: "Llegaste al fallo — la próxima mantené el peso o bajalo un poco.",
      pesoSugerido: pesoRef != null ? Math.round((pesoRef - 2.5) * 2) / 2 : undefined,
    };
  }
  if (mayoria === "exigente") {
    return { nota: "Estuvo exigente — mantené el peso y sumá reps si podés.", pesoSugerido: pesoRef };
  }
  return { nota: "Buen nivel, controlado — mantené el peso.", pesoSugerido: pesoRef };
}

/** Día de la semana (`Weekday`) de una fecha YYYY-MM-DD, en huso horario local. */
export function weekdayOf(fecha: string): Weekday {
  return WEEKDAYS[new Date(`${fecha}T00:00:00`).getDay()];
}

/** Ajusta el objetivo base con la actividad registrada en ese día. */
export function dayGoal(d: DayEntry, goal: number, tdeeFallback: number, pesoKg?: number): number {
  return Math.round(Math.max(0, goal + estimateGasto(d, tdeeFallback, pesoKg) - tdeeFallback));
}

/** Déficit (positivo) o superávit (negativo) de un día dado. */
export function dayDeficit(d: DayEntry, tdeeFallback: number, pesoKg?: number): number {
  return estimateGasto(d, tdeeFallback, pesoKg) - dayTotal(d);
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

/** `weeklyWeights`/`allDays`/`fallbackWeightKg` son opcionales para no romper
 * llamadas viejas -- sin ellos, cae al peso fijo de siempre (DEFAULT_PESO_KG),
 * mismo comportamiento que antes de que el gasto por pasos escalara con el
 * peso real. Pasándolos, cada día de la semana usa SU peso resuelto (ver
 * resolveWeightForDate), no el de hoy -- así mirar hacia atrás en el
 * historial usa el peso que tenías en ese momento, no el actual. */
export function summarizeWeek(
  days: DayEntry[],
  tdeeFallback: number,
  goal: number,
  weeklyWeights?: Record<string, number>,
  fallbackWeightKg: number = DEFAULT_PESO_KG,
  allDays: DayEntry[] = days
): WeekSummary {
  const present = days.filter((d) => dayTotal(d) > 0);
  const n = present.length || 1;
  const pesoFor = (d: DayEntry) => resolveWeightForDate(d.fecha, allDays, weeklyWeights, fallbackWeightKg);
  const avgKcal = Math.round(present.reduce((a, d) => a + dayTotal(d), 0) / n);
  const avgProt = Math.round(present.reduce((a, d) => a + dayProt(d), 0) / n);
  const avgSteps = Math.round(present.reduce((a, d) => a + (d.pasos || 0), 0) / n);
  const gastos = present.map((d) => estimateGasto(d, tdeeFallback, pesoFor(d)));
  const avgGasto = Math.round(gastos.reduce((a, b) => a + b, 0) / (gastos.length || 1));
  const avgGoal = Math.round(present.reduce((a, d) => a + dayGoal(d, goal, tdeeFallback, pesoFor(d)), 0) / n);
  const trainedDays = present.filter((d) => d.entreno).length;
  const deficitAcumulado = present.reduce((a, d) => a + dayDeficit(d, tdeeFallback, pesoFor(d)), 0);
  const avgDeficit = Math.round(deficitAcumulado / (present.length || 1));
  return { avgKcal, avgProt, avgSteps, avgGasto, avgGoal, avgDeficit, trainedDays, totalDays: present.length, deficitAcumulado };
}

/** Gramos de proteína cada 100 kcal — métrica de "eficiencia" usada en el ranking. */
export function proteinDensity(kcal: number, protein: number): number | null {
  if (kcal <= 0) return null;
  return (protein * 100) / kcal;
}

export type ProteinQualityTier = "excelente" | "bueno" | "medio" | "malo";

/**
 * Umbral único de densidad proteica, compartido por el ranking de días y el
 * detalle por comida — así un mismo valor siempre se clasifica igual en toda
 * la app (antes el ranking usaba "mejores 3 / peores 3" relativos mientras el
 * detalle usaba este umbral fijo, y podían contradecirse).
 * "excelente" es un escalón extra por encima de "bueno", reservado a
 * comidas realmente sobresalientes (no cualquier comida que ya cumple).
 */
export function proteinQualityTier(density: number): ProteinQualityTier {
  if (density >= 5) return "excelente";
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
  const mealKeys: MealKey[] = ["des", "alm", "mer", "cen", "col"];
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
  // Tope acordado: no más de 1kg por semana, punto -- un % del gasto o
  // del peso corporal castigaba de más a alguien con más peso/gasto
  // (ej. 0.72kg/semana se bloqueaba igual por pasar el 30% del gasto,
  // aunque el ritmo en sí fuera seguro).
  const esAgresivo = kgPorSemana > 1;

  return { diasRestantes, kgABajar, deficitDiarioNecesario, kcalObjetivoSugerido, pctDelGasto, kgPorSemana, esAgresivo };
}

export interface GoalProgressInfo {
  metaKg: number;
  /** Peso con el que se armó el objetivo (calculatorProfile.actual) -- 0 en
   * "recomponer", que no tiene punto de partida de peso relevante. */
  actualKg: number;
  modo: "perder" | "aumentar" | "recomponer";
  fechaObjetivo: string;
  diasRestantes: number; // negativo si la fecha ya pasó
  kgTotalPlan: number; // lo que había que bajar/subir en total, desde que se armó el objetivo
  kgYaLogrados: number; // progreso real hecho hasta ahora (puede ser negativo si fue para el otro lado)
  kgRestantes: number; // lo que falta desde el peso actual
  kgPorSemanaNecesario: number | null; // ritmo necesario desde HOY para llegar a tiempo (null si ya no hay margen)
  ritmoRealSemanal: number | null; // kg ganados/perdidos en la dirección correcta esta semana (null si falta el dato)
  yaLlego: boolean;
  proteinTargetG: number; // objetivo diario de proteína -- el único dato útil que sí aplica en "recomponer"
  goalKcal: number; // objetivo diario de kcal
}

/**
 * Progreso real hacia el objetivo de peso cargado en la calculadora,
 * contrastado con el ritmo que hacía falta -- para el resumen motivacional
 * de Inicio. A diferencia de calcGoalDeficit (que es una herramienta de
 * validación puntual), esto se recalcula todos los días con el peso actual.
 * "recomponer" no tiene una dirección de peso clara (no hay meta de peso),
 * así que devuelve un resumen simplificado: solo kcal + proteína objetivo,
 * sin barra de progreso ni ritmo semanal.
 */
export function computeGoalProgress(
  profile: { actual: string; meta: string; fecha: string; modo: GoalMode },
  currentWeightKg: number,
  weightTrendKg: number | null,
  proteinTargetG: number,
  goalKcal: number,
  /** El peso con el que arrancó el plan de VERDAD (el primer peso semanal
   * cargado), NO `profile.actual` -- ese campo se pisa cada vez que se
   * vuelve a correr la calculadora (por ej. para ajustar las kcal a mitad
   * de camino), así que como "punto de partida" para medir el progreso
   * real queda mintiendo con el peso más reciente en vez del inicial. Si no
   * hay historial todavía, cae a `profile.actual` como siempre. */
  startingWeightKg?: number
): GoalProgressInfo | null {
  if (profile.modo === "recomponer") {
    return {
      metaKg: 0,
      actualKg: 0,
      modo: "recomponer",
      fechaObjetivo: "",
      diasRestantes: 0,
      kgTotalPlan: 0,
      kgYaLogrados: 0,
      kgRestantes: 0,
      kgPorSemanaNecesario: null,
      ritmoRealSemanal: null,
      yaLlego: false,
      proteinTargetG,
      goalKcal,
    };
  }
  if (profile.modo !== "perder" && profile.modo !== "aumentar") return null;
  const actual = startingWeightKg ?? Number(profile.actual);
  const meta = Number(profile.meta);
  if (!actual || !meta || actual === meta) return null;

  const modo = profile.modo;
  const signo = modo === "perder" ? -1 : 1; // hacia dónde tiene que moverse el peso para ir bien
  const kgTotalPlan = Math.abs(meta - actual);
  const kgYaLogrados = (currentWeightKg - actual) * signo;
  const kgRestantes = Math.max(0, (currentWeightKg - meta) * -signo);
  const yaLlego = modo === "perder" ? currentWeightKg <= meta : currentWeightKg >= meta;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const objetivo = new Date(`${profile.fecha}T00:00:00`);
  const diasRestantes = Math.round((objetivo.getTime() - hoy.getTime()) / 86400000);

  const kgPorSemanaNecesario = !yaLlego && diasRestantes > 0 ? kgRestantes / (diasRestantes / 7) : null;
  const ritmoRealSemanal = weightTrendKg == null ? null : weightTrendKg * signo;

  return {
    metaKg: meta,
    actualKg: actual,
    modo,
    fechaObjetivo: profile.fecha,
    diasRestantes,
    kgTotalPlan,
    kgYaLogrados,
    kgRestantes,
    kgPorSemanaNecesario,
    ritmoRealSemanal,
    yaLlego,
    proteinTargetG,
    goalKcal,
  };
}

export interface TrainingGoalInfo {
  scheduledDays: number; // días de la semana con rutina asignada (el "objetivo" sale solo de tu propia planificación)
  trainedDaysThisWeek: number;
  onTrack: boolean;
}

/** Objetivo de entrenamiento = tu propia planificación semanal (cuántos días
 * tenés rutina asignada) contra lo que de verdad entrenaste esta semana.
 * No hace falta configurar nada nuevo -- se deriva de trainingSchedule. */
export function computeTrainingGoal(schedule: TrainingSchedule, weekDays: (DayEntry | null)[]): TrainingGoalInfo | null {
  const scheduledDays = Object.keys(schedule).length;
  if (scheduledDays === 0) return null;
  const trainedDaysThisWeek = weekDays.filter((d) => d && getTrainingSessions(d).length > 0).length;
  return { scheduledDays, trainedDaysThisWeek, onTrack: trainedDaysThisWeek >= scheduledDays };
}

/** Cuántas semanas hacen falta cargadas (peso semanal) para que el cruce
 * comida-entrenamiento deje de ser ruido estadístico. */
export const MIN_WEEKS_FOR_FOOD_TRAINING_INSIGHT = 3;

export interface FoodTrainingInsight {
  weeksLoaded: number;
  weeksNeeded: number;
  unlocked: boolean;
  trainedDaysCount: number;
  restDaysCount: number;
  avgProteinTrained: number | null;
  avgProteinRest: number | null;
  avgKcalTrained: number | null;
  avgKcalRest: number | null;
}

/**
 * Compara, a lo largo de TODO lo cargado (no solo la semana en curso),
 * cuánta proteína/kcal comés en promedio los días que entrenás vs. los
 * días de descanso -- para ver si te estás quedando corto de comida para
 * lo que entrenás. Se "desbloquea" recién con unas cuantas semanas de
 * datos (MIN_WEEKS_FOR_FOOD_TRAINING_INSIGHT) para que la comparación no
 * sea ruido de una sola semana atípica.
 */
export function computeFoodTrainingInsight(days: DayEntry[], weeklyWeights: Record<string, number> | undefined): FoodTrainingInsight {
  const weeksLoaded = Object.keys(weeklyWeights || {}).length;
  const unlocked = weeksLoaded >= MIN_WEEKS_FOR_FOOD_TRAINING_INSIGHT;
  const base: FoodTrainingInsight = {
    weeksLoaded,
    weeksNeeded: MIN_WEEKS_FOR_FOOD_TRAINING_INSIGHT,
    unlocked,
    trainedDaysCount: 0,
    restDaysCount: 0,
    avgProteinTrained: null,
    avgProteinRest: null,
    avgKcalTrained: null,
    avgKcalRest: null,
  };
  if (!unlocked) return base;

  const withFood = days.filter((d) => dayTotal(d) > 0);
  const trained = withFood.filter((d) => getTrainingSessions(d).length > 0);
  const rest = withFood.filter((d) => getTrainingSessions(d).length === 0);
  const avg = (arr: DayEntry[], fn: (d: DayEntry) => number) =>
    arr.length ? Math.round(arr.reduce((sum, d) => sum + fn(d), 0) / arr.length) : null;

  return {
    ...base,
    trainedDaysCount: trained.length,
    restDaysCount: rest.length,
    avgProteinTrained: avg(trained, dayProt),
    avgProteinRest: avg(rest, dayProt),
    avgKcalTrained: avg(trained, dayTotal),
    avgKcalRest: avg(rest, dayTotal),
  };
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

/**
 * Piso de kcal/día por debajo del cual no se sugiere un objetivo, sin importar
 * cuánto falte bajar — comer menos que esto de forma sostenida es un riesgo
 * para la salud, no solo para la masa muscular.
 */
export const MIN_SAFE_KCAL: Record<"hombre" | "mujer", number> = { hombre: 1500, mujer: 1200 };

export interface GoalComputation {
  basal: number;
  gastoBase: number;
  objetivo: number;
  detalle: string;
  deficit: GoalCalcResult | null;
  /** true si el plan es demasiado agresivo o queda por debajo del piso
   * saludable — la UI no debería dejar aplicar este objetivo tal cual. */
  bloqueado: boolean;
  motivoBloqueo?: string;
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

  let bloqueado = false;
  let motivoBloqueo: string | undefined;
  if (modo === "perder" && deficit) {
    if (deficit.esAgresivo) {
      bloqueado = true;
      motivoBloqueo = `Ese ritmo (${deficit.kgPorSemana.toFixed(2)}kg por semana, ${Math.round(deficit.pctDelGasto)}% de tu gasto) es demasiado agresivo — con un déficit así arriesgás perder masa muscular además de grasa. Elegí una fecha más lejana o un peso objetivo menos exigente.`;
    } else if (objetivo < MIN_SAFE_KCAL[sexo]) {
      bloqueado = true;
      motivoBloqueo = `Ese objetivo (${objetivo.toLocaleString("es-AR")} kcal/día) queda por debajo del mínimo saludable (${MIN_SAFE_KCAL[sexo].toLocaleString("es-AR")} kcal/día) — comer menos que eso de forma sostenida no es seguro. Elegí una fecha más lejana.`;
    }
  }

  return { basal, gastoBase, objetivo, detalle, deficit, bloqueado, motivoBloqueo };
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

/**
 * Cuántas semanas SEGUIDAS (contando hacia atrás desde weekKey) tenés peso
 * cargado -- compartida por la tarjeta de peso semanal y cualquier resumen
 * compacto (ej. la franja fija de arriba), para que ambos muestren siempre
 * la misma racha.
 */
/** El primer peso que se cargó de verdad, mirando tanto `weeklyWeights`
 * (clave = lunes de esa semana) como el `pesoKg` de cualquier DayEntry --
 * es el ancla correcta para "cuánto avancé desde que empecé", a diferencia
 * de `calculatorProfile.actual`, que se pisa cada vez que se vuelve a
 * correr la calculadora. */
export function earliestLoggedWeight(days: { fecha: string; pesoKg?: number }[], weeklyWeights: Record<string, number> | undefined): number | null {
  const weekKeys = Object.keys(weeklyWeights || {}).sort();
  const earliestWeeklyKey = weekKeys[0];
  const earliestWeekly = earliestWeeklyKey ? { fecha: earliestWeeklyKey, peso: weeklyWeights![earliestWeeklyKey] } : null;

  const daysWithWeight = days.filter((d) => d.pesoKg != null).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const earliestDaily = daysWithWeight[0] ? { fecha: daysWithWeight[0].fecha, peso: daysWithWeight[0].pesoKg! } : null;

  if (earliestWeekly && earliestDaily) {
    return earliestWeekly.fecha <= earliestDaily.fecha ? earliestWeekly.peso : earliestDaily.peso;
  }
  return (earliestWeekly || earliestDaily)?.peso ?? null;
}

export function weightStreak(weights: Record<string, number>, weekKey: string): number {
  let streak = 0;
  let cursor = weekKey;
  while (weights[cursor] != null) {
    streak += 1;
    cursor = fmtDate(addDays(new Date(`${cursor}T00:00:00`), -7));
  }
  return streak;
}
