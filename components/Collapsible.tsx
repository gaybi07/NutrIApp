"use client";

import { KeyboardEvent, ReactNode, useEffect, useState } from "react";
import { InfoHint } from "@/components/InfoHint";

export function Collapsible({
  eyebrow,
  title,
  badge,
  info,
  defaultOpen = false,
  openOnDesktop = false,
  scrollable = true,
  locked = false,
  children,
}: {
  eyebrow: string;
  title: string;
  badge?: ReactNode;
  /** Texto de ayuda permanente — se muestra con un ícono "?" junto al título. */
  info?: string;
  defaultOpen?: boolean;
  /** Fuerza el bloque abierto al montar en pantallas grandes (PC, >=1024px)
   * sin tocar el estado inicial en mobile -- para Inicio, donde en PC hay
   * lugar de sobra y no tiene sentido arrancar todo colapsado. */
  openOnDesktop?: boolean;
  /** Si es true (default), el contenido abierto se limita en altura y scrollea
   * adentro en vez de empujar el resto de la página. Poné false para
   * contenido con elementos que no deben recortarse (ej. tooltips absolutos). */
  scrollable?: boolean;
  /** Bloque siempre abierto, sin flechita ni forma de colapsarlo -- para el
   * "Hoy" de Entrenamiento, que no debería poder cerrarse nunca. */
  locked?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(locked || defaultOpen);

  useEffect(() => {
    if (!openOnDesktop) return;
    const mql = window.matchMedia("(min-width: 1024px)");
    if (mql.matches) setOpen(true);
    const handleChange = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(true);
    };
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, [openOnDesktop]);
  const toggle = () => {
    if (locked) return;
    setOpen((current) => !current);
  };
  const onHeaderKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggle();
    }
  };

  return (
    <section className="mb-4 rounded-2xl border border-border bg-surface/70 shadow-[0_0_0_1px_rgba(58,54,47,0.4)]">
      <div
        role={locked ? undefined : "button"}
        tabIndex={locked ? undefined : 0}
        onClick={toggle}
        onKeyDown={locked ? undefined : onHeaderKeyDown}
        className={`flex w-full items-center justify-between gap-2 p-3 text-left ${locked ? "" : "cursor-pointer"}`}
      >
        <div>
          <div className="collapsible-eyebrow font-mono text-[10px] uppercase tracking-[0.18em] text-gold">{eyebrow}</div>
          <div className="flex items-center font-display text-xl leading-none -tracking-[0.04em]">
            <span className="collapsible-title-text">{title}</span>
            {info && <InfoHint text={info} label={`Qué es ${title}`} />}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {badge}
          {!locked && (
            <span
              className="font-mono text-[11px] text-textMuted transition-transform"
              style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              ▾
            </span>
          )}
        </div>
      </div>
      {open && (
        <div className={`px-3 pb-3 ${scrollable ? "max-h-[60vh] overflow-y-auto" : ""}`}>{children}</div>
      )}
    </section>
  );
}
