export type MealKey = "des" | "alm" | "mer" | "cen";

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
}

export interface Settings {
  goal: number; // kcal objetivo diario de consumo
  tdeeFallback: number; // gasto de referencia cuando no hay pasos cargados
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
