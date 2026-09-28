"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MealKey, MealPreparation, PreparationIngredient } from "@/lib/types";
import { useSharedPreparations } from "@/lib/useSharedPreparations";
import { supabase } from "@/lib/supabase/browser";

const KEY = "registro:mealPreparations:v1";

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadLocalCache(): MealPreparation[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalCache(next: MealPreparation[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch (e) {
    console.error("Error guardando preparaciones", e);
  }
}

function rowToPrep(row: Record<string, unknown>): MealPreparation {
  return {
    id: row.id as string,
    nombre: row.nombre as string,
    categoria: row.categoria as string,
    ingredientes: (row.ingredientes as string[]) || [],
    ingredientesDetalle: (row.ingredientes_detalle as PreparationIngredient[] | null) ?? undefined,
    porciones: (row.porciones as number | null) ?? undefined,
    meal: (row.meal as MealKey | null) ?? undefined,
    sharedPreparationId: (row.shared_preparation_id as string | null) ?? undefined,
    vecesUsada: (row.veces_usada as number) ?? 0,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function prepToRow(p: MealPreparation, userId: string) {
  return {
    id: p.id,
    user_id: userId,
    nombre: p.nombre,
    categoria: p.categoria,
    ingredientes: p.ingredientes,
    ingredientes_detalle: p.ingredientesDetalle ?? null,
    porciones: p.porciones ?? null,
    meal: p.meal ?? null,
    shared_preparation_id: p.sharedPreparationId ?? null,
    veces_usada: p.vecesUsada,
  };
}

/**
 * Preparaciones personales: combos de varios ingredientes que se vuelven a
 * cocinar (ej. "Milanesa con arroz y arvejas"). Guarda la ESTRUCTURA (qué
 * ingredientes lleva), no cantidades fijas -- la cantidad de cada vez es
 * distinta, así que al reusarla se completan los gramos de esa vez antes de
 * calcular (ver el modo "Preparación" en AiEntryForm.tsx). No dispara la IA
 * sola, para no gastar cuota sin que se pida explícitamente.
 *
 * Por usuario en Supabase (tabla meal_preparations) cuando hay sesión --
 * sincroniza solo entre dispositivos. Sin Supabase configurado, o sin
 * sesión, cae a localStorage exactamente como funcionaba antes (mismo
 * comportamiento para el "modo local" que ya soporta el resto de la app).
 * Si al loguearte por primera vez el servidor está vacío pero localStorage
 * tiene datos (de antes de este cambio), se migran solos una única vez.
 */
export function useMealPreparations() {
  const [preparations, setPreparations] = useState<MealPreparation[]>([]);
  const userIdRef = useRef<string | null>(null);
  const { findOrCreate: findOrCreateShared, bumpUsage: bumpSharedUsage } = useSharedPreparations();

  useEffect(() => {
    (async () => {
      if (!supabase) {
        setPreparations(loadLocalCache());
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setPreparations(loadLocalCache());
        return;
      }
      userIdRef.current = user.id;

      const { data, error } = await supabase.from("meal_preparations").select("*").eq("user_id", user.id).order("created_at");
      if (error) {
        // Sin red o sin tabla todavía -- se sigue con lo que había en cache
        // local, la función no se rompe por esto.
        setPreparations(loadLocalCache());
        return;
      }

      if ((data || []).length === 0) {
        const cached = loadLocalCache();
        if (cached.length > 0) {
          // Migración de una sola vez: lo que había en localStorage de antes
          // de este cambio sube al servidor (con ids nuevos, los viejos no
          // son uuid válidos) y de ahí en más el servidor manda.
          const rows = cached.map((p) => {
            const { id: _oldId, ...rest } = prepToRow(p, user.id);
            return rest;
          });
          const { data: inserted } = await supabase.from("meal_preparations").insert(rows).select("*");
          if (inserted && inserted.length > 0) {
            const migradas = inserted.map(rowToPrep);
            setPreparations(migradas);
            saveLocalCache(migradas);
            return;
          }
        }
      }

      const remotas = (data || []).map(rowToPrep);
      setPreparations(remotas);
      saveLocalCache(remotas);
    })();
  }, []);

  const persistLocal = useCallback((next: MealPreparation[]) => {
    setPreparations(next);
    saveLocalCache(next);
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
      const userId = userIdRef.current;
      const id = supabase && userId ? crypto.randomUUID() : newId();
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
      setPreparations((prev) => {
        const next = [...prev, nueva];
        saveLocalCache(next); // cache local -- si hay Supabase, la fuente real es la tabla
        return next;
      });
      if (supabase && userId) {
        supabase
          .from("meal_preparations")
          .insert(prepToRow(nueva, userId))
          .then(({ error }) => {
            if (error) console.error("Error guardando preparación", error);
          });
      }
      // Chequeo de la memoria GLOBAL en segundo plano -- el guardado de
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
    [findOrCreateShared]
  );

  const update = useCallback(
    (
      id: string,
      patch: Partial<Pick<MealPreparation, "nombre" | "categoria" | "ingredientesDetalle" | "ingredientes" | "porciones" | "sharedPreparationId">>
    ) => {
      const userId = userIdRef.current;
      setPreparations((prev) => {
        const next = prev.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p));
        saveLocalCache(next);
        return next;
      });
      if (supabase && userId) {
        const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (patch.nombre !== undefined) row.nombre = patch.nombre;
        if (patch.categoria !== undefined) row.categoria = patch.categoria;
        if (patch.ingredientes !== undefined) row.ingredientes = patch.ingredientes;
        if (patch.ingredientesDetalle !== undefined) row.ingredientes_detalle = patch.ingredientesDetalle;
        if (patch.porciones !== undefined) row.porciones = patch.porciones;
        if (patch.sharedPreparationId !== undefined) row.shared_preparation_id = patch.sharedPreparationId;
        supabase
          .from("meal_preparations")
          .update(row)
          .eq("id", id)
          .then(({ error }) => {
            if (error) console.error("Error actualizando preparación", error);
          });
      }
    },
    []
  );

  const registerUse = useCallback(
    (id: string) => {
      const userId = userIdRef.current;
      let nuevoVecesUsada = 0;
      setPreparations((prev) => {
        const found = prev.find((p) => p.id === id);
        if (found?.sharedPreparationId) bumpSharedUsage(found.sharedPreparationId);
        nuevoVecesUsada = (found?.vecesUsada ?? 0) + 1;
        const next = prev.map((p) => (p.id === id ? { ...p, vecesUsada: nuevoVecesUsada, updatedAt: new Date().toISOString() } : p));
        saveLocalCache(next);
        return next;
      });
      if (supabase && userId) {
        supabase
          .from("meal_preparations")
          .update({ veces_usada: nuevoVecesUsada, updated_at: new Date().toISOString() })
          .eq("id", id)
          .then(({ error }) => {
            if (error) console.error("Error actualizando uso de preparación", error);
          });
      }
    },
    [bumpSharedUsage]
  );

  const remove = useCallback((id: string) => {
    const userId = userIdRef.current;
    setPreparations((prev) => {
      const next = prev.filter((p) => p.id !== id);
      saveLocalCache(next);
      return next;
    });
    if (supabase && userId) {
      supabase
        .from("meal_preparations")
        .delete()
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.error("Error borrando preparación", error);
        });
    }
  }, []);

  return { preparations, save, update, registerUse, remove };
}
