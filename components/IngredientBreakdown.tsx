"use client";

import { useMemo, useState } from "react";
import { PreparationIngredient } from "@/lib/types";
import { parseInventoryText } from "@/lib/foodText";
import { macrosForFoodQuantity } from "@/lib/calculations";
import { useFoods } from "@/lib/useFoods";

export interface BreakdownRow {
  nombre: string;
  cantidad: number;
  unidad: "g" | "ml" | "u.";
  // null = alimento desconocido, sin macros todavía. "gramos" viaja junto a
  // las macros (no por separado) porque solo tiene sentido cuando se pudo
  // resolver el alimento -- para un "u." sin gramosPorUnidad no hay gramos
  // que mostrar, es exactamente el mismo caso en que macros es null.
  macros: { kcal: number; protein: number; carbs: number; fat: number; fiber: number; gramos: number } | null;
}

export function sumRows(rows: BreakdownRow[]) {
  return rows.reduce(
    (acc, r) => ({
      kcal: acc.kcal + (r.macros?.kcal ?? 0),
      protein: acc.protein + (r.macros?.protein ?? 0),
      carbs: acc.carbs + (r.macros?.carbs ?? 0),
      fat: acc.fat + (r.macros?.fat ?? 0),
      fiber: acc.fiber + (r.macros?.fiber ?? 0),
      gramos: acc.gramos + (r.macros?.gramos ?? 0),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, gramos: 0 }
  );
}

/**
 * Desglosar un plato compuesto (ej. "Milanesa") en sus ingredientes base con
 * cantidades -- una línea de texto libre ("150 g pollo, 1 huevo, 30 g pan
 * rallado") que se parsea con el mismo parser que ya usa la Alacena
 * (parseInventoryText), en vez de un formulario con filas para agregar de a
 * una. Cada ingrediente se resuelve contra la tabla `foods` para mostrar el
 * total recalculado al lado del total que dio la IA -- la persona elige cuál
 * de los dos usar, nunca se pisa solo.
 */
export function IngredientBreakdown({
  original,
  onConfirm,
  onCancel,
}: {
  original: { nombre: string; kcal: number; protein: number; carbs?: number; fat?: number; fiber?: number; gramos?: number };
  onConfirm: (ingredientes: PreparationIngredient[], rows: BreakdownRow[], useCalculated: boolean) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  const { findFood, loaded } = useFoods();

  const rows: BreakdownRow[] = useMemo(() => {
    if (!text.trim()) return [];
    return parseInventoryText(text).map((entry) => {
      const food = findFood(entry.name);
      const macros = food ? macrosForFoodQuantity(food, entry.quantity, entry.unit) : null;
      return { nombre: entry.name, cantidad: entry.quantity, unidad: entry.unit, macros };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, loaded]);

  const totals = sumRows(rows);
  const unknownCount = rows.filter((r) => !r.macros).length;
  const originalTotals = {
    kcal: original.kcal,
    protein: original.protein,
    carbs: original.carbs ?? 0,
    fat: original.fat ?? 0,
    fiber: original.fiber ?? 0,
  };

  const confirmWith = (useCalculated: boolean) => {
    if (rows.length === 0) return;
    const ingredientes: PreparationIngredient[] = rows.map((r) => ({ nombre: r.nombre, cantidad: r.cantidad, unidad: r.unidad }));
    // Si se elige "dejar lo de la IA", los macros de cada fila quedan en null
    // -- igual sirve para guardar la ESTRUCTURA de la preparación (qué
    // ingredientes lleva), que es lo que importa para poder reusarla después.
    onConfirm(ingredientes, useCalculated ? rows : rows.map((r) => ({ ...r, macros: null })), useCalculated);
  };

  return (
    <div className="mt-1.5 rounded-lg border border-dashed border-gold/50 bg-gold/5 p-2.5">
      <div className="mb-1.5 font-mono text-[9px] uppercase tracking-wide text-gold">
        Desglosar &quot;{original.nombre}&quot; en ingredientes
      </div>
      <textarea
        rows={2}
        placeholder="Ej: 150 g pollo, 1 huevo, 30 g pan rallado"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-[12px]"
      />
      {rows.length > 0 && (
        <div className="mt-2 flex flex-col gap-1">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center justify-between gap-2 rounded-md border border-border bg-bg/40 px-2 py-1 text-[11px]">
              <span className="min-w-0 flex-1 truncate text-text">
                {row.cantidad} {row.unidad} {row.nombre}
              </span>
              <span className="shrink-0 text-textMuted">
                {row.macros ? `${row.macros.kcal} kcal` : "alimento no reconocido — cuenta para la lista, sin macros"}
              </span>
            </div>
          ))}
          <div className="mt-1 grid grid-cols-2 gap-2 font-mono text-[10px]">
            <div className="rounded-md border border-border bg-bg/40 px-2 py-1.5">
              <div className="text-textMuted">Calculado ahora</div>
              <div className="text-text">
                {totals.kcal} kcal · {totals.protein}g prot
                {unknownCount > 0 ? ` (${unknownCount} sin reconocer)` : ""}
              </div>
            </div>
            <div className="rounded-md border border-border bg-bg/40 px-2 py-1.5">
              <div className="text-textMuted">Lo que dio la IA</div>
              <div className="text-text">
                {originalTotals.kcal} kcal · {originalTotals.protein}g prot
              </div>
            </div>
          </div>
          <div className="mt-1.5 flex gap-1.5">
            <button
              type="button"
              onClick={() => confirmWith(true)}
              disabled={unknownCount === rows.length}
              className="flex-1 rounded-md border border-gold/60 bg-gold px-2 py-1.5 font-mono text-[10px] uppercase text-bg disabled:opacity-40"
            >
              Usar lo calculado
            </button>
            <button
              type="button"
              onClick={() => confirmWith(false)}
              className="flex-1 rounded-md border border-border bg-bg/60 px-2 py-1.5 font-mono text-[10px] uppercase text-textMuted"
            >
              Dejar lo de la IA
            </button>
          </div>
        </div>
      )}
      <button type="button" onClick={onCancel} className="mt-1.5 font-mono text-[9.5px] uppercase tracking-wide text-textMuted underline">
        Cancelar
      </button>
    </div>
  );
}
