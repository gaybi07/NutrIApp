"use client";

import { useState } from "react";
import { btn } from "@/components/buttonStyles";

/** Carga rápida del peso de la semana (la usa el aviso amarillo "Toca registrar"). */
export function WeightQuickForm({ onSave, onCancel }: { onSave: (kg: number) => void; onCancel: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const submit = () => {
    const kg = Number(value.replace(",", "."));
    if (!kg || kg < 20 || kg > 400) return setError("Poné un peso entre 20 y 400 kg.");
    onSave(Math.round(kg * 10) / 10);
  };
  return (
    <div className="space-y-2">
      <input type="number" inputMode="decimal" step="0.1" autoFocus placeholder="Ej. 111,5" value={value} onChange={(event) => setValue(event.target.value)} />
      {error && <div className="text-[12px] text-rust">{error}</div>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onCancel} className={btn("neutral", "md", true)}>
          Cancelar
        </button>
        <button type="button" onClick={submit} className={btn("primary", "md", true)}>
          Guardar
        </button>
      </div>
    </div>
  );
}
