/** Objetivo corporal medible (cintura, % de grasa, etc.): estado inicial → meta, con fecha. Vive dentro de calculatorProfile. */
export type BodyMetric = "cintura" | "grasa_pct" | "cadera" | "pecho" | "brazo" | "muslo";

export const BODY_METRICS: { id: BodyMetric; label: string; unit: string }[] = [
  { id: "cintura", label: "Cintura", unit: "cm" },
  { id: "grasa_pct", label: "% de grasa", unit: "%" },
  { id: "cadera", label: "Cadera", unit: "cm" },
  { id: "pecho", label: "Pecho", unit: "cm" },
  { id: "brazo", label: "Brazo", unit: "cm" },
  { id: "muslo", label: "Muslo", unit: "cm" },
];

export interface BodyGoal {
  medida: BodyMetric;
  inicial: number;
  meta: number;
  /** Fecha en la que se fijó el punto de partida (YYYY-MM-DD). */
  desde: string;
  /** Fecha objetivo (YYYY-MM-DD). */
  fecha: string;
}

export interface BodyMeasurement {
  fecha: string;
  peso?: number;
  grasa_pct?: number;
  cintura?: number;
  cadera?: number;
  pecho?: number;
  brazo?: number;
  muslo?: number;
}

export interface BodyGoalProgress {
  goal: BodyGoal;
  actual: number;
  /** 0-100, qué parte del camino inicial → meta ya se hizo. */
  pct: number;
  restante: number;
  yaLlego: boolean;
  /** Por dónde debería ir hoy si el avance fuera parejo hasta la fecha (0-100); null si no hay fecha válida. */
  pctEsperado: number | null;
  diasRestantes: number;
  ultimaFecha: string | null;
  diasDesdeUltima: number | null;
}

const DAY = 86400000;
const startOfDay = (iso: string) => new Date(`${iso}T00:00:00`).getTime();

export function latestValue(measurements: BodyMeasurement[], metric: BodyMetric): { fecha: string; value: number } | null {
  const sorted = [...measurements].filter((m) => m[metric] != null).sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  const m = sorted[0];
  return m ? { fecha: m.fecha, value: m[metric] as number } : null;
}

export function computeBodyGoalProgress(goal: BodyGoal, measurements: BodyMeasurement[], todayIso: string): BodyGoalProgress {
  const last = latestValue(measurements, goal.medida);
  const actual = last?.value ?? goal.inicial;
  const total = goal.inicial - goal.meta; // positivo si hay que bajar
  const hecho = goal.inicial - actual;
  const pct = total === 0 ? 0 : Math.max(0, Math.min(100, Math.round((hecho / total) * 100)));
  const yaLlego = total > 0 ? actual <= goal.meta : actual >= goal.meta;
  const span = startOfDay(goal.fecha) - startOfDay(goal.desde);
  const pctEsperado = span > 0 ? Math.max(0, Math.min(100, Math.round(((startOfDay(todayIso) - startOfDay(goal.desde)) / span) * 100))) : null;
  return {
    goal,
    actual,
    pct,
    restante: Math.max(0, Math.abs(actual - goal.meta)),
    yaLlego,
    pctEsperado,
    diasRestantes: Math.round((startOfDay(goal.fecha) - startOfDay(todayIso)) / DAY),
    ultimaFecha: last?.fecha ?? null,
    diasDesdeUltima: last ? Math.round((startOfDay(todayIso) - startOfDay(last.fecha)) / DAY) : null,
  };
}
