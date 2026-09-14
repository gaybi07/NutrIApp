"use client";

import { useMemo } from "react";
import { Collapsible } from "@/components/Collapsible";
import { PurchaseRecord, INVENTORY_CATEGORY_LABELS } from "@/lib/types";
import { SECTION_HELP } from "@/lib/helpText";

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function formatMoney(value: number) {
  return `$${Math.round(value).toLocaleString("es-AR")}`;
}

function formatDate(fecha: string) {
  const d = new Date(`${fecha}T00:00:00`);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}

/**
 * Bitácora de lo que se compró de verdad (marca, precio, fecha) -- se
 * llena sola al confirmar la lectura de un ticket con IA en Compras. No
 * modifica el stock (eso es la Alacena); es solo para ver cuánto gastaste
 * y a qué precio, en el tiempo.
 */
export function PurchaseHistoryCard({
  purchases,
  removePurchase,
}: {
  purchases: PurchaseRecord[];
  removePurchase: (id: string) => void;
}) {
  const sorted = useMemo(() => [...purchases].sort((a, b) => (a.fecha < b.fecha ? 1 : -1)), [purchases]);

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const totalMesActual = useMemo(
    () => sorted.filter((p) => p.fecha.startsWith(currentMonthKey) && p.price).reduce((sum, p) => sum + (p.price || 0), 0),
    [sorted, currentMonthKey]
  );
  const conPrecio = sorted.some((p) => p.price != null);

  return (
    <Collapsible
      eyebrow="Compras"
      title="Historial de compras"
      info={SECTION_HELP.historial}
      badge={
        conPrecio ? (
          <div className="rounded-full border border-border bg-bg/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted">
            {formatMoney(totalMesActual)} este mes
          </div>
        ) : undefined
      }
    >
      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-3 text-[11px] text-textMuted">
          Todavía no leíste ningún ticket con IA — cuando lo hagas, cada compra queda anotada acá (con marca y precio si el ticket los traía).
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {sorted.map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded-lg border border-border bg-bg/40 px-2 py-1.5">
              <span className="shrink-0 font-mono text-[9px] uppercase tracking-wide text-textMuted">{formatDate(p.fecha)}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] text-text">
                  {p.name}
                  {p.brand && <span className="text-textMuted"> · {p.brand}</span>}
                </div>
                <div className="font-mono text-[9px] uppercase tracking-wide text-textMuted">
                  {p.quantity} {p.unit}
                  {p.category && <> · {INVENTORY_CATEGORY_LABELS[p.category]}</>}
                </div>
              </div>
              {p.price != null && <span className="shrink-0 font-mono text-[11px] text-gold">{formatMoney(p.price)}</span>}
              <button type="button" onClick={() => removePurchase(p.id)} aria-label={`Quitar ${p.name} del historial`} className="shrink-0 text-rust">
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </Collapsible>
  );
}
