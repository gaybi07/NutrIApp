"use client";

import { useCallback } from "react";
import { closestCenter, DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";

// Mientras se mantiene apretada la manito y se mueve el dedo, algunos
// celulares confunden ese gesto sostenido con un pinch/doble-tap de zoom
// nativo del navegador. Se bloquea el zoom SOLO mientras dura el arrastre
// (no de forma permanente, para no repetir el bug ya conocido de que
// bloquear el zoom para toda la app rompe el scroll normal) y se restaura
// apenas se suelta o se cancela.
let originalViewportContent: string | null = null;

function lockZoom() {
  const meta = document.querySelector('meta[name="viewport"]');
  if (!meta) return;
  if (originalViewportContent === null) originalViewportContent = meta.getAttribute("content") || "width=device-width, initial-scale=1";
  meta.setAttribute("content", `${originalViewportContent}, maximum-scale=1, user-scalable=no`);
}

function unlockZoom() {
  const meta = document.querySelector('meta[name="viewport"]');
  if (meta && originalViewportContent !== null) meta.setAttribute("content", originalViewportContent);
}

/**
 * Arma los sensores + el handler de reordenamiento para una lista de
 * bloques reordenables (mantener apretado, como mover íconos en la
 * pantalla de inicio del celular) — compartido por Inicio, Comidas,
 * Macros y Entrenamientos, cada uno con su propia lista de ids.
 */
export function useSectionOrder<T extends string>(order: T[], onReorder: (next: T[]) => void) {
  const sensors = useSensors(
    // El arrastre solo se agarra desde la "manito" de SortableSection, así
    // que no hace falta un delay largo para distinguirlo de un toque normal
    // en el resto del bloque — un delay corto alcanza para que no se dispare
    // por vibración/temblor de la mano al apoyar el dedo.
    useSensor(PointerSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = useCallback(() => {
    lockZoom();
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      unlockZoom();
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = order.indexOf(active.id as T);
      const newIndex = order.indexOf(over.id as T);
      if (oldIndex === -1 || newIndex === -1) return;
      onReorder(arrayMove(order, oldIndex, newIndex));
    },
    [order, onReorder]
  );

  const handleDragCancel = useCallback(() => {
    unlockZoom();
  }, []);

  return { sensors, handleDragStart, handleDragEnd, handleDragCancel, collisionDetection: closestCenter };
}
