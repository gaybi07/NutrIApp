/**
 * Cómo salió un día contra el objetivo COMPLETO del día, mirando kcal y proteína a la vez. Son cuatro franjas.
 * Se mide el peor de los dos desvíos: en kcal cuenta pasarse del objetivo, en proteína cuenta quedar por debajo.
 *   violeta   -> (brillante) kcal dentro del objetivo y proteína 15% o más por encima del objetivo.
 *   verde     -> cumplido: kcal dentro del objetivo y proteína en el objetivo.
 *   amarillo  -> falló por poco: el peor de los dos desvíos es de hasta 15%.
 *   rojo      -> falló: el peor desvío es de más de 15%.
 * Si cumple una cosa pero falla la otra por poco, queda en amarillo; si la falla por mucho, en rojo.
 */
export type DayGoalStatus = "violeta" | "verde" | "amarillo" | "rojo";

/** De mejor a peor, para ordenar la leyenda. */
export const DAY_STATUS_ORDER: DayGoalStatus[] = ["violeta", "verde", "amarillo", "rojo"];

/** Puntaje de cada franja, para promediar un mes. */
export const DAY_STATUS_SCORE: Record<DayGoalStatus, number> = { violeta: 3, verde: 2, amarillo: 1, rojo: 0 };

export function dayGoalStatus(kcal: number, kcalGoal: number, protein: number, proteinGoal: number): DayGoalStatus {
  const kcalOver = kcalGoal > 0 ? Math.max(0, kcal / kcalGoal - 1) : 0;
  const protUnder = proteinGoal > 0 ? Math.max(0, 1 - protein / proteinGoal) : 0;
  const worst = Math.max(kcalOver, protUnder);
  if (worst > 0.15) return "rojo";
  if (worst > 0) return "amarillo";
  if (proteinGoal > 0 && protein / proteinGoal >= 1.15) return "violeta";
  return "verde";
}

export const DAY_STATUS_LABEL: Record<DayGoalStatus, string> = {
  violeta: "Día brillante: kcal en objetivo y 15% o más de proteína extra",
  verde: "Día cumplido: kcal en objetivo y proteína cumplida",
  amarillo: "Fallaste por poco (hasta 15%) en kcal o proteína",
  rojo: "Fallaste por más de 15%",
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
