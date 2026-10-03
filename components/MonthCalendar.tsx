"use client";

import { useMemo, useState } from "react";
import { DayEntry, MEAL_LABELS, MealKey } from "@/lib/types";
import { addDays, dayGoal, dayProt, dayTotal, fmtDate, getMealItems, getTrainingSessions } from "@/lib/calculations";
import { DAY_STATUS_LABEL, DAY_STATUS_ORDER, dayGoalStatus } from "@/lib/dayStatus";
import { STATUS_BG, isGlow, statusCellStyle } from "@/components/WeekGoalGrid";
import { btn } from "@/components/buttonStyles";
import { computeMonthStandard } from "@/lib/monthStandard";
import { useEscapeKey } from "@/lib/useEscapeKey";

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DOW_HEAD = ["L", "M", "M", "J", "V", "S", "D"];
const DOW_FULL = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MEALS: MealKey[] = ["des", "alm", "mer", "cen", "col"];

/**
 * Almanaque del mes: los mismos cuadraditos del mini resumen semanal, un casillero por día. Los días ya cerrados llevan el color
 * de cómo salieron contra el objetivo completo; hoy va con un recuadro violeta y el color bien transparente (todavía en curso).
 * Al tocar un día se ve su resumen: kcal y proteína contra el objetivo, qué comió en cada comida, pasos y entrenamiento.
 */
