"use client";

import { ChangeEvent, useState } from "react";
import { useMealMemory } from "@/lib/useMealMemory";

export function MealMemoryImport() {
  const { importCsv, exportJson, importJson } = useMealMemory();
  const [status, setStatus] = useState("");
  const [exportedJson, setExportedJson] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");

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

  // La descarga de archivo (blob + <a download>) falla en bastantes
  // navegadores de celular sin avisar nada -- se muestra el texto en
  // pantalla con un botón de copiar, que es mucho más confiable en mobile.
  const handleExportJson = () => {
    try {
      setExportedJson(exportJson());
      setStatus("");
    } catch {
      setStatus("No se pudo exportar la memoria.");
    }
  };

  const copyExportedJson = async () => {
    if (!exportedJson) return;
    try {
      await navigator.clipboard.writeText(exportedJson);
      setStatus("Copiado al portapapeles ✓ — pegalo donde lo necesites.");
    } catch {
      setStatus("No pude copiar solo — seleccioná el texto de arriba a mano y copialo.");
    }
  };

  const applyImportedJson = (text: string) => {
    try {
      const { imported, skipped } = importJson(text);
      setStatus(
        imported > 0
          ? `${imported} comidas actualizadas ✓${skipped ? ` (${skipped} sin datos, salteadas)` : ""}`
          : "No se encontró ninguna comida válida en el archivo."
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "No se pudo leer el archivo.");
    }
  };

  const handleImportJsonFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => applyImportedJson(String(reader.result));
    reader.readAsText(file);
    event.target.value = "";
  };

  const handleImportPastedJson = () => {
    if (!pasteText.trim()) return;
    applyImportedJson(pasteText);
    setPasteText("");
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

        <button
          type="button"
          onClick={handleExportJson}
          className="mb-2 block w-full rounded-xl border border-border bg-surfaceAlt px-3 py-2 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-text"
        >
          Exportar JSON
        </button>

        {exportedJson && (
          <div className="mb-3">
            <textarea
              readOnly
              rows={6}
              value={exportedJson}
              onFocus={(e) => e.target.select()}
              className="w-full font-mono text-[10px]"
            />
            <button
              type="button"
              onClick={copyExportedJson}
              className="mt-1.5 w-full rounded-xl border border-gold/60 bg-gold px-3 py-2 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-bg"
            >
              Copiar al portapapeles
            </button>
          </div>
        )}

        <label className="mb-2 block cursor-pointer rounded-xl border border-gold/60 bg-gold px-3 py-2 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-bg">
          Importar JSON (archivo)
          <input type="file" accept=".json,application/json" className="hidden" onChange={handleImportJsonFile} />
        </label>

        <div className="text-[10px] text-textMuted mb-1">...o pegá el JSON directo acá:</div>
        <textarea
          rows={4}
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder="Pegá acá el JSON que te devolvió la IA"
          className="w-full font-mono text-[10px]"
        />
        <button
          type="button"
          onClick={handleImportPastedJson}
          disabled={!pasteText.trim()}
          className="mt-1.5 w-full rounded-xl border border-border bg-surfaceAlt px-3 py-2 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-text disabled:opacity-50"
        >
          Importar lo pegado
        </button>
      </div>

      {status && <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-sage">{status}</div>}
    </div>
  );
}
