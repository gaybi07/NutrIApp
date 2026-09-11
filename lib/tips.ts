import { DayEntry, GoalMode } from "./types";
import { WeekSummary } from "./calculations";
import { classifyIngredient } from "./foodGroups";

export interface Tip {
  id: string;
  kind: "felicitacion" | "sugerencia";
  text: string;
}

/**
 * Cuántos días distintos de verduras se comieron en la semana (a partir de
 * `DayEntry.alimentos`, que ya se guarda al registrar comidas con IA).
 */
function countVegDiversity(days: DayEntry[]): number {
  const verduras = new Set<string>();
  for (const d of days) {
    for (const alimento of d.alimentos || []) {
      if (classifyIngredient(alimento) === "verdura") verduras.add(alimento.toLowerCase());
    }
  }
  return verduras.size;
}

/**
 * Arma una lista de candidatos (felicitaciones + sugerencias suaves) según
 * los datos reales de la semana, y elige uno para mostrar — priorizando
 * felicitar cuando hay algo para felicitar, así el tono general es
 * motivacional y no de regaño constante. Reglas simples, sin IA: rápido,
 * gratis y predecible.
 */
export function generateTip(ctx: {
  presentDays: DayEntry[];
  summary: WeekSummary;
  proteinTarget: number;
  goalMode?: GoalMode;
  weightTrend: number | null; // negativo = bajó, positivo = subió, null = sin datos suficientes
  sleepAvg: number | null;
}): Tip | null {
  if (ctx.presentDays.length === 0) return null;
  const candidates: Tip[] = [];
  const vegDiversity = countVegDiversity(ctx.presentDays);

  if (ctx.proteinTarget > 0) {
    if (ctx.summary.avgProt >= ctx.proteinTarget) {
      candidates.push({
        id: "protein_ok",
        kind: "felicitacion",
        text: `Cumpliste tu objetivo de proteína esta semana (${Math.round(ctx.summary.avgProt)}g/día promedio) 💪`,
      });
    } else if (ctx.summary.avgProt < ctx.proteinTarget * 0.85) {
      candidates.push({
        id: "protein_low",
        kind: "sugerencia",
        text: `Esta semana te quedaste un poco corto de proteína (${Math.round(ctx.summary.avgProt)}g de ${ctx.proteinTarget}g). Sumar un poco más ayuda a no perder músculo.`,
      });
    }
  }

  if (ctx.weightTrend != null && ctx.goalMode) {
    const wantsDown = ctx.goalMode === "perder";
    const wantsUp = ctx.goalMode === "aumentar";
    if ((wantsDown && ctx.weightTrend < 0) || (wantsUp && ctx.weightTrend > 0)) {
      candidates.push({
        id: "weight_on_track",
        kind: "felicitacion",
        text: `Seguís ${wantsDown ? "bajando" : "subiendo"} de peso, vas por buen camino 🙌`,
      });
    }
  }

  if (ctx.sleepAvg != null && ctx.sleepAvg >= 7) {
    candidates.push({
      id: "sleep_ok",
      kind: "felicitacion",
      text: `Dormiste bien esta semana (${ctx.sleepAvg.toFixed(1)}hs promedio) — el descanso también suma al progreso.`,
    });
  }

  if (ctx.summary.totalDays > 0) {
    const ratio = ctx.summary.trainedDays / ctx.summary.totalDays;
    if (ratio >= 0.6) {
      candidates.push({
        id: "training_consistent",
        kind: "felicitacion",
        text: `Entrenaste ${ctx.summary.trainedDays} de ${ctx.summary.totalDays} días esta semana. El esfuerzo se nota 🔥`,
      });
    }
  }

  if (vegDiversity >= 3) {
    candidates.push({
      id: "veg_diverse",
      kind: "felicitacion",
      text: `Esta semana comiste ${vegDiversity} verduras distintas — buenísimo, la variedad suma.`,
    });
  } else if (vegDiversity <= 1) {
    candidates.push({
      id: "veg_low",
      kind: "sugerencia",
      text: "Esta semana casi no variaste de verduras. Probá sumar alguna distinta — ayuda con la fibra y los micronutrientes.",
    });
  }

  if (candidates.length === 0) {
    candidates.push({
      id: "fallback",
      kind: "felicitacion",
      text: "Seguís registrando tus días — ese hábito solo ya vale mucho. ¡Vamos por más!",
    });
  }

  const felicitaciones = candidates.filter((c) => c.kind === "felicitacion");
  const pool = felicitaciones.length > 0 ? felicitaciones : candidates;
  return pool[Math.floor(Math.random() * pool.length)];
}
