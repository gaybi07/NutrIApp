"use client";

import { Lock } from "lucide-react";

/** Lo que se ve al tocar una solapa que el plan Básico tiene bloqueada --
 * en vez de que la solapa desaparezca, se muestra qué desbloquea y cómo. */
export function LockedTabNotice({
  title,
  unlocks,
  onUpgrade,
}: {
  title: string;
  unlocks: string[];
  onUpgrade: () => void;
}) {
  return (
    <section className="mt-4 rounded-2xl border border-border bg-surface p-5 text-center">
      <Lock size={28} strokeWidth={1.8} className="mx-auto text-textMuted" />
      <h2 className="mt-2 font-display text-lg text-text">{title} es parte de un plan pago</h2>
      <ul className="mx-auto mt-3 max-w-xs space-y-1 text-left text-xs text-textMuted">
        {unlocks.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onUpgrade}
        className="mt-4 rounded-xl bg-gold px-4 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-bg"
      >
        Ver planes
      </button>
    </section>
  );
}
