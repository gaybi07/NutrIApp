"use client";

import { InventoryItem } from "@/lib/types";
import { Collapsible } from "@/components/Collapsible";
import { SECTION_HELP } from "@/lib/helpText";

export function AlacenaCard({ items, replaceItems }: { items: InventoryItem[]; replaceItems: (items: InventoryItem[]) => void }) {
  const removeItem = (id: string) => replaceItems(items.filter((item) => item.id !== id));
  const clearAll = () => replaceItems([]);

  return (
    <Collapsible
      eyebrow="Alacena"
      title="Lo que tenés"
      info={SECTION_HELP.alacena}
      badge={
        <div className="rounded-full border border-border bg-bg/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted">
          {items.length} items
        </div>
      }
    >
      {items.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-sage/60 bg-sage/10 px-2 py-2 text-left font-mono text-[11px] text-text"
              >
                <span>
                  {item.name} <span className="text-gold">× {item.quantity} {item.unit}</span>
                </span>
                <button type="button" onClick={() => removeItem(item.id)} className="shrink-0 text-rust" aria-label={`Quitar ${item.name}`}>
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={clearAll}
            className="mt-3 rounded-xl border border-border bg-bg/60 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted"
          >
            Vaciar alacena
          </button>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-3 text-[11px] text-textMuted">
          Todavía no cargaste nada. Sumá productos desde Compras, más abajo.
        </div>
      )}
    </Collapsible>
  );
}
