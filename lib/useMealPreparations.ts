"use client";

import { useCallback, useEffect, useState } from "react";
import { MealKey, MealPreparation } from "@/lib/types";

const KEY = "registro:mealPreparations:v1";

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Preparaciones personales: combos de varios ingredientes que se vuelven a
 * cocinar (ej. "Milanesa con arroz y arvejas"). Guarda la ESTRUCTURA (qué
 * ingredientes lleva), no cantidades fijas -- la cantidad de cada vez es
 * distinta, así que al reusarla se completa el texto de carga con los
 * nombres de los ingredientes y la persona agrega cuánto de cada uno hizo
 * esta vez antes de calcular. No dispara la IA sola, para no gastar cuota
 * sin que se pida explícitamente. Es por dispositivo (localStorage), igual
 * que la memoria de comidas.
 */
export function useMealPreparations() {
  const [preparations, setPreparations] = useState<MealPreparation[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setPreparations(JSON.parse(raw));
    } catch (e) {
      console.error("Error cargando preparaciones", e);
    }
  }, []);

  const persist = useCallback((next: MealPreparation[]) => {
    setPreparations(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch (e) {
      console.error("Error guardando preparaciones", e);
    }
    return next;
  }, []);

  const save = useCallback(
    (nombre: string, categoria: string, ingredientes: string[], meal?: MealKey) => {
      const trimmedName = nombre.trim();
      if (!trimmedName || ingredientes.length === 0) return;
      const now = new Date().toISOString();
      setPreparations((prev) => {
        const nueva: MealPreparation = {
          id: newId(),
          nombre: trimmedName,
          categoria: categoria.trim() || "Sin categoría",
          ingredientes,
          meal,
          vecesUsada: 0,
          createdAt: now,
          updatedAt: now,
        };
        return persist([...prev, nueva]);
      });
    },
    [persist]
  );

  const registerUse = useCallback(
    (id: string) => {
      setPreparations((prev) =>
        persist(prev.map((p) => (p.id === id ? { ...p, vecesUsada: p.vecesUsada + 1, updatedAt: new Date().toISOString() } : p)))
      );
    },
    [persist]
  );

  const remove = useCallback(
    (id: string) => {
      setPreparations((prev) => persist(prev.filter((p) => p.id !== id)));
    },
    [persist]
  );

  return { preparations, save, registerUse, remove };
}
