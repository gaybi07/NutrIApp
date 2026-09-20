"use client";

import { useState } from "react";
import { DayEntry } from "@/lib/types";
import { clampNumber } from "@/lib/inputLimits";
import { FIELD_HELP } from "@/lib/helpText";
import { InfoHint } from "@/components/InfoHint";

/** Carga/edición de pasos de hoy, separada de entrenamiento a propósito --
 * antes vivían juntos en un solo formulario y un solo botón, que además
 * cambiaba de texto apenas cargabas un entrenamiento (dejaba de mostrar
 * "pasos" del todo). Este formulario solo toca `pasos`, se puede volver a
 * abrir en cualquier momento para corregir el número (ej. saliste a caminar
 * después de cargar el día). */
export function StepsEntryForm({ entry, onSave }: { entry: DayEntry; onSave: (entry: DayEntry) => void }) {
  const [pasos, setPasos] = useState(entry.pasos ? String(entry.pasos) : "");

  const handleSave = () => {
    onSave({ ...entry, pasos: clampNumber(Number(pasos) || 0) });
  };

  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold mb-1">Hoy</div>
      <h2 className="font-display text-xl leading-none mb-3">Pasos</h2>

      <div className="mb-4">
        <label className="mb-1 flex items-center font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted">
          Pasos de hoy<InfoHint text={FIELD_HELP.pasosDiarios} />
        </label>
        <input
          type="number"
          min="0"
          max="999999"
          step="100"
          inputMode="numeric"
          value={pasos}
          onChange={(event) => setPasos(event.target.value)}
          placeholder="0"
          className="w-full"
          autoFocus
        />
      </div>

      <button type="button" onClick={handleSave} className="w-full rounded-lg p-3 font-sans font-bold text-sm bg-gold text-bg">
        Guardar
      </button>
    </div>
  );
}
