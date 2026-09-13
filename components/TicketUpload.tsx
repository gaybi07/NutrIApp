"use client";

import { ChangeEvent, useState } from "react";
import { Collapsible } from "@/components/Collapsible";
import { MAX_TEXT_LENGTH } from "@/lib/inputLimits";
import { SECTION_HELP, FIELD_HELP } from "@/lib/helpText";
import { InfoHint } from "@/components/InfoHint";

export function TicketUpload({ addInventoryText }: { addInventoryText: (text: string) => void }) {
  const [raw, setRaw] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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

      addInventoryText(data.items.join(", "));
      setRaw("");
      setImagePreview(null);
      setStatus("Ticket cargado a la alacena ✓");
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
    <Collapsible eyebrow="Ticket" title="Carga de ticket" info={SECTION_HELP.ticket}>
      <label className="mb-2 flex cursor-pointer items-center justify-center rounded-xl border border-border bg-surfaceAlt px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-text">
        Subir foto del ticket
        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      </label>

      <label className="mb-2 flex items-center font-mono text-[10px] uppercase tracking-[0.15em] text-textMuted">
        O pegá el texto del ticket
        <InfoHint text={FIELD_HELP.ticketTexto} />
      </label>
      <textarea
        rows={4}
        maxLength={MAX_TEXT_LENGTH}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder="Pegá acá el texto del ticket"
        className="mb-2"
      />

      {imagePreview && (
        <div className="mb-3 overflow-hidden rounded-xl border border-border bg-bg/30">
          <img src={imagePreview} alt="Ticket cargado" className="max-h-52 w-full object-cover" />
        </div>
      )}

      <button
        onClick={readTicket}
        disabled={loading}
        className="w-full rounded-xl border border-gold/60 bg-gold px-3 py-2 font-sans font-bold text-[12px] text-bg disabled:opacity-60"
      >
        {loading ? "Leyendo..." : "Leer con IA"}
      </button>

      {status && <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-sage">{status}</div>}
    </Collapsible>
  );
}
