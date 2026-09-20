"use client";

import { useMemo, useState } from "react";
import { InventoryItem, InventoryZone, INVENTORY_ZONE_LABELS } from "@/lib/types";
import { ProductMemoryApi } from "@/lib/useProductMemory";
import { QuickAddProducts, AiShoppingItem } from "@/components/QuickAddProducts";

const ZONE_STYLE: Record<InventoryZone, { accent: string; border: string; bg: string; icon: JSX.Element }> = {
  flotante: {
    accent: "#34D399",
    border: "border-[#34D399]/35",
    bg: "bg-[linear-gradient(165deg,rgba(52,211,153,0.12),rgb(var(--color-surface))_60%)]",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 4h18M3 4v14a1 1 0 001 1h16a1 1 0 001-1V4" />
        <path d="M12 5v14" />
      </svg>
    ),
  },
  mesada: {
    accent: "#F59E0B",
    border: "border-[#F59E0B]/35",
    bg: "bg-[linear-gradient(165deg,rgba(245,158,11,0.12),rgb(var(--color-surface))_60%)]",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4l3 2" />
      </svg>
    ),
  },
  bajomesada: {
    accent: "#A78BFA",
    border: "border-[#A78BFA]/35",
    bg: "bg-[linear-gradient(165deg,rgba(167,139,250,0.12),rgb(var(--color-surface))_60%)]",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="4" width="18" height="16" rx="1.5" />
        <path d="M3 12h18M9 12v8M15 12v8" />
      </svg>
    ),
  },
  heladera: {
    accent: "#38BDF8",
    border: "border-[#38BDF8]/35",
    bg: "bg-[linear-gradient(165deg,rgba(56,189,248,0.12),rgb(var(--color-surface))_60%)]",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <path d="M9 2v6" />
      </svg>
    ),
  },
};

const ZONE_ORDER: InventoryZone[] = ["flotante", "mesada", "bajomesada", "heladera"];

