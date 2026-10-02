"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { InventoryItem, MealKey, MealOption, MEAL_LABELS, WeekPlan, WEEKDAYS } from "@/lib/types";
import { isoMonday, addDays, fmtDate } from "@/lib/calculations";
import { Recipe, RecipeIngredient, RECIPES } from "@/lib/recipes";
import { inventoryKey } from "@/lib/useInventory";
import { LevelChip, quantities } from "@/components/PlanAlmanaque";
import { usePlanSelection } from "@/lib/usePlanSelection";
import { btn } from "@/components/buttonStyles";
import { fuzzyNameMatch } from "@/lib/foodText";
import { useMealMemory, MealMemoryEntry } from "@/lib/useMealMemory";
import { useMyNutritionPlan } from "@/lib/useMyNutritionPlan";
import { SECTION_HELP } from "@/lib/helpText";
import { InfoHint } from "@/components/InfoHint";
import { CircleCheck, Salad, TriangleAlert, Share2 } from "lucide-react";

const DOW_FULL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MEAL_KEYS: MealKey[] = ["des", "alm", "mer", "cen", "col"];
// La colación es lo único opcional -- estas 4 son las que cuentan para
// "¿ya planificaste el día?" (el ✓/N-sobre-4 de cada fila y el aviso de
// "falta planificar" del grupo).
const REQUIRED_MEAL_KEYS: MealKey[] = ["des", "alm", "mer", "cen"];
const MAX_PICKER_SUGGESTIONS = 6;
const MAX_PERSONAL_SUGGESTIONS = 4;

// Sentinel guardado en el mismo lugar que un título de receta -- para no
// tener que sumar una estructura de datos paralela (ni una migración) solo
// para marcar "esto no lo voy a planificar" (ej. viaje, día que como afuera).
// No matchea ninguna receta real, así que no suma nada a la lista de
// compras ni se puede confundir con un título elegido de verdad.
export const SKIP_MEAL = "__skip__";
function isFilled(value: string | undefined): boolean {
  return !!value && value !== SKIP_MEAL;
}
function isSkipped(value: string | undefined): boolean {
  return value === SKIP_MEAL;
}

function shortTitle(title: string) {
  return title.length > 24 ? `${title.slice(0, 22)}…` : title;
}

// Reparto típico de las kcal/proteína del día entre comidas -- fijo, no
// depende de qué más se haya planificado ese día (más simple y predecible
// que ir descontando lo que ya se planificó, y evita que la recomendación
// de una comida cambie según el orden en que se van eligiendo las otras).
const MEAL_SHARE: Record<MealKey, number> = { des: 0.2, alm: 0.35, mer: 0.1, cen: 0.3, col: 0.05 };

/**
 * Porción sugerida de una receta del catálogo para una comida puntual --
 * escala TODA la lista de ingredientes por un factor que busca un
 * compromiso entre pegarle a las kcal y a la proteína de la porción típica
 * de esa comida (según MEAL_SHARE). Acotado a un rango razonable (0.5x-2x)
 * para no sugerir disparates con recetas muy chicas/grandes frente al
 * objetivo. Solo tiene sentido para recetas del catálogo -- son las únicas
 * con ingredientes + kcal/proteína de la receta completa para escalar.
 */
function recommendedPortion(
  recipe: Recipe,
  meal: MealKey,
  dailyGoalKcal: number,
  dailyProteinTargetG: number
): { scale: number; ingredients: RecipeIngredient[] } {
  const share = MEAL_SHARE[meal];
  const targetKcal = dailyGoalKcal * share;
  const targetProtein = dailyProteinTargetG * share;
  const kcalScale = recipe.kcal > 0 ? targetKcal / recipe.kcal : 1;
  const proteinScale = recipe.protein > 0 ? targetProtein / recipe.protein : kcalScale;
  const scale = Math.min(2, Math.max(0.5, (kcalScale + proteinScale) / 2));
  const ingredients = recipe.ingredients.map((ing) => {
    const raw = ing.quantity * scale;
    const rounded = ing.unit === "u." ? Math.max(1, Math.round(raw)) : Math.max(5, Math.round(raw / 5) * 5);
    return { ...ing, quantity: rounded };
  });
  return { scale, ingredients };
}

function portionText(ingredients: RecipeIngredient[]): string {
  return ingredients.map((ing) => `${ing.quantity}${ing.unit === "u." ? " u." : ing.unit} ${ing.name}`).join(" · ");
}

/** Los 7 días de la semana calendario siguiente a la actual (lunes a domingo). */
export function getNextWeekDates(): string[] {
  const thisMonday = isoMonday(fmtDate(new Date()));
  const nextMonday = addDays(thisMonday, 7);
  return [...Array(7)].map((_, i) => fmtDate(addDays(nextMonday, i)));
}

