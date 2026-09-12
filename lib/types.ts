export type MealKey = "des" | "alm" | "mer" | "cen";
export type TrainingIntensity = "leve" | "moderado" | "exigente" | "fallo";
export type GoalMode = "perder" | "recomponer" | "aumentar";

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: "g" | "ml" | "u.";
}

export interface CalculatorProfile {
  actual: string;
  meta: string;
  altura: string;
  edad: string;
  sexo: "hombre" | "mujer";
  fecha: string;
  modo: GoalMode;
}

export interface TrainingSession {
  intensidad: TrainingIntensity;
  minutos: number;
}

/** Lun-Dom, en ese orden — usado por la rutina semanal (`TrainingSchedule`). */
export type Weekday = "lunes" | "martes" | "miercoles" | "jueves" | "viernes" | "sabado" | "domingo";

/** El índice coincide con `Date.getDay()` (0 = domingo). */
export const WEEKDAYS: Weekday[] = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  lunes: "Lunes",
  martes: "Martes",
  miercoles: "Miércoles",
  jueves: "Jueves",
  viernes: "Viernes",
  sabado: "Sábado",
  domingo: "Domingo",
};

/** Una serie de un ejercicio: series uniformes (mismo peso/reps para todas). */
export interface ExerciseEntry {
  nombre: string;
  series: number;
  repeticiones: number;
  peso?: number; // kg, opcional (ej. ejercicios con peso corporal)
}

/** Rutina reusable (ej. "Día A: Pecho/Tríceps") — plantilla de ejercicios, no un registro de un día puntual. */
export interface Routine {
  id: string;
  nombre: string;
  ejercicios: ExerciseEntry[];
}

/** Qué rutina corresponde a cada día de la semana — se repite todas las semanas hasta que se cambie. */
export type TrainingSchedule = Partial<Record<Weekday, string>>; // weekday -> Routine.id

/** Un alimento/plato individual dentro de una comida (ej. "Puré de papas" adentro de la Cena) — editable y borrable por separado. */
export interface MealItem {
  id: string;
  nombre: string;
  kcal: number;
  protein: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
}

export interface DayEntry {
  fecha: string; // YYYY-MM-DD
  desK: number;
  desP: number;
  desC?: number; // carbohidratos (g) — opcional para no romper registros viejos sin este dato
  desG?: number; // grasas (g)
  desF?: number; // fibra (g)
  almK: number;
  almP: number;
  almC?: number;
  almG?: number;
  almF?: number;
  merK: number;
  merP: number;
  merC?: number;
  merG?: number;
  merF?: number;
  cenK: number;
  cenP: number;
  cenC?: number;
  cenG?: number;
  cenF?: number;
  pasos: number;
  entreno: boolean;
  pesoKg?: number;
  suenoHoras?: number;
  entrenoMinutos?: number; // formato viejo: primer/único entrenamiento del día
  entrenoIntensidad?: TrainingIntensity; // formato viejo
  entrenamientos?: TrainingSession[]; // formato nuevo: soporta más de un entrenamiento por día
  ejercicios?: ExerciseEntry[]; // desglose real de lo entrenado ese día (series/reps/peso por ejercicio)
  alimentos?: string[]; // nombres de ingredientes comidos ese día (para diversidad de grupos alimenticios en Macros)
  desItems?: MealItem[]; // desglose editable del desayuno — la suma de estos da desK/desP/desC/desG/desF
  almItems?: MealItem[];
  merItems?: MealItem[];
  cenItems?: MealItem[];
}

export type WeekPlan = Record<string, Partial<Record<MealKey, string>>>; // fecha -> comida -> título de receta

/** Las 3 solapas de arriba que se pueden prender/apagar desde Preferencias — "inicio" no está acá porque siempre está fija. */
export type MainTab = "inicio" | "comidas" | "macros" | "actividad";

export const OPTIONAL_TABS: MainTab[] = ["macros", "comidas", "actividad"];
export const DEFAULT_ENABLED_TABS: MainTab[] = ["inicio", "comidas", "macros", "actividad"];

export type ThemeMode = "claro" | "oscuro" | "neon";

export interface Settings {
  goal: number; // kcal objetivo diario de consumo
  tdeeFallback: number; // gasto de referencia cuando no hay pasos cargados
  weeklyWeights?: Record<string, number>; // peso registrado por semana, usando el lunes como clave
  calculatorProfile?: CalculatorProfile;
  tourDone?: boolean; // si ya vio el tour guiado de la app (se muestra una sola vez, tras el onboarding)
  weekPlan?: WeekPlan; // planificador de comidas por día, se sincroniza entre dispositivos
  routines?: Routine[]; // rutinas de entrenamiento reusables
  trainingSchedule?: TrainingSchedule; // qué rutina toca cada día de la semana
  theme?: ThemeMode; // claro / oscuro / neon, elegido desde Preferencias
  enabledTabs?: MainTab[]; // qué solapas de arriba se muestran además de Inicio (que siempre está)
}

export const MEAL_LABELS: Record<MealKey, string> = {
  des: "Desayuno",
  alm: "Almuerzo",
  mer: "Merienda",
  cen: "Cena",
};

export const INTENSITY_STYLES: Record<
  TrainingIntensity | "ninguno",
  { label: string; background: string; color: string; description: string }
> = {
  ninguno: { label: "No entrené", background: "#F4F1E8", color: "#1C1B18", description: "Sin sesión de entrenamiento." },
  leve: { label: "Leve", background: "#4F8CC9", color: "#FFFFFF", description: "Actividad suave, con esfuerzo cómodo." },
  moderado: { label: "Moderado", background: "#B5533C", color: "#FFFFFF", description: "Esfuerzo sostenido, pero controlado." },
  exigente: { label: "Exigente", background: "#C9A227", color: "#1C1B18", description: "Sesión intensa, con bastante esfuerzo." },
  fallo: { label: "Al fallo", background: "#8A9A7C", color: "#1C1B18", description: "Series muy exigentes, cerca o al fallo muscular." },
};

export const emptyDay = (fecha: string): DayEntry => ({
  fecha,
  desK: 0, desP: 0, desC: 0, desG: 0, desF: 0,
  almK: 0, almP: 0, almC: 0, almG: 0, almF: 0,
  merK: 0, merP: 0, merC: 0, merG: 0, merF: 0,
  cenK: 0, cenP: 0, cenC: 0, cenG: 0, cenF: 0,
  pasos: 0,
  entreno: false,
});
