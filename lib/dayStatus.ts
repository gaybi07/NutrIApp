/**
 * Cómo salió un día contra el objetivo COMPLETO del día, mirando kcal y proteína a la vez. Son cuatro franjas:
 *   violeta   -> (brillante) kcal dentro del objetivo y proteína 15% o más por encima del objetivo.
 *   verde     -> cumplido: kcal dentro del objetivo y proteína a 95% del objetivo o más (hasta 5% menos se acepta).
 *   amarillo  -> proteína entre 75% y 95% del objetivo, o kcal pasadas hasta 10% (con la proteína a 75% o más).
 *   rojo      -> kcal pasadas más de 10%, o proteína por debajo del 75% del objetivo.
 * Cuando una cosa se cumple y la otra falla, manda la peor de las dos.
 */
export type DayGoalStatus = "violeta" | "verde" | "amarillo" | "rojo";

/** De mejor a peor, para ordenar la leyenda. */
export const DAY_STATUS_ORDER: DayGoalStatus[] = ["violeta", "verde", "amarillo", "rojo"];

/** Puntaje de cada franja, para promediar un mes. */
export const DAY_STATUS_SCORE: Record<DayGoalStatus, number> = { violeta: 3, verde: 2, amarillo: 1, rojo: 0 };

export function dayGoalStatus(kcal: number, kcalGoal: number, protein: number, proteinGoal: number): DayGoalStatus {
  const kcalRatio = kcalGoal > 0 ? kcal / kcalGoal : 0;
  const protRatio = proteinGoal > 0 ? protein / proteinGoal : 1;
  if (kcalRatio > 1.1 || protRatio < 0.75) return "rojo";
  if (kcalRatio > 1 || protRatio < 0.95) return "amarillo";
  if (protRatio >= 1.15) return "violeta";
  return "verde";
}

export const DAY_STATUS_LABEL: Record<DayGoalStatus, string> = {
  violeta: "Día brillante: kcal en objetivo y 15% o más de proteína extra",
  verde: "Día cumplido: kcal en objetivo y proteína al 95% o más",
  amarillo: "Proteína entre 75% y 95%, o hasta 10% más de kcal",
  rojo: "Más de 10% de kcal de más, o proteína por debajo del 75%",
};

/**
 * Color de un mes: promedio de las franjas de sus días cerrados con datos. Hace falta un mínimo de días para dar color
 * (antes dice "juntando datos"). Cuanto más violeta, mejor el mes.
 */
export function monthStatusFrom(statuses: DayGoalStatus[], minDays = 7): { status: DayGoalStatus | null; counted: number; avg: number } {
  const counted = statuses.length;
  if (counted === 0) return { status: null, counted, avg: 0 };
  const avg = statuses.reduce((s, x) => s + DAY_STATUS_SCORE[x], 0) / counted;
  if (counted < minDays) return { status: null, counted, avg };
  const status: DayGoalStatus = avg >= 2.4 ? "violeta" : avg >= 1.6 ? "verde" : avg >= 0.8 ? "amarillo" : "rojo";
  return { status, counted, avg };
}

/** Escala de las kilocalorías solas (el fondo del cuadrado): justo en el objetivo (95% a 100%), dentro del objetivo, pasadas hasta 10%, o pasadas más de 10%. */
export type KcalStatus = "violeta" | "verde" | "amarillo" | "rojo";

export function dayKcalStatus(kcal: number, kcalGoal: number): KcalStatus {
  const ratio = kcalGoal > 0 ? kcal / kcalGoal : 0;
  if (ratio > 1.1) return "rojo";
  if (ratio > 1) return "amarillo";
  if (ratio >= 0.95) return "violeta";
  return "verde";
}

/** Escala de la proteína sola (la manito): 15% o más extra, 95% o más, entre 75% y 95%, o por debajo de 75%. */
export function dayProteinStatus(protein: number, proteinGoal: number): DayGoalStatus {
  const ratio = proteinGoal > 0 ? protein / proteinGoal : 1;
  if (ratio < 0.75) return "rojo";
  if (ratio < 0.95) return "amarillo";
  if (ratio >= 1.15) return "violeta";
  return "verde";
}

export const KCAL_STATUS_LABEL: Record<KcalStatus, string> = {
  violeta: "Kcal justo en el objetivo (95% a 100%)",
  verde: "Kcal dentro del objetivo (menos de 95%)",
  amarillo: "Hasta 10% más de kcal",
  rojo: "Más de 10% de kcal de más",
};

export const PROTEIN_STATUS_LABEL: Record<DayGoalStatus, string> = {
  violeta: "Proteína 15% o más por encima",
  verde: "Proteína al 95% o más",
  amarillo: "Proteína entre 75% y 95%",
  rojo: "Proteína por debajo del 75%",
};
