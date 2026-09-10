"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "registro:mealHistory:v1";
const MAX_STORED = 40;

export interface MealUsage {
  text: string;
  count: number;
}

/**
 * Historial de qué escribiste en "Contame qué comiste", para que las
 * sugerencias se vayan retroalimentando con tus comidas reales en vez de
 * quedarse en una lista fija. Guardado en localStorage — es un hábito
 * personal del dispositivo, no hace falta sincronizarlo entre cuentas.
 */
export function useMealHistory() {
  const [history, setHistory] = useState<MealUsage[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch (e) {
      console.error("Error cargando historial de comidas", e);
    }
  }, []);

  const record = useCallback((text: string) => {
    const normalized = text.trim();
    if (!normalized) return;
    setHistory((prev) => {
      const key = normalized.toLowerCase();
      const existing = prev.find((h) => h.text.toLowerCase() === key);
      const next = existing
        ? prev.map((h) => (h === existing ? { ...h, count: h.count + 1 } : h))
        : [...prev, { text: normalized, count: 1 }];
      next.sort((a, b) => b.count - a.count);
      const trimmed = next.slice(0, MAX_STORED);
      try {
        localStorage.setItem(KEY, JSON.stringify(trimmed));
      } catch (e) {
        console.error("Error guardando historial de comidas", e);
      }
      return trimmed;
    });
  }, []);

  return { history, record };
}
