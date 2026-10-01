/** Objetivo corporal medible (cintura, % de grasa, etc.): estado inicial → meta, con fecha. Vive dentro de calculatorProfile. */
export type BodyMetric =
  | "cintura"
  | "grasa_pct"
  | "cadera"
  | "gluteos"
  | "pecho"
  | "hombros"
  | "brazo"
  | "cuello"
  | "muneca"
  | "muslo"
  | "cuadriceps"
  | "gemelos"
  | "tobillos";

/** Medidas que se pueden cargar (y elegir como objetivo). `brazo` es el bíceps; `cadera` la de apoyo del pantalón;
 * `muslo` la apertura de cadera; `gluteos` la circunferencia máxima de glúteos/cadera. */
export const BODY_METRICS: { id: BodyMetric; label: string; unit: string }[] = [
  { id: "cintura", label: "Cintura", unit: "cm" },
  { id: "grasa_pct", label: "% de grasa", unit: "%" },
  { id: "cadera", label: "Cadera (donde apoya el pantalón)", unit: "cm" },
  { id: "gluteos", label: "Glúteos / cadera máxima", unit: "cm" },
  { id: "pecho", label: "Pecho (bajo los brazos)", unit: "cm" },
  { id: "hombros", label: "Hombros", unit: "cm" },
  { id: "brazo", label: "Bíceps", unit: "cm" },
  { id: "cuello", label: "Cuello", unit: "cm" },
  { id: "muneca", label: "Muñeca", unit: "cm" },
  { id: "muslo", label: "Muslo (apertura de cadera)", unit: "cm" },
  { id: "cuadriceps", label: "Cuádriceps", unit: "cm" },
  { id: "gemelos", label: "Gemelos", unit: "cm" },
  { id: "tobillos", label: "Tobillos", unit: "cm" },
];

/** Las medidas clave: con Nutricionista vinculado son obligatorias en cada medición; el resto es opcional y suma al progreso. */
export const CORE_METRICS: BodyMetric[] = ["cintura", "cadera", "cuello"];

/** Todas las columnas numéricas de una medición (además de las medidas: peso y altura). */
export const MEASUREMENT_FIELDS: string[] = ["peso", "altura", ...BODY_METRICS.map((m) => m.id)];

export interface BodyGoal {
  medida: BodyMetric;
  inicial: number;
  meta: number;
  /** Fecha en la que se fijó el punto de partida (YYYY-MM-DD). */
  desde: string;
  /** Fecha objetivo (YYYY-MM-DD). */
  fecha: string;
  /** Quién lo propuso: una estimación según la dieta o el profesional. Nunca la propia persona. */
  propuestoPor?: "estimacion" | "profesional";
}

export type BodyMeasurement = { fecha: string; peso?: number; altura?: number } & { [K in BodyMetric]?: number };

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

/** La medición más vieja de una medida: el estado inicial natural de un objetivo. */
export function earliestValue(measurements: BodyMeasurement[], metric: BodyMetric): { fecha: string; value: number } | null {
  const sorted = [...measurements].filter((m) => m[metric] != null).sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  const m = sorted[0];
  return m ? { fecha: m.fecha, value: m[metric] as number } : null;
}

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

/**
 * Estimación de cuánto bajar de cintura para una fecha, según el déficit de la dieta. Regla práctica: ~1 cm de cintura
 * por kg de grasa perdida en hombres (~1,2 en mujeres); con un tope de 1 kg de grasa por semana. Sin déficit
 * (mantenimiento / recomposición) se propone una baja suave de ~0,3 cm por semana. Es una orientación, no una promesa.
 */
export function estimateBodyGoal(input: {
  actual: number;
  desde: string;
  semanas: number;
  dailyDeficit: number;
  sexo: "hombre" | "mujer";
  todayIso: string;
}): BodyGoal {
  const { actual, desde, semanas, dailyDeficit, sexo, todayIso } = input;
  const cmPorKg = sexo === "mujer" ? 1.2 : 1;
  const kgPorSemana = dailyDeficit > 0 ? Math.min(1, (dailyDeficit * 7) / 7700) : 0;
  const cmPorSemana = dailyDeficit > 0 ? kgPorSemana * cmPorKg : 0.3;
  const baja = Math.round(cmPorSemana * semanas * 10) / 10;
  const fecha = new Date(`${todayIso}T00:00:00`);
  fecha.setDate(fecha.getDate() + semanas * 7);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    medida: "cintura",
    inicial: actual,
    meta: Math.round((actual - baja) * 10) / 10,
    desde,
    fecha: `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`,
    propuestoPor: "estimacion",
  };
}
