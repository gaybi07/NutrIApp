"use client";

import { useState } from "react";
import { DayEntry, DayMealOptions, MealKey, MEAL_LABELS, MealOption, Weekday, WEEKDAYS } from "@/lib/types";
import { classifyMeal, MealCompliance, MealStatus } from "@/lib/planCompliance";
import { getMealItems } from "@/lib/calculations";
import { btn } from "@/components/buttonStyles";
import { useEscapeKey } from "@/lib/useEscapeKey";

const MEAL_KEYS: MealKey[] = ["des", "alm", "mer", "cen", "col"];
const MEAL_SHORT: Record<MealKey, string> = { des: "D", alm: "A", mer: "M", cen: "C", col: "Co" };
const DOW_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const OPTION_LETTERS = "ABCDEF";

type PlanDays = Partial<Record<Weekday, DayMealOptions>>;

/** Color de fondo de cada estado (mismos tokens del tema: verde, ámbar, violeta, rojo). */
const STATUS_STYLE: Record<MealStatus, { bg: string; text: string; mark: string }> = {
  igual: { bg: "rgb(var(--color-sage))", text: "#0f3d2d", mark: "✓" },
  cantidad: { bg: "rgb(var(--color-carbs))", text: "#4a2f00", mark: "≈" },
  otra_ok: { bg: "rgb(var(--color-accent))", text: "#ffffff", mark: "★" },
  otra_lejos: { bg: "rgb(var(--color-rust))", text: "#ffffff", mark: "✕" },
  saltada: { bg: "rgb(var(--color-rust))", text: "#ffffff", mark: "✕" },
  pendiente: { bg: "transparent", text: "rgb(var(--color-text-muted))", mark: "" },
};

function weekdayOf(fecha: string): Weekday {
  return WEEKDAYS[new Date(`${fecha}T00:00:00`).getDay()];
}

function dateLabel(fecha: string) {
  const date = new Date(`${fecha}T00:00:00`);
  return `${DOW_SHORT[date.getDay()]} ${date.getDate()}/${date.getMonth() + 1}`;
}

function quantities(option: MealOption) {
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
                  {option.nombre}
                  {matched && matched.nombre === option.nombre && <span className="ml-1 text-sage">✓</span>}
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
 * "Lo que te toca comer hoy" -- siempre es el primer bloque de Comidas,
 * abierto y fijo (no se puede ocultar ni mover). Las 5 comidas del día con
 * las opciones de la Nutricionista y sus cantidades; si ya comió, lo que
 * cargó y el color.
 */
export function TodayMeals({
  todayFecha,
  plan,
  days,
}: {
  todayFecha: string;
  plan: PlanDays;
  days: DayEntry[];
}) {
  const [open, setOpen] = useState<MealKey | null>(null);
  const dayOptions = plan[weekdayOf(todayFecha)];
  if (!dayOptions) return null;
  const entry = days.find((d) => d.fecha === todayFecha);

  return (
    <section className="mb-4 rounded-2xl border border-border bg-surface/70 p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Hoy · {dateLabel(todayFecha)}</div>
      <div className="font-display text-xl text-text">Lo que te toca comer</div>
      <div className="mt-2 space-y-2">
        {MEAL_KEYS.map((meal) => {
          const options = dayOptions[meal];
          if (!options || options.length === 0) return null;
          const compliance = classifyMeal(options, entry, meal, todayFecha, todayFecha);
          const style = STATUS_STYLE[compliance?.status ?? "pendiente"];
          return (
            <button
              key={meal}
              type="button"
              onClick={() => setOpen(meal)}
              className="block w-full rounded-xl border border-border bg-bg/30 p-2.5 text-left"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-[13px] font-semibold text-text">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: style.bg, border: compliance?.status === "pendiente" ? "1px dashed rgb(var(--color-text-muted))" : undefined }}
                  />
                  {MEAL_LABELS[meal]}
                </span>
                {compliance && compliance.status !== "pendiente" && <StatusBadge compliance={compliance} />}
              </div>
              <div className="mt-1.5 space-y-1">
                {options.slice(0, 3).map((option, index) => (
                  <div key={option.nombre} className="text-[12px]">
                    <div className="flex items-baseline gap-2">
                      <span className={`font-mono text-[9px] font-bold ${index === 0 ? "text-gold" : "text-textMuted"}`}>{OPTION_LETTERS[index]}</span>
                      <span className="flex-1 text-text">{option.nombre}</span>
                      <span className="shrink-0 font-mono text-[10px] text-textMuted">
                        {option.kcal} kcal · {option.protein} g
                      </span>
                    </div>
                    {quantities(option) && <div className="pl-4 text-[11px] text-textMuted">{quantities(option)}</div>}
                  </div>
                ))}
              </div>
              {compliance?.real && (
                <div className="mt-1.5 border-t border-dashed border-border pt-1.5 text-[12px] text-text">
                  Comiste: <span className="font-semibold">{compliance.real.nombres.join(", ")}</span>{" "}
                  <span className="text-textMuted">
                    ({compliance.real.kcal} kcal · {compliance.real.protein} g)
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
      {open && dayOptions[open] && (
        <MealDetailSheet
          fecha={todayFecha}
          meal={open}
          options={dayOptions[open]!}
          compliance={classifyMeal(dayOptions[open], entry, open, todayFecha, todayFecha)}
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
}: {
  weekDates: string[];
  plan: PlanDays;
  days: DayEntry[];
  todayFecha: string;
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
              const compliance = classifyMeal(options, days.find((d) => d.fecha === fecha), meal, fecha, todayFecha);
              const style = STATUS_STYLE[compliance?.status ?? "pendiente"];
              return (
                <button
                  key={fecha}
                  type="button"
                  aria-label={`${dateLabel(fecha)} ${MEAL_LABELS[meal]}: ${compliance?.label ?? ""}`}
                  onClick={() => setOpen({ fecha, meal })}
                  className="flex aspect-square items-center justify-center rounded-lg text-[13px] font-bold"
                  style={{
                    background: style.bg,
                    color: style.text,
                    border: compliance?.status === "pendiente" ? "1px dashed rgb(var(--color-border))" : `1px solid ${style.bg}`,
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
            ["igual", "Igual al plan"],
            ["cantidad", "Distinta cantidad"],
            ["otra_ok", "Otra cosa, cumplió"],
            ["otra_lejos", "Otra cosa / salteada"],
            ["pendiente", "Pendiente"],
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
          compliance={classifyMeal(openOptions, openEntry, open.meal, open.fecha, todayFecha)}
          entry={openEntry}
          onClose={() => setOpen(null)}
        />
      )}
    </section>
  );
}
