"use client";

import { useEffect } from "react";

/** Ejecuta onEscape cuando se presiona Escape, mientras `active` sea true. */
export function useEscapeKey(onEscape: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onEscape();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active, onEscape]);
}
