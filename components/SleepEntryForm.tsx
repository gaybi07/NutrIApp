"use client";

import { useState } from "react";
import { DayEntry } from "@/lib/types";
import { clampNumber } from "@/lib/inputLimits";
import { FIELD_HELP } from "@/lib/helpText";
import { InfoHint } from "@/components/InfoHint";

export function SleepEntryForm({ entry, onSave }: { entry: DayEntry; onSave: (entry: DayEntry) => void }) {
  const [suenoHoras, setSuenoHoras] = useState(entry.suenoHoras ? String(entry.suenoHoras) : "");

  const handleSave = () => {
    onSave({
      ...entry,
      suenoHoras: Number(suenoHoras) > 0 ? clampNumber(Number(suenoHoras), 24) : undefined,
    });
  };

  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold mb-1">Hoy</div>
      <h2 className="font-display text-xl leading-none mb-3">Sueño</h2>

      <div className="mb-4">
        <label className="mb-1 flex items-center font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted">
          Horas dormidas<InfoHint text={FIELD_HELP.horasSueno} />
        </label>
        <input
          type="number"
          min="0"
          max="24"
          step="0.5"
          inputMode="decimal"
          value={suenoHoras}
          onChange={(event) => setSuenoHoras(event.target.value)}
          placeholder="Ej: 7.5"
          className="w-full"
        />
      </div>

      <button
        type="button"
        onClick={handleSave}
        className="w-full rounded-lg p-3 font-sans font-bold text-sm bg-gold text-bg"
      >
        Guardar
      </button>
    </div>
  );
}
