"use client";

import { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/**
 * Envoltorio para reordenar bloques grandes de una pantalla con una
 * "manito" (✋) chica en la esquina — se toca y mantiene apretada esa
 * manito (no cualquier parte del bloque, para no pisarse con los
 * botones/inputs de adentro ni con el scroll de la página) para
 * arrastrar el bloque a otra posición. Al tocarla se pone gris al
 * toque (`active:`) y, una vez que el arrastre arranca de verdad
 * (pasado el `activationConstraint` de useSectionOrder), se queda
 * marcada mientras se mueve.
 */
export function SortableSection({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <button
        type="button"
        aria-label="Mantené apretada la manito para mover esta sección"
        {...attributes}
        {...listeners}
        className={`absolute -top-2 -right-2 z-10 flex h-9 w-9 touch-none select-none items-center justify-center rounded-full border text-base leading-none shadow-sm transition-colors active:bg-border/80 ${
          isDragging ? "cursor-grabbing bg-border border-gold" : "cursor-grab bg-surface border-border"
        }`}
      >
        ✋
      </button>
      <div className={isDragging ? "opacity-60" : undefined}>{children}</div>
    </div>
  );
}
