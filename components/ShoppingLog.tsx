"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { InventoryItem } from "@/lib/types";

export function ShoppingLog({ items, addInventoryText, replaceItems }: { items: InventoryItem[]; addInventoryText: (text: string) => void; replaceItems: (items: InventoryItem[]) => void }) {
  const [raw, setRaw] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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
      setStatus("Escribí los productos o pegas el ticket primero.");
      return;
    }
    addItems(parsedItems);
  };

  const readTicket = async () => {
    if (!raw.trim() && !imagePreview) {
      setStatus("Pega el texto del ticket o subí una foto.");
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
      setStatus("Foto cargada. Podés leerla con IA o cargar manualmente.");
    };
    reader.readAsDataURL(file);
  };

  const clearItems = () => {
    replaceItems([]);
    setRaw("");
    setImagePreview(null);
    setStatus("Lista vaciada.");
  };

  return (
    <div className="mb-5 rounded-2xl border border-border bg-surface/70 p-3 shadow-[0_0_0_1px_rgba(58,54,47,0.4)]">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Compras</div>
          <div className="font-display text-xl leading-none -tracking-[0.04em]">Ticket / foto</div>
        </div>
        <div className="rounded-full border border-border bg-bg/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted">
          {items.length} items
        </div>
      </div>

      <div className="mb-3 rounded-xl border border-dashed border-border bg-bg/40 p-2">
        <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-textMuted mb-2">Opciones</div>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex cursor-pointer items-center justify-center rounded-xl border border-border bg-surfaceAlt px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-text">
            Subir foto
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
          <button
            onClick={parseFromText}
            className="rounded-xl border border-gold/60 bg-gold px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-bg"
          >
            Manual
          </button>
        </div>
      </div>

      <label className="font-mono text-[10px] uppercase tracking-[0.15em] text-textMuted mb-2 block">
        Pegá el ticket o escribí lo que compraste
      </label>
      <textarea
        rows={4}
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

      <div className="flex gap-2">
        <button
          onClick={readTicket}
          disabled={loading}
          className="flex-1 rounded-xl border border-gold/60 bg-gold px-3 py-2 font-sans font-bold text-[12px] text-bg disabled:opacity-60"
        >
          {loading ? "Leyendo..." : "Leer con IA"}
        </button>
        <button
          onClick={clearItems}
          className="rounded-xl border border-border bg-bg/60 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted"
        >
          Limpiar
        </button>
      </div>

      {status && <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-sage">{status}</div>}

      {parsedItems.length > 0 && (
        <div className="mt-3 rounded-xl border border-border bg-bg/40 p-2">
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

      {items.length > 0 && (
        <div className="mt-3 rounded-xl border border-border bg-bg/40 p-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-textMuted mb-2">Compras guardadas</div>
          <div className="flex flex-wrap gap-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-2 rounded-lg border border-sage/50 bg-sage/10 px-2 py-1 font-mono text-[10px] text-text">
                <span className="uppercase tracking-[0.12em]">{item.name}</span>
                <span className="text-gold">{item.quantity} {item.unit}</span>
                <button type="button" onClick={() => replaceItems(items.filter((current) => current.id !== item.id))} className="text-rust">×</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
