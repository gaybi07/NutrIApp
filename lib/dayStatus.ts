/**
 * Cómo salió un día contra el objetivo COMPLETO del día (kcal y proteína). De mejor a peor:
 *   brillante      -> violeta ultra brillante: kcal dentro del objetivo y proteína 15% o más por encima del objetivo.
 *   verdeBrillante -> verde brillante: kcal dentro del objetivo y proteína cumplida.
 *   celeste        -> kcal dentro del objetivo, pero la proteína quedó un poco abajo (hasta 10% menos).
 *   amarillo       -> se pasó de kcal hasta un 10% (y la proteína no bajó más de 10%).
 *   naranja        -> falló por más de 10%: se pasó más de 10% de kcal o la proteína quedó más de 10% abajo.
 *   rojo           -> el peor día: falló por más de 30% (kcal o proteína).
 */
export type DayGoalStatus = "brillante" | "verdeBrillante" | "celeste" | "amarillo" | "naranja" | "rojo";

/** De mejor a peor, para ordenar la leyenda. */
export const DAY_STATUS_ORDER: DayGoalStatus[] = ["brillante", "verdeBrillante", "celeste", "amarillo", "naranja", "rojo"];

export function dayGoalStatus(kcal: number, kcalGoal: number, protein: number, proteinGoal: number): DayGoalStatus {
  const kcalRatio = kcalGoal > 0 ? kcal / kcalGoal : 0;
  const protRatio = proteinGoal > 0 ? protein / proteinGoal : 1;
  if (kcalRatio > 1.3 || protRatio < 0.7) return "rojo";
  if (kcalRatio > 1.1 || protRatio < 0.9) return "naranja";
  if (kcalRatio > 1) return "amarillo";
  if (protRatio < 1) return "celeste";
  if (protRatio >= 1.15) return "brillante";
  return "verdeBrillante";
}

export const DAY_STATUS_LABEL: Record<DayGoalStatus, string> = {
  brillante: "Día brillante: kcal en objetivo y 15% o más de proteína extra",
  verdeBrillante: "Día cumplido: kcal en objetivo y proteína cumplida",
  celeste: "Kcal en objetivo, proteína un poco baja",
  amarillo: "Hasta 10% más de kcal",
  naranja: "Fallaste por más de 10%",
  rojo: "Día muy malo: fallaste por más de 30%",
};
