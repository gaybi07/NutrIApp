"use client";

import { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/**
 * Envoltorio para reordenar bloques grandes de una pantalla con una
 * "manito" (✋) chica y discreta en la esquina — se toca y mantiene
 * apretada esa manito (no cualquier parte del bloque, para no pisarse
 * con los botones/inputs de adentro ni con el scroll de la página)
 * para arrastrar el bloque a otra posición. Al tocarla se pone gris
 * al toque (`active:`) y, una vez que el arrastre arranca de verdad
 * (pasado el `activationConstraint` de useSectionOrder), se queda
 * marcada mientras se mueve.
 *
 * Mientras se arrastra, el bloque se "achica" a una franja chica en
 * vez de mover todo su contenido (algunos bloques miden más de una
 * pantalla completa) — de lo contrario, arrastrarlo tapa toda la
 * pantalla y se ve mal en el celular.
 */
export function SortableSection({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    // CSS.Translate (no CSS.Transform) a propósito: Transform incluye
    // scaleX/scaleY, que dnd-kit usa para "hacer lugar" — en bloques altos
    // eso se ve como el texto estirado/deformado mientras se reordena.
    transform: CSS.Translate.toString(transform),
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
        className={`absolute -top-1.5 -right-1.5 z-10 flex h-6 w-6 touch-none select-none items-center justify-center rounded-full border text-[11px] leading-none opacity-60 shadow-sm transition-all active:bg-border/80 active:opacity-100 ${
          isDragging ? "cursor-grabbing bg-border border-gold opacity-100" : "cursor-grab bg-surface border-border"
        }`}
      >
        ✋
      </button>
      <div
        className={isDragging ? "overflow-hidden rounded-2xl shadow-lg" : undefined}
        style={isDragging ? { maxHeight: 72, opacity: 0.9, pointerEvents: "none" } : undefined}
      >
        {children}
      </div>
    </div>
  );
}
