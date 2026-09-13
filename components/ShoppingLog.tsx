"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { Collapsible } from "@/components/Collapsible";
import { MAX_TEXT_LENGTH } from "@/lib/inputLimits";
import { SECTION_HELP, FIELD_HELP } from "@/lib/helpText";
import { InfoHint } from "@/components/InfoHint";
import { useSpeechToText } from "@/lib/useSpeechToText";

export function ShoppingLog({ addInventoryText }: { addInventoryText: (text: string) => void }) {
  const [raw, setRaw] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { supported: speechSupported, recording, toggle: toggleRecording } = useSpeechToText(
    (transcript) => setRaw((prev) => (prev ? `${prev}, ${transcript}` : transcript)),
    () => setStatus("No pude escucharte, probá de nuevo o escribilo a mano.")
  );

  const parsedItems = useMemo(() => {
    return Array.from(
      new Set(
        raw
          .split(/\n|,|\|/)
          .map((part) => part.trim())
          .filter(Boolean)
          .map((item) => item.replace(/^[-•*]\s*/, ""))
      )
    );
  }, [raw]);

  const addItems = (source: string[]) => {
    addInventoryText(source.join(", "));
    setRaw("");
    setImagePreview(null);
    setStatus("Compra guardada ✓");
  };

  const parseFromText = () => {
    if (!raw.trim()) {
      setStatus("Escribí o dictá los productos, o pegá el ticket primero.");
      return;
    }
    addItems(parsedItems);
  };

  const readTicket = async () => {
    if (!raw.trim() && !imagePreview) {
      setStatus("Pegá el texto del ticket o subí una foto.");
      return;
    }

    setLoading(true);
    setStatus("Leyendo ticket...");

    try {
      const res = await fetch("/api/parse-shopping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: raw,
          imageDataUrl: imagePreview || undefined,
        }),
      });

      const responseText = await res.text();
      let data: { items?: string[]; error?: string };
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error("El servidor no devolvió una respuesta válida. Reiniciá la app e intentá de nuevo.");
      }
      if (!res.ok || !Array.isArray(data.items)) {
        throw new Error(data.error || "No pude leer el ticket");
      }

      addItems(data.items);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No pude leer el ticket.");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(String(reader.result));
      setStatus("Foto cargada. Tocá \"Leer con IA\" para procesarla.");
    };
    reader.readAsDataURL(file);
  };

  return (
    <Collapsible eyebrow="Compras" title="Agregar productos" info={SECTION_HELP.compras}>
      <label className="mb-2 flex cursor-pointer items-center justify-center rounded-xl border border-border bg-surfaceAlt px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-text">
        Subir foto del ticket
        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      </label>

      {speechSupported && (
        <button
          type="button"
          onClick={toggleRecording}
          className={`mb-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 p-2.5 font-sans text-[13px] font-bold uppercase tracking-wide transition-colors ${
            recording ? "border-rust bg-rust/15 text-rust animate-pulse" : "border-gold bg-gold/15 text-gold"
          }`}
        >
          <span className="text-lg leading-none">🎙️</span>
          {recording ? "Grabando… tocá para parar" : "Cargar con audio"}
        </button>
      )}

      <label className="mb-2 flex items-center font-mono text-[10px] uppercase tracking-[0.15em] text-textMuted">
        Escribí, dictá o pegá el texto del ticket
        <InfoHint text={FIELD_HELP.ticketTexto} />
      </label>
      <textarea
        rows={4}
        maxLength={MAX_TEXT_LENGTH}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder="Ej: 1 kg pollo, 2 tomates, queso 200g, arroz, yogurt"
        className="mb-2"
      />

      {imagePreview && (
        <div className="mb-3 overflow-hidden rounded-xl border border-border bg-bg/30">
          <img src={imagePreview} alt="Ticket cargado" className="max-h-52 w-full object-cover" />
        </div>
      )}

      {parsedItems.length > 0 && (
        <div className="mb-3 rounded-xl border border-border bg-bg/40 p-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-textMuted mb-2">Vista previa</div>
          <div className="flex flex-wrap gap-2">
            {parsedItems.map((item) => (
              <span
                key={item}
                className="rounded-full border border-border bg-surface px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={readTicket}
          disabled={loading}
          className="flex-1 rounded-xl border border-gold/60 bg-gold px-3 py-2 font-sans font-bold text-[12px] text-bg disabled:opacity-60"
        >
          {loading ? "Leyendo..." : "Leer con IA"}
        </button>
        <button
          onClick={parseFromText}
          className="flex-1 rounded-xl border border-border bg-bg/60 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted"
        >
          Agregar tal cual
        </button>
      </div>

      {status && <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-sage">{status}</div>}
    </Collapsible>
  );
}
