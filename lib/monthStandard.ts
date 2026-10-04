import { DayEntry } from "@/lib/types";
import { dayGoal, dayProt, dayTotal } from "@/lib/calculations";
import { DayGoalStatus, KcalStatus, dayGoalStatus, dayKcalStatus, dayProteinStatus, monthStatusFrom } from "@/lib/dayStatus";

export interface MonthStandard {
  /** AAAA-MM */
  month: string;
  status: DayGoalStatus | null;
  counted: number;
  avg: number;
  /** Color del mes solo en kilocalorías (el fondo del estandarte) y solo en proteína (la franja de arriba). */
  kcalStatus: KcalStatus | null;
  proteinStatus: DayGoalStatus | null;
  /** Un renglón por día cerrado con datos: el patrón del estandarte. */
  daysDetail: { fecha: string; kcal: KcalStatus; protein: DayGoalStatus }[];
}

/** Estandarte de un mes: el color que resume cómo le fue contra su objetivo, con los días ya cerrados (antes de hoy). */
export function computeMonthStandard(
  days: DayEntry[],
  month: string,
  todayFecha: string,
  goal: number,
  tdeeFallback: number,
  pesoKg: number,
  fixedGoal: boolean,
  proteinTarget: number
): MonthStandard {
  const statuses: DayGoalStatus[] = [];
  const detail: MonthStandard["daysDetail"] = [];
  for (const d of [...days].sort((a, b) => (a.fecha < b.fecha ? -1 : 1))) {
    if (!d.fecha.startsWith(month) || d.fecha >= todayFecha) continue;
    const kcal = dayTotal(d);
    if (kcal <= 0) continue;
    const kcalGoal = dayGoal(d, goal, tdeeFallback, pesoKg, fixedGoal);
    statuses.push(dayGoalStatus(kcal, kcalGoal, dayProt(d), proteinTarget));
    detail.push({ fecha: d.fecha, kcal: dayKcalStatus(kcal, kcalGoal), protein: dayProteinStatus(dayProt(d), proteinTarget) });
  }
  const base = monthStatusFrom(statuses);
  // Promedios aparte: kcal (verde 2, amarillo 1, rojo 0) y proteína (violeta 3, verde 2, amarillo 1, rojo 0).
  const kScore = { verde: 2, amarillo: 1, rojo: 0 } as const;
  const pScore = { violeta: 3, verde: 2, amarillo: 1, rojo: 0 } as const;
  const enough = detail.length >= 7;
  const kAvg = detail.length ? detail.reduce((t, x) => t + kScore[x.kcal], 0) / detail.length : 0;
  const pAvg = detail.length ? detail.reduce((t, x) => t + pScore[x.protein], 0) / detail.length : 0;
  const kcalStatus: KcalStatus | null = !enough ? null : kAvg >= 1.6 ? "verde" : kAvg >= 0.8 ? "amarillo" : "rojo";
  const proteinStatus: DayGoalStatus | null = !enough ? null : pAvg >= 2.4 ? "violeta" : pAvg >= 1.6 ? "verde" : pAvg >= 0.8 ? "amarillo" : "rojo";
  return { month, ...base, kcalStatus, proteinStatus, daysDetail: detail };
}

/** Los últimos `count` meses (el actual primero). */
export function recentMonths(todayFecha: string, count: number): string[] {
  const t = new Date(`${todayFecha}T00:00:00`);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(t.getFullYear(), t.getMonth() - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}
