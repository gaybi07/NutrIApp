"use client";

import { useState } from "react";
import { useEscapeKey } from "@/lib/useEscapeKey";

/**
 * Ícono "?" que muestra ayuda al tocarlo (no al pasar el mouse, para que
 * funcione igual en mobile y desktop). Pensado para vivir al lado de un
 * título de sección o la label de un campo.
 */
export function InfoHint({ text, label = "Más información" }: { text: string; label?: string }) {
  const [open, setOpen] = useState(false);
  useEscapeKey(() => setOpen(false), open);

  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        aria-label={label}
        className="ml-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border font-mono text-[9px] text-textMuted hover:border-gold/60 hover:text-gold"
      >
        ?
      </button>
      {open && (
        <>
          <span
            className="fixed inset-0 z-40"
            onClick={(event) => {
              event.stopPropagation();
              setOpen(false);
            }}
          />
          <span className="absolute left-0 top-full z-50 mt-1 w-60 max-w-[70vw] rounded-lg border border-gold/30 bg-surface p-2.5 text-left text-[11px] font-normal normal-case leading-relaxed tracking-normal text-textMuted shadow-2xl">
            {text}
          </span>
        </>
      )}
    </span>
  );
}
