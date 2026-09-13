"use client";

import { ChangeEvent, useState } from "react";
import { useMealMemory } from "@/lib/useMealMemory";
import { fmtDate } from "@/lib/calculations";

export function MealMemoryImport() {
  const { importCsv, exportJson, importJson } = useMealMemory();
  const [status, setStatus] = useState("");

  const handleImportCsv = (event: ChangeEvent<HTMLInputElement>) => {
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

  const handleExportJson = () => {
    try {
      const json = exportJson();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `memoria_comidas_${fmtDate(new Date())}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus("Memoria exportada ✓ (revisá tu carpeta de Descargas)");
    } catch {
      setStatus("No se pudo exportar la memoria.");
    }
  };

  const handleImportJson = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const { imported, skipped } = importJson(String(reader.result));
        setStatus(
          imported > 0
            ? `${imported} comidas actualizadas ✓${skipped ? ` (${skipped} sin datos, salteadas)` : ""}`
            : "No se encontró ninguna comida válida en el archivo."
        );
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "No se pudo leer el archivo.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  return (
    <div className="mt-3 rounded-2xl border border-border bg-surface/70 p-3">
      <div className="mb-2">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Memoria de comidas</div>
        <div className="text-[12px] text-textMuted">
          Importá un CSV con columnas "descripcion", "kcal" y "proteina_g" para cargar comidas de una — la app
          va a recordar el valor exacto y no depender de que la IA lo vuelva a estimar cada vez.
        </div>
      </div>
      <label className="mb-3 block cursor-pointer rounded-xl border border-gold/60 bg-gold px-3 py-2 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-bg">
        Importar CSV
        <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportCsv} />
      </label>

      <div className="border-t border-dashed border-border pt-3">
        <div className="mb-2 text-[12px] text-textMuted">
          Para desglosar en detalle (alimento por alimento) las comidas que ya tenés guardadas: exportá el JSON,
          pedile a una IA que complete "ingredientes" e "items" siguiendo el formato, y volvé a importarlo acá.
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleExportJson}
            className="rounded-xl border border-border bg-surfaceAlt px-3 py-2 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-text"
          >
            Exportar JSON
          </button>
          <label className="cursor-pointer rounded-xl border border-gold/60 bg-gold px-3 py-2 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-bg">
            Importar JSON
            <input type="file" accept=".json,application/json" className="hidden" onChange={handleImportJson} />
          </label>
        </div>
      </div>

      {status && <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-sage">{status}</div>}
    </div>
  );
}
