"use client";

import { useMemo, useState } from "react";
import { Collapsible } from "@/components/Collapsible";
import { MAX_TEXT_LENGTH } from "@/lib/inputLimits";
import { SECTION_HELP, FIELD_HELP } from "@/lib/helpText";
import { InfoHint } from "@/components/InfoHint";

export function ShoppingLog({ addInventoryText }: { addInventoryText: (text: string) => void }) {
  const [raw, setRaw] = useState("");
  const [status, setStatus] = useState("");

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

  const parseFromText = () => {
    if (!raw.trim()) {
      setStatus("Escribí los productos primero.");
      return;
    }
    addInventoryText(parsedItems.join(", "));
    setRaw("");
    setStatus("Compra guardada ✓");
  };

  return (
    <Collapsible eyebrow="Compras" title="Agregar productos" info={SECTION_HELP.compras}>
      <label className="mb-2 flex items-center font-mono text-[10px] uppercase tracking-[0.15em] text-textMuted">
        Escribí lo que compraste
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

      <button
        onClick={parseFromText}
        className="w-full rounded-xl border border-gold/60 bg-gold px-3 py-2 font-sans font-bold text-[12px] text-bg"
      >
        Agregar a la alacena
      </button>

      {status && <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-sage">{status}</div>}
    </Collapsible>
  );
}
