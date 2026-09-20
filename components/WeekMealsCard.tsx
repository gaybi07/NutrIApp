"use client";

import { useState } from "react";
import { DayEntry, emptyDay } from "@/lib/types";
import { fmtDate } from "@/lib/calculations";
import { Collapsible } from "@/components/Collapsible";
import { SECTION_HELP } from "@/lib/helpText";
import { MealsEditor, getMealsWithItems } from "@/components/MealsEditor";

const DOW_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/** Elegí cualquier día de la semana que se está mirando (arrastrada por
 * weekDates/weekDays desde Inicio) para ver y editar qué se comió ese día
 * — misma grilla que "Editar comidas de hoy", pero para cualquier fecha. */
export function WeekMealsCard({
  weekDates,
  weekDays,
  onUpsert,
  openOnDesktop,
}: {
  weekDates: string[];
  weekDays: Array<DayEntry | null>;
  onUpsert: (entry: DayEntry) => void;
  openOnDesktop?: boolean;
}) {
  const todayIso = fmtDate(new Date());
  const [selectedIndex, setSelectedIndex] = useState(() => Math.max(0, weekDates.indexOf(todayIso)));

  const selectedDate = weekDates[selectedIndex] || weekDates[0];
  const selectedEntry = weekDays[selectedIndex] || emptyDay(selectedDate);
  const selectedDay = new Date(`${selectedDate}T00:00:00`);

  return (
    <Collapsible eyebrow="Semana" title="Modificar comidas de la semana" info={SECTION_HELP.comidasSemana} openOnDesktop={openOnDesktop}>
      <div className="mb-3 grid grid-cols-7 gap-1">
        {weekDates.map((fecha, i) => {
          const date = new Date(`${fecha}T00:00:00`);
          const dayEntry = weekDays[i];
          const hasMeals = dayEntry ? getMealsWithItems(dayEntry).length > 0 : false;
          const active = i === selectedIndex;
          return (
            <button
              key={fecha}
              type="button"
              onClick={() => setSelectedIndex(i)}
              className={`flex flex-col items-center gap-1 rounded-lg border px-1 py-1.5 font-mono text-[9px] uppercase tracking-wide transition-colors ${
                active ? "border-gold bg-gold text-bg" : "border-border bg-bg/60 text-textMuted"
              }`}
            >
              <span>{DOW_SHORT[i]}</span>
              <span className="text-[11px] normal-case tracking-normal">{date.getDate()}</span>
              <span className={`h-1 w-1 rounded-full ${hasMeals ? (active ? "bg-bg" : "bg-sage") : "bg-transparent"}`} />
            </button>
          );
        })}
      </div>
      <MealsEditor
        entry={selectedEntry}
        onUpsert={onUpsert}
        emptyMessage={`No tenés comidas cargadas el ${DOW_SHORT[selectedIndex]} ${selectedDay.getDate()}.`}
      />
    </Collapsible>
  );
}
