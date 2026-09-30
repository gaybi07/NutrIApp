import { DayEntry, MealKey, MealOption } from "@/lib/types";
import { getMealItems, sumMealItems } from "@/lib/calculations";

/**
 * Qué tanto se parece lo que el paciente comió en UNA comida a lo que la
 * Nutricionista planificó (almanaque de Comidas). Reglas acordadas:
 *  igual       (verde)    -> comió una opción del plan, kcal a ±5%
 *  cantidad    (amarillo) -> comió una opción del plan, pero con más/menos cantidad (hasta ±40%)
 *  otra_ok     (violeta)  -> comió otra cosa, pero llegó al 85% de la proteína del plan y no se pasó 40% de kcal
 *  otra_lejos  (rojo)     -> comió otra cosa lejos del objetivo
 *  saltada     (rojo)     -> la comida ya pasó y no cargó nada
 *  pendiente   (punteado) -> todavía no llegó esa comida
 */
export type MealStatus = "igual" | "cantidad" | "otra_ok" | "otra_lejos" | "saltada" | "pendiente";

export interface MealCompliance {
  status: MealStatus;
  label: string;
  /** La opción del plan con la que coincidió (si comió una del plan). */
  matched?: MealOption;
  real: { nombres: string[]; kcal: number; protein: number } | null;
}

export const STATUS_LABEL: Record<MealStatus, string> = {
  igual: "Igual al plan",
  cantidad: "Lo del plan, distinta cantidad",
  otra_ok: "Otra cosa, pero cumpliste el objetivo",
  otra_lejos: "Otra cosa, lejos del objetivo",
  saltada: "No la comiste",
  pendiente: "Pendiente",
};

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
  if (matched && matched.kcal > 0) {
    const diff = (real.kcal - matched.kcal) / matched.kcal;
    if (Math.abs(diff) <= 0.05) return { status: "igual", label: STATUS_LABEL.igual, matched, real };
    if (Math.abs(diff) <= 0.4) {
      const pct = Math.round(Math.abs(diff) * 100);
      return { status: "cantidad", label: `Lo del plan, ${pct}% ${diff > 0 ? "más" : "menos"} de cantidad`, matched, real };
    }
  }

  const reference = options[0];
  const proteinOk = reference.protein <= 0 || real.protein >= reference.protein * 0.85;
  const kcalOk = reference.kcal <= 0 || real.kcal <= reference.kcal * 1.4;
  return proteinOk && kcalOk
    ? { status: "otra_ok", label: STATUS_LABEL.otra_ok, real }
    : { status: "otra_lejos", label: STATUS_LABEL.otra_lejos, real };
}
