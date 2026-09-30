"use client";

import { ReactNode } from "react";
import { Lock } from "lucide-react";

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
        {children}
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
