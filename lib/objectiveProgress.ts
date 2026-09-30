import { DayEntry, Objective } from "@/lib/types";
import { addDays, dayProt, dayTotal, fmtDate, getTrainingSessions, isoMonday } from "@/lib/calculations";

export interface ObjectiveCheck {
  objectiveId: string;
  fecha: string;
  valor: number | null;
  cumplido: boolean;
}

export interface ObjectiveProgress {
  /** 0 a 100. */
  percent: number;
  /** Línea principal: "3 de 5 días esta semana", "78,4 kg → meta 70 kg". */
  headline: string;
  /** Línea secundaria: "Semana 1 de 2 seguidas". */
  sub?: string;
  achieved: boolean;
  /** Solo objetivos diarios: si hoy ya cumplió (null = todavía no hay dato de hoy). */
  todayMet: boolean | null;
  /** Objetivos que el cliente marca a mano (agua, hábito propio): hace falta preguntarle cada día. */
  manual: boolean;
}

const norm = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const fmtNum = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 1 });

function meets(o: Objective, value: number) {
  return o.direccion === "min" ? value >= o.meta : value <= o.meta;
}

/** Último peso cargado (del día o semanal), con su fecha. */
function weightSeries(days: DayEntry[], weeklyWeights: Record<string, number> | undefined) {
  const points: { fecha: string; peso: number }[] = [];
  for (const d of days) if (d.pesoKg) points.push({ fecha: d.fecha, peso: d.pesoKg });
  for (const [fecha, peso] of Object.entries(weeklyWeights || {})) points.push({ fecha, peso });
  return points.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

function dayValue(o: Objective, d: DayEntry | undefined, checks: Map<string, ObjectiveCheck>): number | null {
  if (!d && o.tipo !== "agua" && o.tipo !== "custom") return null;
  switch (o.tipo) {
    case "kcal": {
      const v = d ? dayTotal(d) : 0;
      return v > 0 ? v : null; // un día sin comidas cargadas no cuenta como "cumplido"
    }
    case "proteina": {
      const v = d ? dayProt(d) : 0;
      return v > 0 ? v : null;
    }
    case "pasos":
      return d && d.pasos ? d.pasos : null;
    case "sueno":
      return d && d.suenoHoras ? d.suenoHoras : null;
    case "agua":
    case "custom": {
      const c = d ? checks.get(d.fecha) : undefined;
      return c ? (o.tipo === "agua" ? c.valor ?? (c.cumplido ? o.meta : 0) : c.cumplido ? o.meta : 0) : null;
    }
    default:
      return null;
  }
}

function weekStarts(since: string, until: string) {
  const out: string[] = [];
  let monday = isoMonday(since);
  const end = new Date(`${until}T00:00:00`);
  while (monday <= end) {
    out.push(fmtDate(monday));
    monday = addDays(monday, 7);
  }
  return out;
}

/**
 * Mide un objetivo con lo que el cliente carga en la app (comidas, pasos, sueño, entrenamientos, peso) y, para
 * agua y hábitos propios, con las marcas diarias. Puntuales (peso, carga): logrado al llegar al valor.
 * Recurrentes: logrado cuando cumplió la meta `semanasSeguidas` semanas seguidas.
 */
export function computeObjectiveProgress(
  o: Objective,
  days: DayEntry[],
  weeklyWeights: Record<string, number> | undefined,
  checks: ObjectiveCheck[],
  todayFecha: string
): ObjectiveProgress {
  const unidad = o.unidad ? ` ${o.unidad}` : "";
  const manual = o.tipo === "agua" || o.tipo === "custom";

  // ---------- Puntuales ----------
  if (o.tipo === "peso") {
    const series = weightSeries(days, weeklyWeights);
    if (series.length === 0) return { percent: 0, headline: "Cargá tu peso para empezar a medirlo", achieved: false, todayMet: null, manual };
    const current = series[series.length - 1].peso;
    const created = o.createdAt.slice(0, 10);
    const before = series.filter((p) => p.fecha <= created);
    const start = (before.length ? before[before.length - 1] : series[0]).peso;
    const achieved = meets(o, current);
    const total = o.direccion === "max" ? start - o.meta : o.meta - start;
    const done = o.direccion === "max" ? start - current : current - start;
    return {
      percent: achieved ? 100 : total > 0 ? clamp((done / total) * 100) : 0,
      headline: `${fmtNum(current)} kg → meta ${fmtNum(o.meta)} kg`,
      sub: total > 0 ? `Empezaste en ${fmtNum(start)} kg` : undefined,
      achieved,
      todayMet: null,
      manual: false,
    };
  }

  if (o.tipo === "carga") {
    const target = norm(o.ejercicio || "");
    const points: { fecha: string; peso: number }[] = [];
    for (const d of days) {
      for (const ex of d.ejercicios || []) {
        if (!target || !norm(ex.nombre).includes(target)) continue;
        const pesos = [ex.peso || 0, ...(ex.sets || []).map((s) => s.peso || 0)];
        const max = Math.max(...pesos);
        if (max > 0) points.push({ fecha: d.fecha, peso: max });
      }
    }
    points.sort((a, b) => a.fecha.localeCompare(b.fecha));
    if (points.length === 0) return { percent: 0, headline: `Todavía sin cargas de ${o.ejercicio || "ese ejercicio"}`, achieved: false, todayMet: null, manual: false };
    const best = Math.max(...points.map((p) => p.peso));
    const created = o.createdAt.slice(0, 10);
    const before = points.filter((p) => p.fecha <= created);
    const start = before.length ? Math.max(...before.map((p) => p.peso)) : points[0].peso;
    const achieved = best >= o.meta;
    const total = o.meta - start;
    return {
      percent: achieved ? 100 : total > 0 ? clamp(((best - start) / total) * 100) : 0,
      headline: `${fmtNum(best)} kg → meta ${fmtNum(o.meta)} kg`,
      sub: o.ejercicio || undefined,
      achieved,
      todayMet: null,
      manual: false,
    };
  }

  // ---------- Recurrentes ----------
  const byFecha = new Map(days.map((d) => [d.fecha, d]));
  const checkMap = new Map(checks.map((c) => [c.fecha, c]));
  const since = o.createdAt.slice(0, 10);
  const weeks = weekStarts(since, todayFecha);
  const needed = o.semanasSeguidas;

  const weekMetInfo = weeks.map((w) => {
    const dates = [...Array(7)].map((_, i) => fmtDate(addDays(new Date(`${w}T00:00:00`), i)));
    if (o.ventana === "semana") {
      let value = 0;
      for (const f of dates) {
        const d = byFecha.get(f);
        if (!d) continue;
        if (o.tipo === "sesiones") value += getTrainingSessions(d).length;
        if (o.tipo === "minutos") value += getTrainingSessions(d).reduce((s, x) => s + (x.minutos || 0), 0);
      }
      return { week: w, met: meets(o, value), value, total: 1, count: meets(o, value) ? 1 : 0, closed: w < fmtDate(isoMonday(todayFecha)) };
    }
    let count = 0;
    for (const f of dates) {
      const v = dayValue(o, byFecha.get(f), checkMap);
      if (v != null && meets(o, v)) count++;
    }
    return { week: w, met: count >= o.diasPorSemana, value: count, total: o.diasPorSemana, count, closed: w < fmtDate(isoMonday(todayFecha)) };
  });

  // Semanas seguidas cumplidas terminando en la última semana (la actual cuenta si ya llegó a la meta).
  let streak = 0;
  for (let i = weekMetInfo.length - 1; i >= 0; i--) {
    if (weekMetInfo[i].met) streak++;
    else if (!weekMetInfo[i].closed && i === weekMetInfo.length - 1) continue; // la semana en curso todavía puede cumplirse
    else break;
  }
  const current = weekMetInfo[weekMetInfo.length - 1];
  const achieved = streak >= needed;

  const todayMetValue = o.ventana === "dia" ? dayValue(o, byFecha.get(todayFecha), checkMap) : null;
  const todayMet = o.ventana === "dia" ? (todayMetValue == null ? null : meets(o, todayMetValue)) : null;

  const headline =
    o.ventana === "semana"
      ? `${fmtNum(current.value)} de ${fmtNum(o.meta)}${unidad} esta semana`
      : `${current.count} de ${current.total} días esta semana`;
  const percent = achieved ? 100 : clamp(((Math.min(streak, needed) + (current.met ? 0 : Math.min(1, current.count / Math.max(1, current.total)) * (1)) ) / needed) * 100);

  return {
    percent: Math.min(percent, achieved ? 100 : 99),
    headline,
    sub: `${Math.min(streak, needed)} de ${needed} semana${needed === 1 ? "" : "s"} seguida${needed === 1 ? "" : "s"}`,
    achieved,
    todayMet,
    manual,
  };
}
