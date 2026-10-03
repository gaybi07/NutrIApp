/**
 * Cómo salió un día contra el objetivo COMPLETO del día (kcal y proteína). De mejor a peor:
 *   brillante  -> violeta ultra brillante: kcal dentro del objetivo y proteína 15% o más por encima del objetivo.
 *   multicolor -> el mejor día: kcal dentro del objetivo (o menos) y proteína en el objetivo o más.
 *   violeta    -> kcal dentro del objetivo, pero la proteína quedó un poco abajo (hasta 10% menos).
 *   verde      -> se pasó de kcal hasta un 10% y la proteína no bajó más de un 10%.
 *   amarillo   -> falló por más de 10%: se pasó más de 10% de kcal o la proteína quedó más de 10% abajo.
 *   rojo       -> el peor día: falló por más de 30% (se pasó más de 30% de kcal o la proteína quedó más de 30% abajo).
 */
export type DayGoalStatus = "brillante" | "multicolor" | "violeta" | "verde" | "amarillo" | "rojo";

/** De mejor a peor, para ordenar la leyenda. */
export const DAY_STATUS_ORDER: DayGoalStatus[] = ["brillante", "multicolor", "violeta", "verde", "amarillo", "rojo"];

export function dayGoalStatus(kcal: number, kcalGoal: number, protein: number, proteinGoal: number): DayGoalStatus {
  const kcalRatio = kcalGoal > 0 ? kcal / kcalGoal : 0;
  const protRatio = proteinGoal > 0 ? protein / proteinGoal : 1;
  if (kcalRatio > 1.3 || protRatio < 0.7) return "rojo";
  if (kcalRatio > 1.1 || protRatio < 0.9) return "amarillo";
  if (kcalRatio > 1) return "verde";
  if (protRatio < 1) return "violeta";
  if (protRatio >= 1.15) return "brillante";
  return "multicolor";
}

export const DAY_STATUS_LABEL: Record<DayGoalStatus, string> = {
  brillante: "Día brillante: kcal en objetivo y 15% o más de proteína extra",
  multicolor: "Muy buen día: kcal en objetivo y proteína cumplida",
  violeta: "Kcal en objetivo, proteína un poco baja",
  verde: "Hasta 10% más de kcal",
  amarillo: "Fallaste por más de 10%",
  rojo: "Fallaste por más de 30%",
};
