"use client";

import { PREPARATION_CATEGORY_SUGGESTIONS } from "@/lib/types";

/**
 * "+ Agregar a preparaciones": una sola acción que (a) hace que lo que
 * estás cargando ahora se vea como una sola línea con este nombre en vez
 * de desglosado, y (b) lo deja guardado para volver a usarlo otro día.
 * Compartido entre AiEntryForm / MealFromAlacena / MealFromSearch -- las 3
 * vías de carga de una comida -- para no triplicar el mismo formulario.
 */
export function SavePreparationToggle({
  open,
  onToggleOpen,
  nombre,
  onChangeNombre,
  categoria,
  onChangeCategoria,
}: {
  open: boolean;
  onToggleOpen: () => void;
  nombre: string;
  onChangeNombre: (value: string) => void;
  categoria: string;
  onChangeCategoria: (value: string) => void;
}) {
  return (
    <div className="mb-2 rounded-lg border border-dashed border-gold/40 bg-gold/5 p-2.5">
      <button
        type="button"
        onClick={onToggleOpen}
        className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide text-gold"
      >
        {open ? "▲" : "+"} Agregar a preparaciones
      </button>
      {open && (
        <div className="mt-2 space-y-1.5">
          <input
            type="text"
            placeholder="Nombre, ej: Milanesa con ensalada y papas fritas"
            maxLength={80}
            value={nombre}
            onChange={(e) => onChangeNombre(e.target.value)}
            autoFocus
          />
          <input
            type="text"
            list="prep-categorias"
            placeholder="Categoría (opcional), ej: Almuerzos"
            maxLength={40}
            value={categoria}
            onChange={(e) => onChangeCategoria(e.target.value)}
          />
          <datalist id="prep-categorias">
            {PREPARATION_CATEGORY_SUGGESTIONS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <div className="text-[10px] text-textMuted">
            Va a quedar guardado como una sola línea con este nombre, y lo vas a poder reusar otro día.
          </div>
        </div>
      )}
    </div>
  );
}
