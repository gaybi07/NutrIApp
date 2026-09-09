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

export interface DayEntry {
  fecha: string; // YYYY-MM-DD
  desK: number;
  desP: number;
  almK: number;
  almP: number;
  merK: number;
  merP: number;
  cenK: number;
  cenP: number;
  pasos: number;
  entreno: boolean;
  pesoKg?: number;
  entrenoMinutos?: number;
  entrenoIntensidad?: TrainingIntensity;
}

export interface Settings {
  goal: number; // kcal objetivo diario de consumo
  tdeeFallback: number; // gasto de referencia cuando no hay pasos cargados
  weeklyWeights?: Record<string, number>; // peso registrado por semana, usando el lunes como clave
  calculatorProfile?: CalculatorProfile;
  tourDone?: boolean; // si ya vio el tour guiado de la app (se muestra una sola vez, tras el onboarding)
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
  desK: 0, desP: 0,
  almK: 0, almP: 0,
  merK: 0, merP: 0,
  cenK: 0, cenP: 0,
  pasos: 0,
  entreno: false,
});
