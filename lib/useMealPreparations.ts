"use client";

import { useCallback, useEffect, useState } from "react";
import { MealKey, MealPreparation, PreparationIngredient } from "@/lib/types";
import { useSharedPreparations } from "@/lib/useSharedPreparations";

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
  const { findOrCreate: findOrCreateShared, bumpUsage: bumpSharedUsage } = useSharedPreparations();

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
    (
      nombre: string,
      categoria: string,
      ingredientes: string[] | PreparationIngredient[],
      meal?: MealKey,
      porciones?: number
    ) => {
      const trimmedName = nombre.trim();
      if (!trimmedName || ingredientes.length === 0) return;
      // Puede venir solo con nombres (como siempre) o con detalle+cantidades
      // (desglose nuevo, ver IngredientBreakdown) -- se guardan ambos: los
      // nombres para que el fallback de "usePreparacion" siga funcionando
      // igual que antes, el detalle para poder armar sin IA la próxima vez.
      const hasDetail = typeof ingredientes[0] === "object";
      const detalle = hasDetail ? (ingredientes as PreparationIngredient[]) : undefined;
      const nombres = hasDetail ? (ingredientes as PreparationIngredient[]).map((i) => i.nombre) : (ingredientes as string[]);
      const now = new Date().toISOString();
      const id = newId();
      setPreparations((prev) => {
        const nueva: MealPreparation = {
          id,
          nombre: trimmedName,
          categoria: categoria.trim() || "Sin categoría",
          ingredientes: nombres,
          ingredientesDetalle: detalle,
          porciones,
          meal,
          vecesUsada: 0,
          createdAt: now,
          updatedAt: now,
        };
        return persist([...prev, nueva]);
      });
      // Chequeo de la memoria GLOBAL en segundo plano -- el guardado local de
      // arriba ya pasó y no depende de esto. Solo tiene sentido con detalle
      // (cantidades reales), no con la lista de nombres sueltos vieja.
      if (detalle && detalle.length > 0) {
        findOrCreateShared(trimmedName, categoria.trim() || "Sin categoría", detalle).then((sharedId) => {
          if (sharedId) update(id, { sharedPreparationId: sharedId });
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `update` se
    // declara más abajo en este mismo hook; se referencia dentro del
    // .then() de arriba, que corre bien después de que ya está definida
    // (nunca durante el render). Agregarla acá crearía una dependencia
    // circular de useCallback sin cambiar el comportamiento real.
    [persist, findOrCreateShared]
  );

  const update = useCallback(
    (
      id: string,
      patch: Partial<Pick<MealPreparation, "nombre" | "categoria" | "ingredientesDetalle" | "ingredientes" | "porciones" | "sharedPreparationId">>
    ) => {
      setPreparations((prev) =>
        persist(prev.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p)))
      );
    },
    [persist]
  );

  const registerUse = useCallback(
    (id: string) => {
      setPreparations((prev) => {
        const found = prev.find((p) => p.id === id);
        if (found?.sharedPreparationId) bumpSharedUsage(found.sharedPreparationId);
        return persist(prev.map((p) => (p.id === id ? { ...p, vecesUsada: p.vecesUsada + 1, updatedAt: new Date().toISOString() } : p)));
      });
    },
    [persist, bumpSharedUsage]
  );

  const remove = useCallback(
    (id: string) => {
      setPreparations((prev) => persist(prev.filter((p) => p.id !== id)));
    },
    [persist]
  );

  return { preparations, save, update, registerUse, remove };
}
