"use client";

import { useState } from "react";
import { DayEntry, DayMealOptions, MealKey, MEAL_LABELS, MEAL_LEVEL_LABELS, MealLevel, MealOption, Weekday, WeekPlan, WEEKDAYS } from "@/lib/types";
import { classifyMeal, levelOf, MealCompliance, MealStatus } from "@/lib/planCompliance";
import { getMealItems, suggestedMeal } from "@/lib/calculations";
import { btn } from "@/components/buttonStyles";
import { useEscapeKey } from "@/lib/useEscapeKey";

const MEAL_KEYS: MealKey[] = ["des", "alm", "mer", "cen", "col"];
const MEAL_SHORT: Record<MealKey, string> = { des: "D", alm: "A", mer: "M", cen: "C", col: "Co" };
const DOW_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const OPTION_LETTERS = "ABCDEF";

type PlanDays = Partial<Record<Weekday, DayMealOptions>>;

/** Color de fondo de cada estado (mismos tokens del tema: verde, ámbar, violeta, rojo). */
const STATUS_STYLE: Record<MealStatus, { bg: string; text: string; mark: string }> = {
  optima: { bg: "rgb(var(--color-accent))", text: "#ffffff", mark: "★" },
  buena: { bg: "rgb(var(--color-sage))", text: "#0f3d2d", mark: "✓" },
  ocasional: { bg: "rgb(var(--color-carbs))", text: "#4a2f00", mark: "≈" },
  fuera_ok: { bg: "rgb(var(--color-carbs))", text: "#4a2f00", mark: "?" },
  fuera_lejos: { bg: "rgb(var(--color-rust))", text: "#ffffff", mark: "✕" },
  saltada: { bg: "rgb(var(--color-rust))", text: "#ffffff", mark: "✕" },
  pendiente: { bg: "transparent", text: "rgb(var(--color-text-muted))", mark: "" },
};

const LEVEL_STYLE: Record<MealLevel, { bg: string; text: string }> = {
  optima: { bg: "rgb(var(--color-accent))", text: "#ffffff" },
  buena: { bg: "rgb(var(--color-sage))", text: "#0f3d2d" },
  ocasional: { bg: "rgb(var(--color-carbs))", text: "#4a2f00" },
};

export function LevelChip({ option }: { option: MealOption }) {
  const level = levelOf(option);
  return (
    <span
      className="shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase leading-none tracking-wide"
      style={{ background: LEVEL_STYLE[level].bg, color: LEVEL_STYLE[level].text }}
    >
      {MEAL_LEVEL_LABELS[level]}
    </span>
  );
}

/** Fondo / texto / borde de un casillero según su estado; lo provisorio usa el color del nivel atenuado y borde punteado. */
function cellStyle(compliance: MealCompliance | null) {
  if (compliance?.provisional) {
    const level = LEVEL_STYLE[compliance.provisional.level];
    return {
      background: `color-mix(in srgb, ${level.bg} 28%, transparent)`,
      color: "rgb(var(--color-text))",
      border: `1.5px dashed ${level.bg}`,
      mark: STATUS_STYLE[compliance.provisional.level].mark,
    };
  }
  const style = STATUS_STYLE[compliance?.status ?? "pendiente"];
  return {
    background: style.bg,
    color: style.text,
    border: compliance?.status === "pendiente" ? "1px dashed rgb(var(--color-border))" : `1px solid ${style.bg}`,
    mark: style.mark,
  };
}

function weekdayOf(fecha: string): Weekday {
  return WEEKDAYS[new Date(`${fecha}T00:00:00`).getDay()];
}

function dateLabel(fecha: string) {
  const date = new Date(`${fecha}T00:00:00`);
  return `${DOW_SHORT[date.getDay()]} ${date.getDate()}/${date.getMonth() + 1}`;
}

export function quantities(option: MealOption) {
  if (!option.ingredientes || option.ingredientes.length === 0) return null;
  return option.ingredientes.map((ing) => `${ing.name} ${ing.quantity}${ing.unit === "u." ? " u." : ` ${ing.unit}`}`).join(" · ");
}

