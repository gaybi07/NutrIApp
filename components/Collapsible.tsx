"use client";

import { ReactNode, useState } from "react";

export function Collapsible({
  eyebrow,
  title,
  badge,
  defaultOpen = false,
  scrollable = true,
  children,
}: {
  eyebrow: string;
  title: string;
  badge?: ReactNode;
  defaultOpen?: boolean;
  /** Si es true (default), el contenido abierto se limita en altura y scrollea
   * adentro en vez de empujar el resto de la página. Poné false para
   * contenido con elementos que no deben recortarse (ej. tooltips absolutos). */
  scrollable?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="mb-4 rounded-2xl border border-border bg-surface/70 shadow-[0_0_0_1px_rgba(58,54,47,0.4)]">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-2 p-3 text-left"
      >
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">{eyebrow}</div>
          <div className="font-display text-xl leading-none -tracking-[0.04em]">{title}</div>
        </div>
        <div className="flex items-center gap-2">
          {badge}
          <span
            className="font-mono text-[11px] text-textMuted transition-transform"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            ▾
          </span>
        </div>
      </button>
      {open && (
        <div className={`px-3 pb-3 ${scrollable ? "max-h-[60vh] overflow-y-auto" : ""}`}>{children}</div>
      )}
    </section>
  );
}
