"use client";

import { ChangeEvent, useState } from "react";
import { DayEntry, Settings } from "@/lib/types";
import { fmtDate } from "@/lib/calculations";

type Backup = DayEntry[] | { days: DayEntry[]; settings?: Settings };

export function DataImport({
  days,
  settings,
  onImport,
}: {
  days: DayEntry[];
  settings: Settings;
  onImport: (days: DayEntry[], settings?: Settings) => void;
}) {
  const [status, setStatus] = useState("");

  const handleImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Backup;
        const importedDays = Array.isArray(parsed) ? parsed : parsed.days;
        if (!Array.isArray(importedDays)) throw new Error("Formato no reconocido");
        const importedSettings = Array.isArray(parsed) ? undefined : parsed.settings;
        onImport(importedDays, importedSettings);
        setStatus(`${importedDays.length} días importados ✓`);
      } catch {
        setStatus("El archivo no tiene un respaldo válido.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const handleExport = () => {
    try {
      const backup: Backup = { days, settings };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `registro_respaldo_${fmtDate(new Date())}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus(`Respaldo de ${days.length} días exportado ✓ (revisá tu carpeta de Descargas)`);
    } catch {
      setStatus("No se pudo exportar el respaldo.");
    }
  };

  return (
    <div className="mb-4 rounded-2xl border border-border bg-surface/70 p-3">
      <div className="mb-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Datos personales</div>
        <div className="text-[12px] text-textMuted">La app empieza vacía en cada navegador nuevo.</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleExport}
          className="rounded-xl border border-border bg-surfaceAlt px-3 py-2 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-text"
        >
          Exportar respaldo
        </button>
        <label className="cursor-pointer rounded-xl border border-gold/60 bg-gold px-3 py-2 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-bg">
          Cargar respaldo
          <input type="file" accept=".json,application/json" className="hidden" onChange={handleImport} />
        </label>
      </div>
      {status && <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-sage">{status}</div>}
    </div>
  );
}
