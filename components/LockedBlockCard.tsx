"use client";

import { Lock } from "lucide-react";

/** Versión compacta de LockedTabNotice para un bloque dentro de una solapa
 * (ej. Inicio en plan Básico): se ve, con candado, y lleva a los planes. */
export function LockedBlockCard({ title, description, onUpgrade }: { title: string; description: string; onUpgrade: () => void }) {
  return (
    <button
      type="button"
      onClick={onUpgrade}
      className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-dashed border-border bg-surface/50 p-3 text-left"
    >
      <Lock size={20} strokeWidth={1.8} className="shrink-0 text-textMuted" />
      <span className="min-w-0 flex-1">
        <span className="block font-display text-sm text-text">{title}</span>
        <span className="block text-[11px] text-textMuted">{description}</span>
      </span>
      <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-gold">Ver planes</span>
    </button>
  );
}