function ZoneCard({
  zone,
  count,
  onOpen,
  className,
  children,
}: {
  zone: InventoryZone;
  count: number;
  onOpen: () => void;
  className: string;
  children: React.ReactNode;
}) {
  const style = ZONE_STYLE[zone];
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex min-h-0 flex-col rounded-2xl border ${style.border} ${style.bg} p-2.5 text-left transition-transform active:scale-[0.99] ${className}`}
    >
      <div className="mb-1.5 flex shrink-0 items-center gap-1.5 font-display text-[12px] font-semibold text-text">
        <span className="h-3.5 w-3.5 shrink-0" style={{ color: style.accent }}>
          {style.icon}
        </span>
        <span className="min-w-0 flex-1 truncate">{INVENTORY_ZONE_LABELS[zone]}</span>
        <span className="shrink-0 font-mono text-[9px] text-textMuted">{count}</span>
      </div>
      {children}
    </button>
  );
}

export function CocinaView({
  items,
  addStructuredItems,
  updateItem,
  productMemory,
}: {
  items: InventoryItem[];
  addStructuredItems: (entries: AiShoppingItem[]) => void;
  updateItem: (id: string, patch: Partial<InventoryItem>) => void;
  productMemory: ProductMemoryApi;
}) {
  const [openZone, setOpenZone] = useState<InventoryZone | null>(null);
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [reassigning, setReassigning] = useState<string | null>(null);

  const byZone = useMemo(() => {
    const map: Record<InventoryZone, InventoryItem[]> = { flotante: [], mesada: [], bajomesada: [], heladera: [] };
    items.forEach((item) => {
      if (item.zona) map[item.zona].push(item);
    });
    return map;
  }, [items]);

  // Productos sin zona asignada -- antes caían calladitos dentro de "mesada"
  // sin ninguna marca, mezclados con lo que sí estaba clasificado a
  // propósito. Ahora quedan aparte, marcados en rojo, hasta que se les
  // asigne una zona real.
  const unassigned = useMemo(() => items.filter((item) => !item.zona), [items]);

  const reassign = (item: InventoryItem, zona: InventoryZone) => {
    updateItem(item.id, { zona });
    productMemory.remember({ name: item.name, zona });
    setReassigning(null);
  };

  return (
    <div>
      {unassigned.length > 0 && (
        <button
          type="button"
          onClick={() => setShowUnassigned(true)}
          className="mb-2 flex w-full items-center justify-between gap-2 rounded-xl border border-rust/60 bg-rust/10 px-3 py-2.5 text-left"
        >
          <span className="font-mono text-[11px] uppercase tracking-wide text-rust">⚠ Sin zona: {unassigned.length}</span>
          <span className="font-mono text-[9px] uppercase tracking-wide text-rust">Tocá para clasificar</span>
        </button>
      )}

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: "1fr minmax(112px, 34%)", gridTemplateRows: "1fr 56px 1fr", height: "min(64vh, 560px)" }}
      >
        <ZoneCard zone="flotante" count={byZone.flotante.length} onOpen={() => setOpenZone("flotante")} className="col-start-1 row-start-1">
          <div className="flex flex-1 gap-1">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="relative min-h-0 flex-1 rounded-md border border-border bg-surfaceAlt/70">
                <span
                  className="absolute top-1/2 h-3.5 w-[3px] -translate-y-1/2 rounded-full"
                  style={{ background: ZONE_STYLE.flotante.accent, [i % 2 === 0 ? "right" : "left"]: "5px" } as React.CSSProperties}
                />
              </div>
            ))}
          </div>
        </ZoneCard>

        <ZoneCard zone="mesada" count={byZone.mesada.length} onOpen={() => setOpenZone("mesada")} className="col-start-1 row-start-2">
          <div className="flex-1 rounded-md border border-dashed border-border" />
        </ZoneCard>

        <ZoneCard zone="bajomesada" count={byZone.bajomesada.length} onOpen={() => setOpenZone("bajomesada")} className="col-start-1 row-start-3">
          <div className="flex flex-1 gap-1">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="relative min-h-0 flex-1 rounded-md border border-border bg-surfaceAlt/70">
                <span
                  className="absolute top-1/2 h-3.5 w-[3px] -translate-y-1/2 rounded-full"
                  style={{ background: ZONE_STYLE.bajomesada.accent, [i % 2 === 0 ? "right" : "left"]: "5px" } as React.CSSProperties}
                />
              </div>
            ))}
          </div>
        </ZoneCard>

        <ZoneCard zone="heladera" count={byZone.heladera.length} onOpen={() => setOpenZone("heladera")} className="col-start-2 row-start-1 row-span-3">
          <div className="relative min-h-0 flex-1 rounded-xl border border-border bg-surfaceAlt/70">
            <span className="absolute inset-x-[10%] top-[26%] h-px bg-border" />
            <span
              className="absolute right-2.5 top-[8%] bottom-[8%] w-[3px] rounded-full"
              style={{ background: ZONE_STYLE.heladera.accent }}
            />
          </div>
        </ZoneCard>
      </div>

      <div className="mt-2 rounded-xl border border-dashed border-border px-2.5 py-2 text-[11px] text-textMuted">
        💡 Cada producto guarda una zona — la recordamos por nombre para la próxima vez. Tocá una zona para ver o agregar productos ahí.
      </div>

      {openZone && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-bg/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => {
            setOpenZone(null);
            setReassigning(null);
          }}
        >
          <div
            className="max-h-[82vh] w-full max-w-sm overflow-y-auto rounded-t-2xl border border-border bg-surface p-4 shadow-2xl sm:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="h-5 w-5 shrink-0" style={{ color: ZONE_STYLE[openZone].accent }}>
                {ZONE_STYLE[openZone].icon}
              </span>
              <div className="font-display text-lg text-text">{INVENTORY_ZONE_LABELS[openZone]}</div>
            </div>

            {byZone[openZone].length === 0 ? (
              <div className="mb-3 rounded-lg border border-dashed border-border p-3 text-[12px] text-textMuted">
                Todavía no hay nada acá.
              </div>
            ) : (
              <div className="mb-3 space-y-1.5">
                {byZone[openZone].map((item) => (
                  <div key={item.id} className="rounded-lg border border-border bg-bg/40 px-2.5 py-2">
                    <button
                      type="button"
                      onClick={() => setReassigning((prev) => (prev === item.id ? null : item.id))}
                      className="flex w-full items-center justify-between gap-2 text-left"
                    >
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text">{item.name}</span>
                      <span className="shrink-0 font-mono text-[11px] text-textMuted">
                        {item.quantity} {item.unit}
                      </span>
                    </button>
                    {reassigning === item.id && (
                      <div className="mt-2 grid grid-cols-2 gap-1.5 border-t border-border pt-2">
                        {ZONE_ORDER.map((z) => (
                          <button
                            key={z}
                            type="button"
                            disabled={z === openZone}
                            onClick={() => reassign(item, z)}
                            className={`rounded-lg border px-2 py-1.5 font-mono text-[9.5px] uppercase tracking-wide ${
                              z === openZone ? "border-gold/60 bg-gold/10 text-gold" : "border-border bg-bg/60 text-textMuted"
                            }`}
                          >
                            {INVENTORY_ZONE_LABELS[z]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-lg border border-dashed border-border bg-bg/20 p-2.5">
              <div className="mb-1.5 font-mono text-[9px] uppercase tracking-wide text-textMuted">+ Agregar acá</div>
              <QuickAddProducts addStructuredItems={addStructuredItems} productMemory={productMemory} compact forceZone={openZone} />
            </div>

            <button
              type="button"
              onClick={() => {
                setOpenZone(null);
                setReassigning(null);
              }}
              className="mt-3 w-full rounded-lg border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-textMuted"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {showUnassigned && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-bg/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setShowUnassigned(false)}
        >
          <div
            className="max-h-[82vh] w-full max-w-sm overflow-y-auto rounded-t-2xl border border-border bg-surface p-4 shadow-2xl sm:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-1 font-display text-lg text-text">Sin zona</div>
            <div className="mb-3 text-[11px] text-textMuted">
              Estos productos todavía no tienen una zona asignada — elegí una para cada uno.
            </div>

            {unassigned.length === 0 ? (
              <div className="mb-3 rounded-lg border border-dashed border-border p-3 text-[12px] text-textMuted">
                Ya asignaste todo ✓
              </div>
            ) : (
              <div className="mb-3 space-y-2">
                {unassigned.map((item) => (
                  <div key={item.id} className="rounded-lg border border-rust/40 bg-rust/5 px-2.5 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text">{item.name}</span>
                      <span className="shrink-0 font-mono text-[11px] text-textMuted">
                        {item.quantity} {item.unit}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-1.5 border-t border-border pt-2">
                      {ZONE_ORDER.map((z) => (
                        <button
                          key={z}
                          type="button"
                          onClick={() => reassign(item, z)}
                          className="rounded-lg border border-border bg-bg/60 px-2 py-1.5 font-mono text-[9.5px] uppercase tracking-wide text-textMuted"
                        >
                          {INVENTORY_ZONE_LABELS[z]}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowUnassigned(false)}
              className="w-full rounded-lg border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-textMuted"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