export function MonthCalendar({
  days,
  todayFecha,
  goal,
  tdeeFallback,
  pesoKg,
  fixedGoal,
  proteinTarget,
  onClose,
}: {
  days: DayEntry[];
  todayFecha: string;
  goal: number;
  tdeeFallback: number;
  pesoKg: number;
  fixedGoal: boolean;
  proteinTarget: number;
  onClose: () => void;
}) {
  useEscapeKey(onClose, true);
  const today = new Date(`${todayFecha}T00:00:00`);
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selected, setSelected] = useState<string | null>(todayFecha);

  const cells = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1);
    const lead = (first.getDay() + 6) % 7; // lunes = 0
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const out: ({ fecha: string; day: number } | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= daysInMonth; d++) out.push({ fecha: fmtDate(addDays(first, d - 1)), day: d });
    return out;
  }, [cursor]);

  const byFecha = useMemo(() => new Map(days.map((d) => [d.fecha, d])), [days]);

  const info = (fecha: string) => {
    const entry = byFecha.get(fecha);
    const kcal = entry ? dayTotal(entry) : 0;
    const prot = entry ? dayProt(entry) : 0;
    const kcalGoal = entry ? dayGoal(entry, goal, tdeeFallback, pesoKg, fixedGoal) : goal;
    const status = kcal > 0 ? dayGoalStatus(kcal, kcalGoal, prot, proteinTarget) : null;
    return { entry, kcal, prot, kcalGoal, status };
  };

  const monthKey = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`;
  const standard = useMemo(
    () => computeMonthStandard(days, monthKey, todayFecha, goal, tdeeFallback, pesoKg, fixedGoal, proteinTarget),
    [days, monthKey, todayFecha, goal, tdeeFallback, pesoKg, fixedGoal, proteinTarget]
  );
  const picked = selected ? { fecha: selected, ...info(selected) } : null;
  const pickedDate = picked ? new Date(`${picked.fecha}T00:00:00`) : null;
  const shift = (delta: number) => {
    setSelected(null);
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-bg/80 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-md flex-col rounded-t-2xl border border-border bg-surface shadow-2xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 border-b border-border p-4 pb-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">Almanaque</div>
            <div className="font-display text-xl capitalize text-text">
              {MONTHS[cursor.month]} {cursor.year}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => shift(-1)} className={btn("neutral", "sm")} aria-label="Mes anterior">
              ◂
            </button>
            <button type="button" onClick={() => shift(1)} className={btn("neutral", "sm")} aria-label="Mes siguiente">
              ▸
            </button>
            <button type="button" onClick={onClose} className={btn("neutral", "sm")}>
              Cerrar
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-4 pt-3">
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-bg/40 px-3 py-2">
            <span
              className="inline-block h-6 w-6 shrink-0 rounded-md"
              style={standard.status ? (isGlow(standard.status) ? statusCellStyle(standard.status) : { background: STATUS_BG[standard.status] }) : { border: "1px dashed rgb(var(--color-text-muted))" }}
            />
            <div className="min-w-0 text-[12px] text-text">
              <div className="font-mono text-[9px] uppercase tracking-wide text-textMuted">Color del mes</div>
              {standard.status ? (
                <span>
                  {standard.status === "violeta" ? "Violeta" : standard.status === "verde" ? "Verde" : standard.status === "amarillo" ? "Amarillo" : "Rojo"} · {standard.counted} días registrados
                </span>
              ) : (
                <span className="text-textMuted">Juntando datos ({standard.counted} de 7 días mínimos)</span>
              )}
            </div>
          </div>
          <div className="mb-1 grid grid-cols-7 gap-1.5 text-center font-mono text-[9px] uppercase text-textMuted">
            {DOW_HEAD.map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((c, i) => {
              if (!c) return <span key={`e${i}`} />;
              const isToday = c.fecha === todayFecha;
              const future = c.fecha > todayFecha;
              const { status } = info(c.fecha);
              const painted = c.fecha < todayFecha ? status : null;
              return (
                <button
                  key={c.fecha}
                  type="button"
                  onClick={() => setSelected((prev) => (prev === c.fecha ? null : c.fecha))}
                  aria-label={`${c.day} de ${MONTHS[cursor.month]}`}
                  className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border font-mono text-[13px] font-bold ${
                    painted ? "border-transparent" : isToday ? "border-2 border-gold text-text" : "border-dashed border-border text-textMuted"
                  } ${future ? "opacity-50" : ""} ${selected === c.fecha ? "ring-2 ring-text/60 ring-offset-1 ring-offset-surface" : ""}`}
                  style={painted ? statusCellStyle(painted) : undefined}
                >
                  {isToday && status && <span aria-hidden className="absolute inset-0" style={{ background: STATUS_BG[status], opacity: 0.3 }} />}
                  <span className="relative">{c.day}</span>
                </button>
              );
            })}
          </div>

          {picked && pickedDate && (
            <div className="mt-3 rounded-lg border border-border bg-bg/40 px-3 py-2.5 text-[12px] text-text">
              <div className="font-mono text-[10px] uppercase tracking-wide text-textMuted">
                {DOW_FULL[pickedDate.getDay()]} {pickedDate.getDate()} de {MONTHS[pickedDate.getMonth()]}
              </div>
              {picked.status ? (
                <>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="inline-block h-4 w-4 shrink-0 rounded" style={isGlow(picked.status) ? statusCellStyle(picked.status) : { background: STATUS_BG[picked.status] }} />
                    <span className="font-semibold">
                      {picked.fecha === todayFecha ? "Hoy, todavía en curso" : DAY_STATUS_LABEL[picked.status]}
                    </span>
                  </div>
                  <div className="mt-1">
                    {picked.kcal.toLocaleString("es-AR")} de {picked.kcalGoal.toLocaleString("es-AR")} kcal · {picked.prot} de {proteinTarget} g de proteína
                  </div>
                </>
              ) : (
                <div className="mt-1 text-textMuted">{picked.fecha > todayFecha ? "Todavía no llegó." : "No cargaste nada ese día."}</div>
              )}

              {picked.entry && (
                <div className="mt-2 space-y-1">
                  {MEALS.map((meal) => {
                    const items = getMealItems(picked.entry!, meal);
                    const skipped = picked.entry!.omisiones?.some((o) => o.comida === meal && o.alimento === "__comida__");
                    if (items.length === 0 && !skipped) return null;
                    const kcal = Math.round(items.reduce((s, it) => s + it.kcal, 0));
                    return (
                      <div key={meal} className="flex items-baseline justify-between gap-2 border-t border-dashed border-border pt-1">
                        <span className="min-w-0">
                          <span className="font-semibold">{MEAL_LABELS[meal]}: </span>
                          {skipped && items.length === 0 ? (
                            <span className="text-rust">no la hice</span>
                          ) : (
                            <span className="text-textMuted">{Array.from(new Set(items.map((it) => it.grupoNombre || it.nombre))).join(", ")}</span>
                          )}
                        </span>
                        {items.length > 0 && <span className="shrink-0 font-mono text-[10px] text-textMuted">{kcal} kcal</span>}
                      </div>
                    );
                  })}
                  {(picked.entry.pasos || 0) > 0 && (
                    <div className="border-t border-dashed border-border pt-1 text-textMuted">Pasos: {(picked.entry.pasos || 0).toLocaleString("es-AR")}</div>
                  )}
                  {getTrainingSessions(picked.entry).length > 0 && (
                    <div className="text-textMuted">
                      Entrenamiento: {getTrainingSessions(picked.entry).map((s) => `${s.minutos ? s.minutos + " min " : ""}${s.intensidad}`).join(" + ")}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mt-3 grid grid-cols-1 gap-1 sm:grid-cols-2">
            {DAY_STATUS_ORDER.map((s) => (
              <div key={s} className="flex items-center gap-1.5 text-[10px] text-textMuted">
                <span className="inline-block h-3 w-3 shrink-0 rounded" style={isGlow(s) ? statusCellStyle(s) : { background: STATUS_BG[s] }} />
                {DAY_STATUS_LABEL[s]}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