function StatusBadge({ compliance }: { compliance: MealCompliance }) {
  const style = STATUS_STYLE[compliance.status];
  return (
    <span
      className="rounded-full px-2 py-1 font-mono text-[9px] font-bold uppercase leading-none tracking-wide"
      style={{
        background: style.bg,
        color: style.text,
        border: compliance.status === "pendiente" ? "1px dashed rgb(var(--color-text-muted))" : undefined,
      }}
    >
      {compliance.label}
    </span>
  );
}

function OptionList({ options, matched }: { options: MealOption[]; matched?: MealOption }) {
  return (
    <div className="space-y-2">
      {options.map((option, index) => (
        <div key={option.nombre} className="rounded-lg border border-border/70 bg-bg/30 p-2">
          <div className="flex items-start gap-2">
            <span
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full font-mono text-[9px] font-bold ${
                index === 0 ? "bg-gold text-white" : "border border-border text-textMuted"
              }`}
            >
              {OPTION_LETTERS[index]}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] font-semibold text-text">
                  {option.nombre} <LevelChip option={option} />
                  {matched && matched.nombre === option.nombre && <span className="ml-1 text-sage">✓ la que comiste</span>}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-textMuted">
                  {option.kcal} kcal · {option.protein} g
                </span>
              </div>
              {quantities(option) && <div className="mt-0.5 text-[11px] text-textMuted">{quantities(option)}</div>}
              {option.explicacion && <div className="mt-0.5 text-[11px] italic text-textMuted">{option.explicacion}</div>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MealDetailSheet({
  fecha,
  meal,
  options,
  compliance,
  entry,
  onClose,
}: {
  fecha: string;
  meal: MealKey;
  options: MealOption[];
  compliance: MealCompliance | null;
  entry: DayEntry | undefined;
  onClose: () => void;
}) {
  useEscapeKey(onClose, true);
  const items = entry ? getMealItems(entry, meal) : [];
  const omisiones = (entry?.omisiones || []).filter((o) => o.comida === meal);
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-bg/80 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-surface p-4 shadow-2xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">{dateLabel(fecha)}</div>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <div className="font-display text-xl text-text">{MEAL_LABELS[meal]}</div>
          {compliance && <StatusBadge compliance={compliance} />}
        </div>

        <div className="mb-1 mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-textMuted">Lo que dice el plan</div>
        <OptionList options={options} matched={compliance?.matched} />

        <div className="mb-1 mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-textMuted">Lo que comiste</div>
        {items.length > 0 ? (
          <div className="space-y-1">
            {items.map((item) => (
              <div key={item.id} className="flex items-baseline justify-between gap-2 rounded-lg border border-border/70 bg-bg/30 px-2 py-1.5 text-[12px]">
                <span className="text-text">{item.nombre}</span>
                <span className="shrink-0 font-mono text-[10px] text-textMuted">
                  {item.kcal} kcal · {item.protein} g
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-2 text-[12px] text-textMuted">
            {compliance?.status === "saltada" ? "No cargaste esta comida." : "Todavía no cargaste nada."}
          </div>
        )}

        {omisiones.map((o, index) => (
          <div key={index} className="mt-3 rounded-lg border border-rust/40 bg-rust/10 p-2 text-[12px] text-text">
            <span className="font-semibold">
              {o.motivo === "alergia" ? "Alergia" : o.motivo === "no_le_gusta" ? "No le gusta" : "Motivo"}:
            </span>{" "}
            {o.nota || o.alimento}
          </div>
        ))}

        <button type="button" onClick={onClose} className={`${btn("neutral", "md", true)} mt-4`}>
          Cerrar
        </button>
      </div>
    </div>
  );
}

/**
 * "Lo que te toca comer hoy" -- siempre es el primer bloque de Comidas, fijo (no se puede ocultar ni mover).
 * Las comidas del día con las opciones de la Nutricionista (cada una con su nivel y cantidades): se elige una y
 * aparece "Agregar a comidas". A medida que avanza el día (porque ya la cargaste o porque ya pasó su hora) las
 * comidas se colapsan a una línea y queda abierta solo la que sigue; la colación queda aparte, siempre cerrada
 * hasta que se la toca.
 */
const MAIN_MEALS: MealKey[] = ["des", "alm", "mer", "cen"];

export function TodayMeals({
  todayFecha,
  plan,
  days,
  weekPlan,
  onAddPlanned,
}: {
  todayFecha: string;
  plan: PlanDays;
  days: DayEntry[];
  /** Lo que eligió en el planificador: aparece ya marcado como "tu elección". */
  weekPlan: WeekPlan;
  /** Carga la opción elegida como comida de hoy. */
  onAddPlanned: (meal: MealKey, option: MealOption) => string | void;
}) {
  const [open, setOpen] = useState<MealKey | null>(null);
  const [picked, setPicked] = useState<Partial<Record<MealKey, number>>>({});
  const [expanded, setExpanded] = useState<Partial<Record<MealKey, boolean>>>({});
  const [notice, setNotice] = useState("");
  const dayOptions = plan[weekdayOf(todayFecha)];
  if (!dayOptions) return null;
  const entry = days.find((d) => d.fecha === todayFecha);

  // La comida que sigue en orden cronológico: la que sugiere la hora, salteando las ya cargadas.
  const hasItems = (meal: MealKey) => (entry ? getMealItems(entry, meal).length > 0 : false);
  const suggested = suggestedMeal(entry, new Date().getHours());
  const startIdx = Math.max(0, MAIN_MEALS.indexOf(suggested as MealKey));
  const currentMeal =
    suggested === "col"
      ? null
      : [...MAIN_MEALS.slice(startIdx), ...MAIN_MEALS.slice(0, startIdx)].find((m) => (dayOptions[m]?.length ?? 0) > 0 && !hasItems(m)) ?? null;

  return (
    <section className="mb-4 rounded-2xl border border-border bg-surface/70 p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Hoy · {dateLabel(todayFecha)}</div>
      <div className="font-display text-xl text-text">Lo que te toca comer</div>
      <div className="mt-2 space-y-2">
        {[...MAIN_MEALS, "col" as MealKey].map((meal) => {
          const options = dayOptions[meal];
          if (!options || options.length === 0) return null;
          const plannedTitle = weekPlan[todayFecha]?.[meal];
          const compliance = classifyMeal(options, entry, meal, todayFecha, todayFecha, plannedTitle);
          const style = STATUS_STYLE[compliance?.status ?? "pendiente"];
          const alreadyLoaded = Boolean(compliance?.real);
          const matchedIndex = compliance?.matched ? options.findIndex((opt) => opt.nombre === compliance.matched!.nombre) : -1;
          const chosenIndex = plannedTitle ? options.findIndex((opt) => opt.nombre === plannedTitle) : -1;
          const selectedIndex = alreadyLoaded ? matchedIndex : picked[meal] ?? chosenIndex;
          const isOpen = expanded[meal] ?? (meal === currentMeal);
          const summary = compliance?.real
            ? compliance.real.nombres.join(", ")
            : chosenIndex >= 0
              ? `Tu elección: ${options[chosenIndex].nombre}`
              : meal === "col"
                ? "Opcional · tocá para ver"
                : "Elegí una opción";
          return (
            <div key={meal} className={`rounded-xl border bg-bg/30 p-2.5 ${isOpen ? "border-gold/50" : "border-border"}`}>
              <button
                type="button"
                onClick={() => setExpanded((prev) => ({ ...prev, [meal]: !isOpen }))}
                className="flex w-full items-center justify-between gap-2 text-left"
                aria-expanded={isOpen}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: style.bg, border: compliance?.status === "pendiente" ? "1px dashed rgb(var(--color-text-muted))" : undefined }}
                  />
                  <span className="shrink-0 text-[13px] font-semibold text-text">{MEAL_LABELS[meal]}</span>
                  {!isOpen && <span className="min-w-0 truncate text-[11px] text-textMuted">{summary}</span>}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {isOpen && !(compliance && compliance.status !== "pendiente") && (
                    <span className="font-mono text-[9px] uppercase tracking-wide text-textMuted">
                      {chosenIndex >= 0 && picked[meal] === undefined ? "Tu elección" : "Elegí una opción"}
                    </span>
                  )}
                  {compliance && compliance.status !== "pendiente" && (
                    <span
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpen(meal);
                      }}
                    >
                      <StatusBadge compliance={compliance} />
                    </span>
                  )}
                  <span className="font-mono text-[11px] text-textMuted" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                    ▾
                  </span>
                </span>
              </button>

              {isOpen && (
                <>
                  <div className="mt-1.5 space-y-1.5">
                    {options.map((option, index) => {
                      // Ya cargada: solo la opción que comió (las otras se ven tocando el color)
                      if (alreadyLoaded && index !== selectedIndex && selectedIndex >= 0) return null;
                      const selected = selectedIndex === index;
                      return (
                        <button
                          key={option.nombre}
                          type="button"
                          disabled={alreadyLoaded}
                          onClick={() => setPicked((prev) => ({ ...prev, [meal]: prev[meal] === index ? undefined : index }))}
                          className={`block w-full rounded-lg border p-2 text-left ${
                            selected ? "border-gold bg-gold/10" : "border-border/70 bg-bg/20"
                          } ${alreadyLoaded && !selected ? "opacity-60" : ""}`}
                        >
                          <div className="flex items-start gap-2">
                            <span
                              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border font-mono text-[9px] font-bold ${
                                selected ? "border-gold bg-gold text-white" : "border-border text-textMuted"
                              }`}
                            >
                              {selected ? "✓" : OPTION_LETTERS[index]}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-baseline justify-between gap-2">
                                <span className="min-w-0 flex-1 truncate text-[13px] text-text">
                                  {option.nombre} <LevelChip option={option} />
                                </span>
                                <span className="shrink-0 font-mono text-[10px] text-textMuted">
                                  {option.kcal} kcal · {option.protein} g
                                </span>
                              </span>
                              {quantities(option) && (
                                <span className={`mt-0.5 block text-[11px] text-textMuted ${selected ? "" : "truncate"}`}>{quantities(option)}</span>
                              )}
                              {selected && option.explicacion && <span className="mt-0.5 block text-[11px] italic text-textMuted">{option.explicacion}</span>}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {!alreadyLoaded && selectedIndex >= 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const message = onAddPlanned(meal, options[selectedIndex]);
                        setPicked((prev) => ({ ...prev, [meal]: undefined }));
                        // al cargarla, esta comida se colapsa y pasa a estar abierta la que sigue
                        setExpanded((prev) => ({ ...prev, [meal]: undefined }));
                        setNotice(typeof message === "string" ? message : "");
                        setTimeout(() => setNotice(""), 7000);
                      }}
                      className={`${btn("primary", "md", true)} mt-2`}
                    >
                      + Agregar a comidas
                    </button>
                  )}
                  {compliance?.real && (
                    <div className="mt-2 border-t border-dashed border-border pt-1.5 text-[12px] text-text">
                      Comiste: <span className="font-semibold">{compliance.real.nombres.join(", ")}</span>{" "}
                      <span className="text-textMuted">
                        ({compliance.real.kcal} kcal · {compliance.real.protein} g)
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
      {notice && <div className="mt-2 rounded-lg border border-sage/40 bg-sage/10 px-2.5 py-2 text-[12px] text-sage">{notice}</div>}
      {open && dayOptions[open] && (
        <MealDetailSheet
          fecha={todayFecha}
          meal={open}
          options={dayOptions[open]!}
          compliance={classifyMeal(dayOptions[open], entry, open, todayFecha, todayFecha, weekPlan[todayFecha]?.[open])}
          entry={entry}
          onClose={() => setOpen(null)}
        />
      )}
    </section>
  );
}

/** Almanaque de la semana: 7 días × 5 comidas en casilleros chicos. Al tocar uno se abre el detalle. */
export function WeekAlmanaque({
  weekDates,
  plan,
  days,
  todayFecha,
  weekPlan,
}: {
  weekDates: string[];
  plan: PlanDays;
  days: DayEntry[];
  todayFecha: string;
  /** Lo elegido en el planificador: se ve como provisorio hasta que se carga de verdad. */
  weekPlan: WeekPlan;
}) {
  const [open, setOpen] = useState<{ fecha: string; meal: MealKey } | null>(null);
  const first = new Date(`${weekDates[0]}T00:00:00`);
  const last = new Date(`${weekDates[weekDates.length - 1]}T00:00:00`);

  const openOptions = open ? plan[weekdayOf(open.fecha)]?.[open.meal] : undefined;
  const openEntry = open ? days.find((d) => d.fecha === open.fecha) : undefined;

  return (
    <section className="rounded-2xl border border-border bg-surface/70 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Plan semanal</div>
        <div className="font-mono text-[10px] text-textMuted">
          {first.getDate()}/{first.getMonth() + 1}–{last.getDate()}/{last.getMonth() + 1}
        </div>
      </div>

      <div className="grid items-center gap-1" style={{ gridTemplateColumns: "22px repeat(7, minmax(0, 1fr))" }}>
        <div />
        {weekDates.map((fecha) => {
          const date = new Date(`${fecha}T00:00:00`);
          const isToday = fecha === todayFecha;
          return (
            <div key={fecha} className={`pb-0.5 text-center font-mono text-[9px] uppercase leading-tight ${isToday ? "font-bold text-gold" : "text-textMuted"}`}>
              {DOW_SHORT[date.getDay()]}
              <br />
              {date.getDate()}
            </div>
          );
        })}
        {MEAL_KEYS.map((meal) => (
          <div key={meal} className="contents">
            <div className="text-center font-mono text-[10px] font-bold text-textMuted">{MEAL_SHORT[meal]}</div>
            {weekDates.map((fecha) => {
              const options = plan[weekdayOf(fecha)]?.[meal];
              if (!options || options.length === 0) {
                return <div key={fecha} className="aspect-square rounded-lg bg-bg/30" />;
              }
              const compliance = classifyMeal(options, days.find((d) => d.fecha === fecha), meal, fecha, todayFecha, weekPlan[fecha]?.[meal]);
              const style = cellStyle(compliance);
              return (
                <button
                  key={fecha}
                  type="button"
                  aria-label={`${dateLabel(fecha)} ${MEAL_LABELS[meal]}: ${compliance?.label ?? ""}`}
                  onClick={() => setOpen({ fecha, meal })}
                  className="flex aspect-square items-center justify-center rounded-lg text-[13px] font-bold"
                  style={{
                    background: style.background,
                    color: style.color,
                    border: style.border,
                    outline: fecha === todayFecha ? "2px solid rgb(var(--color-accent) / 0.5)" : undefined,
                    outlineOffset: fecha === todayFecha ? 1 : undefined,
                  }}
                >
                  {style.mark}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-textMuted">
        {(
          [
            ["optima", "Perfecta"],
            ["buena", "Buena"],
            ["ocasional", "Ocasional / fuera del plan"],
            ["fuera_lejos", "Lejos del objetivo / salteada"],
            ["pendiente", "Pendiente (punteado: elegida, sin cargar)"],
          ] as [MealStatus, string][]
        ).map(([status, label]) => (
          <span key={status} className="inline-flex items-center gap-1">
            <i
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: STATUS_STYLE[status].bg, border: status === "pendiente" ? "1px dashed rgb(var(--color-text-muted))" : undefined }}
            />
            {label}
          </span>
        ))}
      </div>

      {open && openOptions && (
        <MealDetailSheet
          fecha={open.fecha}
          meal={open.meal}
          options={openOptions}
          compliance={classifyMeal(openOptions, openEntry, open.meal, open.fecha, todayFecha, weekPlan[open.fecha]?.[open.meal])}
          entry={openEntry}
          onClose={() => setOpen(null)}
        />
      )}
    </section>
  );
}
