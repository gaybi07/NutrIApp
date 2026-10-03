/**
 * Cómo salió un día contra el objetivo COMPLETO del día (kcal y proteína). Los porcentajes se miden contra el objetivo:
 *   violeta     -> kcal dentro del objetivo (o menos) y proteína en el objetivo o más.
 *   verde       -> kcal dentro del objetivo, pero proteína por debajo del objetivo (hasta 10% menos).
 *   amarillo    -> se pasó de kcal hasta un 10% y la proteína no bajó más de un 10%.
 *   rojo        -> falló por más de 10%: se pasó más de 10% de kcal o la proteína quedó más de 10% abajo.
 *   multicolor  -> falló por más de 30%: se pasó más de 30% de kcal o la proteína quedó más de 30% abajo.
 */
export type DayGoalStatus = "violeta" | "verde" | "amarillo" | "rojo" | "multicolor";

export function dayGoalStatus(kcal: number, kcalGoal: number, protein: number, proteinGoal: number): DayGoalStatus {
  const kcalRatio = kcalGoal > 0 ? kcal / kcalGoal : 0;
  const protRatio = proteinGoal > 0 ? protein / proteinGoal : 1;
  if (kcalRatio > 1.3 || protRatio < 0.7) return "multicolor";
  if (kcalRatio > 1.1 || protRatio < 0.9) return "rojo";
  if (kcalRatio > 1) return "amarillo";
  if (protRatio < 1) return "verde";
  return "violeta";
}

export const DAY_STATUS_LABEL: Record<DayGoalStatus, string> = {
  violeta: "Menos kcal y proteína cumplida",
  verde: "Kcal en objetivo, proteína un poco baja",
  amarillo: "Hasta 10% más de kcal",
  rojo: "Fallaste por más de 10%",
  multicolor: "Fallaste por más de 30%",
};
