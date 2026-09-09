"use client";

import { ChangeEvent, useState } from "react";
import { DayEntry, Settings } from "@/lib/types";

type Backup = DayEntry[] | { days: DayEntry[]; settings?: Settings };

export function DataImport({ onImport }: { onImport: (days: DayEntry[], settings?: Settings) => void }) {
  const [status, setStatus] = useState("");

  const handleImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Backup;
        const days = Array.isArray(parsed) ? parsed : parsed.days;
        if (!Array.isArray(days)) throw new Error("Formato no reconocido");
        const settings = Array.isArray(parsed) ? undefined : parsed.settings;
        onImport(days, settings);
        setStatus(`${days.length} días importados ✓`);
      } catch {
        setStatus("El archivo no tiene un respaldo válido.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  return (
    <div className="mb-4 rounded-2xl border border-border bg-surface/70 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Datos personales</div>
          <div className="text-[12px] text-textMuted">La app empieza vacía en cada navegador.</div>
        </div>
        <label className="cursor-pointer rounded-xl border border-gold/60 bg-gold px-3 py-2 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-bg">
          Cargar respaldo
          <input type="file" accept=".json,application/json" className="hidden" onChange={handleImport} />
        </label>
      </div>
      {status && <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-sage">{status}</div>}
    </div>
  );
}