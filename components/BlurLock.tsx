"use client";

import { ReactNode, createContext, useState } from "react";
import { Lock } from "lucide-react";

/** Dentro de un BlurLock activo, los Collapsible se muestran abiertos: si no,
 * detrás del desenfoque solo se vería su encabezado cerrado. */
export const ForceOpenContext = createContext(false);

/** Muestra el contenido real desenfocado con un candado encima -- para que en
 * el plan Básico se vea que el reporte "se está generando" y den ganas de
 * desbloquearlo. Con `active` en falso renderiza los hijos tal cual. */
export function BlurLock({
  active,
  title,
  onUpgrade,
  children,
}: {
  active: boolean;
  title: string;
  onUpgrade: () => void;
  children: ReactNode;
}) {
  if (!active) return <>{children}</>;
  return (
    <div className="relative mb-3 overflow-hidden rounded-2xl">
      <div aria-hidden className="pointer-events-none max-h-[560px] select-none overflow-hidden opacity-80 blur-[6px]">
        <ForceOpenContext.Provider value={true}>{children}</ForceOpenContext.Provider>
      </div>
      <button
        type="button"
        onClick={onUpgrade}
        className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-bg/30 px-4 text-center"
      >
        <Lock size={26} strokeWidth={1.8} className="text-gold" />
        <span className="font-display text-sm text-text">{title}</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-gold">Desbloquealo con un plan · Ver planes</span>
      </button>
    </div>
  );
}

/** Tarjeta colapsada (como cualquier Collapsible) que, al abrirla, muestra el
 * bloque real desenfocado con un candado: para bloques que el plan no incluye. */
export function LockedCollapsible({
  eyebrow,
  title,
  onUpgrade,
  children,
}: {
  eyebrow: string;
  title: string;
  onUpgrade: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="mb-4 rounded-2xl border border-border bg-surface/70">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-2 p-3 text-left">
        <span>
          <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-gold">{eyebrow}</span>
          <span className="block font-display text-xl leading-none -tracking-[0.04em]">{title}</span>
        </span>
        <span className="font-mono text-[11px] text-textMuted" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
      </button>
      {open && (
        <div className="px-3 pb-3">
          <BlurLock active title={title} onUpgrade={onUpgrade}>{children}</BlurLock>
        </div>
      )}
    </section>
  );
}
