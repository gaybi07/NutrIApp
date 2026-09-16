"use client";

import { DayEntry } from "@/lib/types";
import { Collapsible } from "@/components/Collapsible";
import { SECTION_HELP } from "@/lib/helpText";
import { MealsEditor, getMealsWithItems } from "@/components/MealsEditor";

export function TodayMealsBreakdown({
  entry,
  onUpsert,
  openOnDesktop,
}: {
  entry: DayEntry;
  onUpsert: (entry: DayEntry) => void;
  openOnDesktop?: boolean;
}) {
  if (getMealsWithItems(entry).length === 0) return null;

  return (
    <Collapsible eyebrow="Hoy" title="Editar comidas de hoy" info={SECTION_HELP.detalleComidas} openOnDesktop={openOnDesktop}>
      <MealsEditor entry={entry} onUpsert={onUpsert} />
    </Collapsible>
  );
}