/** Cuántas comidas ya están elegidas (con receta de verdad, sin contar las marcadas "no planificar") para la semana que viene — para mostrar en el botón de entrada. */
export function countPlannedMeals(weekPlan: WeekPlan): number {
  const dates = getNextWeekDates();
  let count = 0;
  for (const fecha of dates) {
    const dayPlan = weekPlan[fecha];
    if (!dayPlan) continue;
    count += MEAL_KEYS.filter((meal) => isFilled(dayPlan[meal])).length;
  }
  return count;
}

/** Si ya se tocó algo de la semana que viene (comida elegida o marcada
 * "no planificar") -- a diferencia de countPlannedMeals, una semana toda
 * marcada como "no planificar" (ej. un viaje) cuenta como resuelta, para no
 * seguir avisando "falta planificar" cuando en realidad ya se decidió que
 * no hace falta. */
export function hasWeekActivity(weekPlan: WeekPlan): boolean {
  const dates = getNextWeekDates();
  for (const fecha of dates) {
    const dayPlan = weekPlan[fecha];
    if (!dayPlan) continue;
    if (REQUIRED_MEAL_KEYS.some((meal) => dayPlan[meal] !== undefined)) return true;
  }
  return false;
}

function DayPlanRow({
  fecha,
  dayPlan,
  onPick,
  onSkipDay,
}: {
  fecha: string;
  dayPlan: Partial<Record<MealKey, string>>;
  onPick: (meal: MealKey) => void;
  /** Marca (o desmarca) todo el día como "no voy a planificar". */
  onSkipDay: (skip: boolean) => void;
}) {
  const complete = REQUIRED_MEAL_KEYS.every((meal) => dayPlan[meal] !== undefined);
  const [open, setOpen] = useState(!complete);

  useEffect(() => {
    if (complete) setOpen(false);
  }, [complete]);

  const date = new Date(`${fecha}T00:00:00`);
  const wholeDaySkipped = MEAL_KEYS.every((meal) => dayPlan[meal] === undefined || isSkipped(dayPlan[meal])) && REQUIRED_MEAL_KEYS.every((meal) => isSkipped(dayPlan[meal]));
  const resolvedCount = REQUIRED_MEAL_KEYS.filter((meal) => dayPlan[meal] !== undefined).length;

  return (
    <div className="rounded-xl border border-border bg-bg/40 p-2.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-gold">
          {DOW_FULL[date.getDay()]} {date.getDate()} {MONTHS[date.getMonth()]}
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-mono text-[9px] uppercase tracking-wide ${complete ? "text-sage" : "text-textMuted"}`}>
            {complete ? <CircleCheck size={16} strokeWidth={1.8} /> : `${resolvedCount}/${REQUIRED_MEAL_KEYS.length}`}
          </span>
          <span className="font-mono text-[10px] text-textMuted transition-transform" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
            ▾
          </span>
        </div>
      </button>
      {open && (
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          {MEAL_KEYS.map((meal) => {
            const value = dayPlan[meal];
            const filled = isFilled(value);
            const skipped = isSkipped(value);
            return (
              <button
                key={meal}
                type="button"
                onClick={() => onPick(meal)}
                className={`rounded-lg border px-2 py-1.5 text-left font-mono text-[9.5px] uppercase tracking-wide ${
                  filled
                    ? "border-sage/50 bg-sage/10 text-sage"
                    : skipped
                      ? "border-border bg-bg/20 text-textMuted line-through opacity-60"
                      : "border-dashed border-border text-textMuted"
                }`}
              >
                <div className="text-[8.5px] opacity-70 no-underline">
                  {MEAL_LABELS[meal]}
                  {meal === "col" && !filled && !skipped && " (opcional)"}
                </div>
                <div className="mt-0.5 normal-case tracking-normal text-[11px]">
                  {filled ? shortTitle(value as string) : skipped ? "✕ No planificado" : "+ Elegir"}
                </div>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => onSkipDay(!wholeDaySkipped)}
            className={`col-span-2 ${btn("neutral", "sm", true)}`}
          >
            {wholeDaySkipped ? "Volver a planificar este día" : "No planifico este día"}
          </button>
        </div>
      )}
    </div>
  );
}

export function WeekPlanner({
  items,
  weekPlan,
  onSave,
  dailyGoal,
  proteinTargetG,
  authenticated,
  hasNutricionistaLink,
}: {
  items: InventoryItem[];
  weekPlan: WeekPlan;
  onSave: (plan: WeekPlan) => void;
  dailyGoal: number;
  proteinTargetG: number;
  authenticated: boolean;
  hasNutricionistaLink: boolean;
}) {
  const [pickerFor, setPickerFor] = useState<{ fecha: string; meal: MealKey } | null>(null);
  const [customText, setCustomText] = useState("");
  const [showExport, setShowExport] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [importStatus, setImportStatus] = useState("");
  const { memory: mealMemory } = useMealMemory();

  useEffect(() => {
    setCustomText("");
  }, [pickerFor]);

  const nextWeekDates = useMemo(() => getNextWeekDates(), []);

  const myPlan = useMyNutritionPlan(authenticated, hasNutricionistaLink, nextWeekDates[0]);
  const selection = usePlanSelection(authenticated, hasNutricionistaLink, nextWeekDates[0]);
  const [sendStatus, setSendStatus] = useState("");

  // Opciones del Plan Nutricional del paciente, por fecha de la semana que
  // viene -- se resuelve el weekday de cada fecha (WEEKDAYS[date.getDay()])
  // porque el plan se guarda por nombre de día, no por fecha puntual.
  const planOptionsByDate = useMemo(() => {
    const map = new Map<string, Partial<Record<MealKey, MealOption[]>>>();
    for (const fecha of nextWeekDates) {
      const weekday = WEEKDAYS[new Date(`${fecha}T00:00:00`).getDay()];
      const day = myPlan.days[weekday];
      if (day) map.set(fecha, day);
    }
    return map;
  }, [myPlan.days, nextWeekDates]);

  const hasPlanToImport = planOptionsByDate.size > 0;

  // Ingredientes de las Meal Options del plan importado, indexados por
  // nombre -- así una vez que su nombre queda asignado en weekPlan (igual
  // que el título de una receta del catálogo), shoppingList los encuentra
  // sin necesitar un estado paralelo que se pierda al recargar la página.
  const importedIngredients = useMemo(() => {
    const map = new Map<string, RecipeIngredient[]>();
    for (const day of planOptionsByDate.values()) {
      for (const meal of MEAL_KEYS) {
        for (const opt of day[meal] || []) {
          if (opt.ingredientes && opt.ingredientes.length > 0) map.set(opt.nombre, opt.ingredientes);
        }
      }
    }
    return map;
  }, [planOptionsByDate]);

  const importNutritionPlan = () => {
    const next: WeekPlan = { ...weekPlan };
    let autoFilled = 0;
    let withAlternativas = 0;
    for (const [fecha, day] of planOptionsByDate.entries()) {
      const dayPlan = { ...(next[fecha] || {}) };
      for (const meal of MEAL_KEYS) {
        const options = day[meal];
        if (!options || options.length === 0) continue;
        if (dayPlan[meal] !== undefined) continue; // no pisar algo ya elegido
        // Se carga la opción A de una -- si tenía más alternativas, tocar
        // esa comida (ya cargada) reabre el selector para cambiarla por
        // cualquiera de las otras.
        dayPlan[meal] = options[0].nombre;
        autoFilled++;
        if (options.length > 1) withAlternativas++;
      }
      if (Object.keys(dayPlan).length > 0) next[fecha] = dayPlan;
    }
    onSave(next);
    setImportStatus(
      withAlternativas > 0
        ? `Se cargaron ${autoFilled} comida${autoFilled === 1 ? "" : "s"} de tu plan nutricional ✓ — ${withAlternativas} tenían más de una opción, se eligió la primera (tocá esa comida para cambiarla).`
        : `Se cargaron ${autoFilled} comida${autoFilled === 1 ? "" : "s"} de tu plan nutricional ✓`
    );
    setTimeout(() => setImportStatus(""), 6000);
  };

  // Ya NO se carga solo: la persona elige qué le gusta de las opciones que armó la Nutricionista (y puede
  // completar todo de una con la opción perfecta desde "Completar con las opciones A").

  const assign = (fecha: string, meal: MealKey, recipeTitle: string | null, closePicker = true) => {
    const next: WeekPlan = { ...weekPlan };
    const dayPlan = { ...(next[fecha] || {}) };
    if (recipeTitle) dayPlan[meal] = recipeTitle;
    else delete dayPlan[meal];
    if (Object.keys(dayPlan).length > 0) next[fecha] = dayPlan;
    else delete next[fecha];
    onSave(next);
    if (closePicker) setPickerFor(null);
  };

  // Todo el día de una: marca las comidas sin elegir como "no planificado" (lo ya elegido se respeta), o limpia las marcas.
  const assignDay = (fecha: string, skip: boolean) => {
    const next: WeekPlan = { ...weekPlan };
    const dayPlan = { ...(next[fecha] || {}) };
    for (const meal of MEAL_KEYS) {
      if (skip) {
        if (dayPlan[meal] === undefined) dayPlan[meal] = SKIP_MEAL;
      } else if (dayPlan[meal] === SKIP_MEAL) delete dayPlan[meal];
    }
    if (Object.keys(dayPlan).length > 0) next[fecha] = dayPlan;
    else delete next[fecha];
    onSave(next);
  };

  // Ingredientes de todo lo elegido para la semana -- de la receta del
  // catálogo si el título matchea una, o de una Meal Option importada del
  // Plan Nutricional si no (importedIngredients), lo que sea que se
  // encuentre primero. Nada más queda sin ingredientes con cantidad.
  const selectedIngredientLists = useMemo(() => {
    const lists: RecipeIngredient[][] = [];
    for (const fecha of nextWeekDates) {
      const dayPlan = weekPlan[fecha];
      if (!dayPlan) continue;
      for (const meal of MEAL_KEYS) {
        const title = dayPlan[meal];
        if (!title) continue;
        const recipe = RECIPES.find((r) => r.title === title);
        if (recipe) lists.push(recipe.ingredients);
        else {
          const imported = importedIngredients.get(title);
          if (imported) lists.push(imported);
        }
      }
    }
    return lists;
  }, [weekPlan, nextWeekDates, importedIngredients]);

  const plannedCount = useMemo(() => selectedIngredientLists.length, [selectedIngredientLists]);

  const shoppingList = useMemo(() => {
    const totals = new Map<string, { name: string; quantity: number; unit: InventoryItem["unit"] }>();
    for (const ingredients of selectedIngredientLists) {
      for (const ing of ingredients) {
        const key = `${ing.name}|${ing.unit}`;
        const existing = totals.get(key);
        if (existing) existing.quantity += ing.quantity;
        else totals.set(key, { ...ing });
      }
    }
    return Array.from(totals.values())
      .map((needed) => {
        const stock = items.find((item) => item.unit === needed.unit && (item.name.includes(needed.name) || needed.name.includes(item.name)));
        const have = stock ? stock.quantity : 0;
        return { ...needed, missing: Math.max(0, needed.quantity - have) };
      })
      .filter((entry) => entry.missing > 0);
  }, [selectedIngredientLists, items]);

  // Comidas planificadas que NO son del catálogo (escritas a mano o elegidas
  // de "tu memoria") no tienen ingredientes con cantidad, así que no se
  // pueden sumar a shoppingList -- pero si el nombre coincide con algo de la
  // alacena y queda poco o nada, vale la pena avisar igual, aunque sea sin
  // número exacto (no sabemos cuánto necesita esa comida puntual).
  const reviewList = useMemo(() => {
    const titles = new Set<string>();
    for (const fecha of nextWeekDates) {
      const dayPlan = weekPlan[fecha];
      if (!dayPlan) continue;
      for (const meal of MEAL_KEYS) {
        const title = dayPlan[meal];
        if (!isFilled(title)) continue;
        if (RECIPES.some((r) => r.title === title)) continue;
        if (importedIngredients.has(title as string)) continue;
        titles.add(title as string);
      }
    }
    return Array.from(titles)
      .map((title) => {
        const key = inventoryKey(title);
        const stock = items.find((item) => fuzzyNameMatch(key, inventoryKey(item.name)));
        if (!stock) return { title, note: "no está en tu alacena" };
        const lowThreshold = stock.unit === "u." ? 2 : 200;
        if (stock.quantity > lowThreshold) return null;
        return { title, note: `tenés ${stock.quantity}${stock.unit === "u." ? " u." : stock.unit}, puede no alcanzar` };
      })
      .filter((entry): entry is { title: string; note: string } => entry !== null);
  }, [weekPlan, nextWeekDates, items, importedIngredients]);

  const totalPlannedCount = useMemo(() => countPlannedMeals(weekPlan), [weekPlan]);

  const shoppingListText = useMemo(() => {
    if (shoppingList.length === 0 && reviewList.length === 0) return "";
    const start = new Date(`${nextWeekDates[0]}T00:00:00`);
    const end = new Date(`${nextWeekDates[6]}T00:00:00`);
    const header = `Lista de compras — semana del ${start.getDate()} ${MONTHS[start.getMonth()]} al ${end.getDate()} ${MONTHS[end.getMonth()]}`;
    const lines = shoppingList.map((entry) => `- ${entry.missing}${entry.unit === "u." ? " u." : entry.unit} ${entry.name}`);
    const reviewLines =
      reviewList.length > 0
        ? ["", "A revisar (sin cantidad exacta):", ...reviewList.map((entry) => `- ${entry.title} (${entry.note})`)]
        : [];
    return [header, "", ...lines, ...reviewLines].join("\n");
  }, [shoppingList, reviewList, nextWeekDates]);

  const copyShoppingList = async () => {
    if (!shoppingListText) return;
    try {
      await navigator.clipboard.writeText(shoppingListText);
      setCopyStatus("Copiado al portapapeles ✓ — pegalo donde lo necesites.");
    } catch {
      setCopyStatus("No pude copiar solo — seleccioná el texto de arriba a mano y copialo.");
    }
  };

  const personalSuggestions: MealMemoryEntry[] = useMemo(() => {
    if (!pickerFor) return [];
    return mealMemory.filter((h) => h.meal === pickerFor.meal && h.kcal > 0).slice(0, MAX_PERSONAL_SUGGESTIONS);
  }, [mealMemory, pickerFor]);

  const catalogSuggestions: Recipe[] = useMemo(() => {
    if (!pickerFor) return [];
    return RECIPES.filter((r) => r.meals.includes(pickerFor.meal)).slice(0, Math.max(0, MAX_PICKER_SUGGESTIONS - personalSuggestions.length));
  }, [pickerFor, personalSuggestions.length]);

  const planSuggestions: MealOption[] = useMemo(() => {
    if (!pickerFor) return [];
    return planOptionsByDate.get(pickerFor.fecha)?.[pickerFor.meal] || [];
  }, [pickerFor, planOptionsByDate]);

  // Con Nutricionista: las comidas con opciones, en orden (día por día, desayuno a colación). Al elegir una, el
  // selector pasa solo a la siguiente; también se puede ir adelante / atrás a mano.
  const slots = useMemo(() => {
    const list: { fecha: string; meal: MealKey }[] = [];
    for (const fecha of nextWeekDates) {
      const day = planOptionsByDate.get(fecha);
      if (!day) continue;
      for (const meal of MEAL_KEYS) if ((day[meal]?.length ?? 0) > 0) list.push({ fecha, meal });
    }
    return list;
  }, [nextWeekDates, planOptionsByDate]);
  const slotIndex = pickerFor ? slots.findIndex((sl) => sl.fecha === pickerFor.fecha && sl.meal === pickerFor.meal) : -1;
  const goToSlot = (delta: number) => {
    if (slotIndex < 0) return;
    const next = slots[slotIndex + delta];
    setPickerFor(next ?? null);
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center font-display text-xl leading-none -tracking-[0.04em]">
          Semana que viene
          <InfoHint text={SECTION_HELP.planificador} label="Qué es el Planificador" />
        </div>
        <div className="rounded-full border border-border bg-bg/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted">
          {totalPlannedCount} {totalPlannedCount === 1 ? "comida" : "comidas"}
        </div>
      </div>

      {hasPlanToImport && (
        <div className="mb-3 rounded-lg border border-dashed border-sage/50 bg-sage/5 px-3 py-2 text-center text-[12px] text-text">
          <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide text-sage">
            <Salad size={16} strokeWidth={1.8} /> Tu Nutricionista armó el plan de esta semana
          </span>
          <div className="mt-1 text-textMuted">
            Tocá cada comida y elegí la opción que más te gusta. Podés contarle por qué la elegiste o sugerirle un cambio.
          </div>
          <button type="button" onClick={importNutritionPlan} className={`${btn("secondary", "sm")} mt-2`}>
            Completar con las opciones A
          </button>
          {importStatus && <div className="mt-1 normal-case tracking-normal text-textMuted">{importStatus}</div>}
        </div>
      )}

      <div className="space-y-2">
        {nextWeekDates.map((fecha) => (
          <DayPlanRow
            key={fecha}
            fecha={fecha}
            dayPlan={weekPlan[fecha] || {}}
            onPick={(meal) => setPickerFor({ fecha, meal })}
            onSkipDay={(skip) => assignDay(fecha, skip)}
          />
        ))}
      </div>

      {hasNutricionistaLink && hasPlanToImport && (
        <div className="mt-3 rounded-xl border border-border bg-surface/70 p-3">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-gold">Paso 2 · Enviar a tu Nutricionista</div>
          <div className="mb-2 text-[12px] text-textMuted">
            Le mandás lo que elegiste y tus comentarios. Después tu selección aparece en el almanaque de Comidas como provisoria.
          </div>
          <textarea
            value={selection.comentario}
            onChange={(event) => selection.setComentario(event.target.value)}
            placeholder="Comentario general para tu Nutricionista (opcional)"
            rows={2}
            maxLength={500}
            className="w-full text-[12px]"
          />
          <button
            type="button"
            disabled={selection.sending || totalPlannedCount === 0}
            onClick={async () => {
              setSendStatus("");
              const ok = await selection.send(weekPlan, nextWeekDates);
              if (ok) setSendStatus("Enviado ✓");
            }}
            className={`${btn("primary", "md", true)} mt-2`}
          >
            {selection.sending ? "Enviando..." : selection.sentAt ? "Volver a enviar mi selección" : "Enviar mi selección"}
          </button>
          {selection.sentAt && !selection.error && (
            <div className="mt-1.5 text-[11px] text-sage">
              Enviado el {new Date(selection.sentAt).toLocaleDateString("es-AR", { day: "numeric", month: "numeric" })} a las{" "}
              {new Date(selection.sentAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} ✓
            </div>
          )}
          {sendStatus && !selection.error && <div className="mt-1.5 text-[11px] text-sage">{sendStatus}</div>}
          {selection.error && <div className="mt-1.5 text-[11px] text-rust">No se pudo enviar: {selection.error}</div>}
        </div>
      )}

      <div className="mt-3 rounded-xl border border-gold/30 bg-gold/10 p-3">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-gold">Lista de compras de la semana</div>
        {totalPlannedCount === 0 ? (
          <div className="text-[12px] text-textMuted">Elegí recetas para los días de la semana que viene para ver qué te falta comprar.</div>
        ) : shoppingList.length === 0 && reviewList.length === 0 ? (
          plannedCount === 0 ? (
            <div className="text-[12px] text-textMuted">
              Lo que elegiste es de tu memoria personal, sin lista de ingredientes — no hay nada que sumar todavía. Elegí
              alguna receta del catálogo para que se arme la lista.
            </div>
          ) : (
            <div className="text-[12px] text-sage inline-flex items-center gap-1">Ya tenés todo lo que necesitás en el inventario <CircleCheck size={16} strokeWidth={1.8} /></div>
          )
        ) : (
          <>
            {shoppingList.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {shoppingList.map((entry) => (
                  <span
                    key={`${entry.name}-${entry.unit}`}
                    className="rounded-full border border-border bg-bg px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-text"
                  >
                    {entry.missing}
                    {entry.unit === "u." ? " u." : entry.unit} {entry.name}
                  </span>
                ))}
              </div>
            )}
            {reviewList.length > 0 && (
              <div className={`flex flex-wrap gap-1.5 ${shoppingList.length > 0 ? "mt-2" : ""}`}>
                {reviewList.map((entry) => (
                  <span
                    key={entry.title}
                    className="rounded-full border border-rust/50 bg-rust/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-rust inline-flex items-center gap-1"
                  >
                    <TriangleAlert size={16} strokeWidth={1.8} /> Revisar: {entry.title} ({entry.note})
                  </span>
                ))}
              </div>
            )}
          </>
        )}

        {(shoppingList.length > 0 || reviewList.length > 0) && (
          <div className="mt-3 border-t border-dashed border-gold/30 pt-2.5">
            <button
              type="button"
              onClick={() => {
                setShowExport((prev) => !prev);
                setCopyStatus("");
              }}
              className="w-full rounded-lg border border-gold/60 bg-gold/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-gold"
            >
              {showExport ? "Ocultar" : <span className="inline-flex items-center gap-1"><Share2 size={16} strokeWidth={1.8} /> Exportar lista</span>}
            </button>
            {showExport && (
              <div className="mt-2">
                <textarea
                  readOnly
                  rows={Math.min(20, shoppingListText.split("\n").length)}
                  value={shoppingListText}
                  onFocus={(event) => event.target.select()}
                  className="w-full font-mono text-[10px]"
                />
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={copyShoppingList}
                    className="rounded-lg border border-gold/60 bg-gold px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-white"
                  >
                    Copiar texto
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(shoppingListText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-sage/50 bg-sage/10 px-3 py-2 text-center font-mono text-[10px] uppercase tracking-wide text-sage"
                  >
                    Enviar por WhatsApp
                  </a>
                </div>
                {copyStatus && <div className="mt-1.5 text-[11px] text-textMuted">{copyStatus}</div>}
              </div>
            )}
          </div>
        )}
      </div>

      {pickerFor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm" onClick={() => setPickerFor(null)}>
          <div
            className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-baseline justify-between gap-2">
              <div className="font-display text-lg text-text">
                {MEAL_LABELS[pickerFor.meal]} · {DOW_FULL[new Date(`${pickerFor.fecha}T00:00:00`).getDay()]}
              </div>
              {hasNutricionistaLink && slotIndex >= 0 && (
                <div className="shrink-0 font-mono text-[10px] text-textMuted">
                  {slotIndex + 1} de {slots.length}
                </div>
              )}
            </div>
            {hasNutricionistaLink && slotIndex >= 0 && (
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surfaceAlt">
                <div className="h-full bg-gold" style={{ width: `${((slotIndex + 1) / slots.length) * 100}%` }} />
              </div>
            )}
            {!hasNutricionistaLink && (
              <div className="mt-3">
                <label className="mb-1 block">Agregar algo distinto</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={customText}
                    onChange={(event) => setCustomText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && customText.trim()) assign(pickerFor.fecha, pickerFor.meal, customText.trim());
                    }}
                    placeholder="Ej: Tarta de jamón y queso"
                    className="flex-1"
                  />
                  <button
                    type="button"
                    disabled={!customText.trim()}
                    onClick={() => assign(pickerFor.fecha, pickerFor.meal, customText.trim())}
                    className="shrink-0 rounded-lg border border-gold/60 bg-gold px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white disabled:opacity-40"
                  >
                    + Agregar
                  </button>
                </div>
                <div className="mt-1 text-[10px] text-textMuted">
                  No suma a la lista de compras (no sabemos los ingredientes de algo escrito a mano) — para eso, elegí una receta del catálogo de abajo.
                </div>
              </div>
            )}

            <div className="mt-3 space-y-2">
              {(() => {
                const currentValue = weekPlan[pickerFor.fecha]?.[pickerFor.meal];
                if (isSkipped(currentValue)) {
                  return (
                    <button
                      type="button"
                      onClick={() => assign(pickerFor.fecha, pickerFor.meal, null)}
                      className="w-full rounded-lg border border-border px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wide text-textMuted"
                    >
                      Deshacer "no planificar"
                    </button>
                  );
                }
                const currentRecipe = currentValue ? RECIPES.find((r) => r.title === currentValue) : undefined;
                return (
                  <>
                    {currentRecipe && (
                      <div className="rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-[11px] text-gold">
                        Porción recomendada: {portionText(recommendedPortion(currentRecipe, pickerFor.meal, dailyGoal, proteinTargetG).ingredients)}
                      </div>
                    )}
                    {currentValue && (
                      <button
                        type="button"
                        onClick={() => assign(pickerFor.fecha, pickerFor.meal, null)}
                        className="w-full rounded-lg border border-rust/50 bg-rust/10 px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wide text-rust"
                      >
                        Quitar comida elegida
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => assign(pickerFor.fecha, pickerFor.meal, SKIP_MEAL)}
                      className="w-full rounded-lg border border-border bg-bg/40 px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wide text-textMuted"
                    >
                      No voy a planificar esto (ej. viaje)
                    </button>
                  </>
                );
              })()}

              {planSuggestions.length > 0 && (
                <div className="space-y-1.5">
                  <div className="font-mono text-[9px] uppercase tracking-wide text-sage">Tu plan nutricional · elegí una</div>
                  {planSuggestions.map((opt) => {
                    const chosen = weekPlan[pickerFor.fecha]?.[pickerFor.meal] === opt.nombre;
                    return (
                      <button
                        key={`plan-${opt.nombre}`}
                        type="button"
                        onClick={() => {
                          assign(pickerFor.fecha, pickerFor.meal, chosen ? null : opt.nombre, false);
                          // elegir una opción nueva pasa solo a la siguiente comida (sacarla no)
                          if (!chosen) goToSlot(1);
                        }}
                        className={`w-full rounded-lg border p-2.5 text-left ${chosen ? "border-gold bg-gold/10" : "border-sage/50 bg-sage/5"}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-semibold">
                            {chosen && <span className="mr-1 text-gold">✓</span>}
                            {opt.nombre} <LevelChip option={opt} />
                          </div>
                          <div className="shrink-0 font-mono text-[9px] uppercase tracking-wide text-textMuted">
                            {opt.kcal} kcal · {opt.protein}g
                          </div>
                        </div>
                        {quantities(opt) && <div className="mt-1 text-[11px] text-textMuted">{quantities(opt)}</div>}
                        {!opt.ingredientes?.length && (
                          <div className="mt-1 font-mono text-[9px] uppercase tracking-wide text-textMuted">
                            sin ingredientes cargados (no suma a la lista de compras)
                          </div>
                        )}
                        {opt.explicacion && <div className="mt-1 text-[11px] italic text-textMuted">{opt.explicacion}</div>}
                      </button>
                    );
                  })}
                  {weekPlan[pickerFor.fecha]?.[pickerFor.meal] && planSuggestions.some((o) => o.nombre === weekPlan[pickerFor.fecha]?.[pickerFor.meal]) && (
                    <div className="rounded-lg border border-border bg-bg/40 p-2.5">
                      <div className="mb-1 font-mono text-[9px] uppercase tracking-wide text-textMuted">Para tu Nutricionista (opcional)</div>
                      <textarea
                        value={selection.feedback[pickerFor.fecha]?.[pickerFor.meal]?.motivo || ""}
                        onChange={(event) =>
                          selection.setFeedbackFor(pickerFor.fecha, pickerFor.meal, {
                            ...selection.feedback[pickerFor.fecha]?.[pickerFor.meal],
                            motivo: event.target.value,
                          })
                        }
                        placeholder="¿Por qué elegiste esta? (ej: me queda cómoda, me gusta)"
                        rows={2}
                        maxLength={300}
                        className="w-full text-[12px]"
                      />
                      <textarea
                        value={selection.feedback[pickerFor.fecha]?.[pickerFor.meal]?.sugerencia || ""}
                        onChange={(event) =>
                          selection.setFeedbackFor(pickerFor.fecha, pickerFor.meal, {
                            ...selection.feedback[pickerFor.fecha]?.[pickerFor.meal],
                            sugerencia: event.target.value,
                          })
                        }
                        placeholder="¿Querés sugerir algún cambio? (ej: cambiar el pollo por pescado)"
                        rows={2}
                        maxLength={300}
                        className="mt-1.5 w-full text-[12px]"
                      />
                    </div>
                  )}
                </div>
              )}

              {hasNutricionistaLink
                ? planSuggestions.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border p-3 text-[12px] text-textMuted">
                      Tu Nutricionista no planificó {MEAL_LABELS[pickerFor.meal].toLowerCase()} para este día.
                    </div>
                  )
                : personalSuggestions.length === 0 && catalogSuggestions.length === 0 && planSuggestions.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border p-3 text-[12px] text-textMuted">
                      Todavía no hay recetas ni comidas guardadas para {MEAL_LABELS[pickerFor.meal].toLowerCase()}.
                    </div>
                  )}

              {!hasNutricionistaLink && (
                <>
                  {personalSuggestions.map((entry) => (
                    <button
                      key={`mem-${entry.text}`}
                      type="button"
                      onClick={() => assign(pickerFor.fecha, pickerFor.meal, entry.text)}
                      className="w-full rounded-lg border border-sage/40 bg-sage/10 p-2.5 text-left"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold">{entry.text}</div>
                        <div className="font-mono text-[9px] uppercase tracking-wide text-sage">tu memoria</div>
                      </div>
                      <div className="mt-1 font-mono text-[9px] uppercase tracking-wide text-textMuted">
                        {entry.kcal} kcal · {entry.protein}g prot
                      </div>
                    </button>
                  ))}

                  {catalogSuggestions.map((recipe) => {
                    const portion = recommendedPortion(recipe, pickerFor.meal, dailyGoal, proteinTargetG);
                    return (
                      <button
                        key={recipe.title}
                        type="button"
                        onClick={() => assign(pickerFor.fecha, pickerFor.meal, recipe.title)}
                        className="w-full rounded-lg border border-border bg-bg/40 p-2.5 text-left"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-semibold">{recipe.title}</div>
                          <div className="font-mono text-[9px] uppercase tracking-wide text-gold">{recipe.time}</div>
                        </div>
                        <div className="mt-1 font-mono text-[9px] uppercase tracking-wide text-textMuted">
                          {recipe.kcal} kcal · {recipe.protein}g prot (receta completa)
                        </div>
                        <div className="mt-1 rounded-md border border-gold/30 bg-gold/5 px-1.5 py-1 text-[10px] text-gold">
                          Porción para vos: {portionText(portion.ingredients)}
                        </div>
                      </button>
                    );
                  })}
                </>
              )}
            </div>
            {!hasNutricionistaLink && (personalSuggestions.length > 0 || catalogSuggestions.length > 0) && (
              <div className="mt-2 text-[10px] text-textMuted">
                Las recetas del catálogo suman a la lista de compras; lo de tu memoria no (no sabemos los ingredientes exactos).
              </div>
            )}
            {hasNutricionistaLink && slotIndex >= 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" disabled={slotIndex === 0} onClick={() => goToSlot(-1)} className={btn("neutral", "sm", true)}>
                  ← Anterior
                </button>
                <button type="button" disabled={slotIndex >= slots.length - 1} onClick={() => goToSlot(1)} className={btn("secondary", "sm", true)}>
                  Siguiente →
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => setPickerFor(null)}
              className={`${btn(hasNutricionistaLink ? "primary" : "neutral", "md", true)} mt-3`}
            >
              {hasNutricionistaLink ? "Listo" : "Cerrar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
