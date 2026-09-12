"use client";

import { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/**
 * Envoltorio para reordenar bloques grandes de una pantalla tocando y
 * manteniendo apretado en CUALQUIER parte del bloque — igual que mover
 * los íconos de la pantalla de inicio del celular, sin un botón de
 * "agarre" aparte que cambie cómo se ve la pantalla. Un toque normal
 * (tocar un botón, escribir en un input, hacer scroll) sigue funcionando
 * igual: el arrastre solo arranca si se mantiene apretado sin moverse
 * más de la tolerancia configurada en useSectionOrder.
 */
export function SortableSection({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 30 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}
