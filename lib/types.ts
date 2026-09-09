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
}

export const MEAL_LABELS: Record<MealKey, string> = {
  des: "Desayuno",
  alm: "Almuerzo",
  mer: "Merienda",
  cen: "Cena",
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
