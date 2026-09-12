"use client";

import { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/**
 * Envoltorio para reordenar bloques grandes de una pantalla (hoy los 3 de
 * Inicio) tocando y manteniendo apretado el "agarre" (⠿) — igual que mover
 * los íconos de la pantalla de inicio del celular. El agarre es chico y
 * está separado del contenido para no pisarse con los botones/inputs de
 * adentro (tocar el resto del bloque sigue funcionando normal).
 */
export function SortableSection({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 30 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Mantené apretado para mover esta sección"
        className="absolute right-2 top-2 z-20 flex h-8 w-8 touch-none select-none items-center justify-center rounded-full border border-border bg-surface/95 text-base leading-none text-textMuted shadow-md active:cursor-grabbing"
        style={{ cursor: "grab" }}
      >
        ⠿
      </button>
      {children}
    </div>
  );
}
