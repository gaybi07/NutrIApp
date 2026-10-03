import { DayEntry } from "@/lib/types";
import { dayGoal, dayProt, dayTotal } from "@/lib/calculations";
import { DayGoalStatus, dayGoalStatus, monthStatusFrom } from "@/lib/dayStatus";

export interface MonthStandard {
  /** AAAA-MM */
  month: string;
  status: DayGoalStatus | null;
  counted: number;
  avg: number;
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
  for (const d of days) {
    if (!d.fecha.startsWith(month) || d.fecha >= todayFecha) continue;
    const kcal = dayTotal(d);
    if (kcal <= 0) continue;
    statuses.push(dayGoalStatus(kcal, dayGoal(d, goal, tdeeFallback, pesoKg, fixedGoal), dayProt(d), proteinTarget));
  }
  return { month, ...monthStatusFrom(statuses) };
}

/** Los últimos `count` meses (el actual primero). */
export function recentMonths(todayFecha: string, count: number): string[] {
  const t = new Date(`${todayFecha}T00:00:00`);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(t.getFullYear(), t.getMonth() - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}
