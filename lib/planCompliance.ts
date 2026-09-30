import { DayEntry, MealKey, MealLevel, MealOption } from "@/lib/types";
import { getMealItems, sumMealItems } from "@/lib/calculations";

/**
 * Color de cada comida en el almanaque (tracker de objetivos). El color lo define la
 * Nutricionista en cada opción (`MealOption.nivel`), no una fórmula:
 *  optima     (violeta)  -> eligió la opción perfecta / la mejor
 *  buena      (verde)    -> eligió la opción que está bien
 *  ocasional  (amarillo) -> eligió la opción que se puede comer de vez en cuando
 *  fuera_ok   (amarillo) -> comió algo que no estaba en el plan, pero razonable (proteína y kcal cerca)
 *  fuera_lejos(rojo)     -> comió algo que no estaba en el plan y se alejó del objetivo
 *  saltada    (rojo)     -> la comida ya pasó y no cargó nada
 *  pendiente  (punteado) -> todavía no llegó esa comida
 */
export type MealStatus = "optima" | "buena" | "ocasional" | "fuera_ok" | "fuera_lejos" | "saltada" | "pendiente";

export interface MealCompliance {
  status: MealStatus;
  label: string;
  /** La opción del plan que eligió (si comió una del plan). */
  matched?: MealOption;
  /** Diferencia de cantidad contra la opción elegida (0.12 = 12% más), si comió una del plan. */
  cantidadDiff?: number;
  real: { nombres: string[]; kcal: number; protein: number } | null;
}

export const STATUS_LABEL: Record<MealStatus, string> = {
  optima: "Opción perfecta",
  buena: "Opción buena",
  ocasional: "Opción ocasional",
  fuera_ok: "Fuera del plan, pero razonable",
  fuera_lejos: "Fuera del plan, lejos del objetivo",
  saltada: "No la comiste",
  pendiente: "Pendiente",
};

export function levelOf(option: MealOption): MealLevel {
  return option.nivel ?? "buena";
}

const norm = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

function sameDish(a: string, b: string) {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const short = x.length <= y.length ? x : y;
  const long = x.length <= y.length ? y : x;
  return short.length >= 8 && long.includes(short);
}

/** `null` si esa comida no está planificada ese día (no hay nada que comparar). */
export function classifyMeal(
  options: MealOption[] | undefined,
  entry: DayEntry | undefined,
  meal: MealKey,
  fecha: string,
  todayFecha: string
): MealCompliance | null {
  if (!options || options.length === 0) return null;

  const items = entry ? getMealItems(entry, meal) : [];
  if (items.length === 0) {
    return fecha < todayFecha
      ? { status: "saltada", label: STATUS_LABEL.saltada, real: null }
      : { status: "pendiente", label: STATUS_LABEL.pendiente, real: null };
  }

  const totals = sumMealItems(items);
  const nombres = Array.from(new Set(items.map((item) => item.grupoNombre || item.nombre)));
  const real = { nombres, kcal: Math.round(totals.kcal), protein: Math.round(totals.protein) };

  const matched = options.find((opt) => nombres.some((name) => sameDish(name, opt.nombre)));
  if (matched) {
    const status = levelOf(matched);
    const cantidadDiff = matched.kcal > 0 ? (real.kcal - matched.kcal) / matched.kcal : 0;
    const extra = Math.abs(cantidadDiff) > 0.08 ? ` · ${Math.round(Math.abs(cantidadDiff) * 100)}% ${cantidadDiff > 0 ? "más" : "menos"} de cantidad` : "";
    return { status, label: `${STATUS_LABEL[status]}${extra}`, matched, cantidadDiff, real };
  }

  // Algo que no estaba en el plan: se compara contra la mejor opción que ofrece el plan para esa comida.
  const reference = options.find((opt) => levelOf(opt) === "buena") ?? options[0];
  const proteinOk = reference.protein <= 0 || real.protein >= reference.protein * 0.85;
  const kcalOk = reference.kcal <= 0 || real.kcal <= reference.kcal * 1.25;
  return proteinOk && kcalOk
    ? { status: "fuera_ok", label: STATUS_LABEL.fuera_ok, real }
    : { status: "fuera_lejos", label: STATUS_LABEL.fuera_lejos, real };
}
