"use client";

import { ChangeEvent, useState } from "react";
import { useMealMemory } from "@/lib/useMealMemory";

export function MealMemoryImport() {
  const { importCsv } = useMealMemory();
  const [status, setStatus] = useState("");

  const handleImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const { imported, skipped } = importCsv(String(reader.result));
        setStatus(
          imported > 0
            ? `${imported} comidas guardadas en tu memoria ✓${skipped ? ` (${skipped} filas sin datos, salteadas)` : ""}`
            : "No se encontró ninguna fila con datos válidos."
        );
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "No se pudo leer el CSV.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  return (
    <div className="mt-3 rounded-2xl border border-border bg-surface/70 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Memoria de comidas</div>
          <div className="text-[12px] text-textMuted">
            Importá un CSV con columnas "descripcion", "kcal" y "proteina_g" — la app va
            a recordar el valor exacto de esas comidas para no depender de que la IA lo
            vuelva a estimar cada vez.
          </div>
        </div>
        <label className="shrink-0 cursor-pointer rounded-xl border border-gold/60 bg-gold px-3 py-2 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-bg">
          Importar CSV
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleImport} />
        </label>
      </div>
      {status && <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-sage">{status}</div>}
    </div>
  );
}
