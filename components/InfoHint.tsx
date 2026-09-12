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
        className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border font-mono text-[11px] text-textMuted hover:border-gold/60 hover:text-gold"
      >
        ?
      </button>
      {open && (
        <span
          className="fixed inset-0 z-40 flex items-end justify-center bg-bg/60 p-4 pb-8 backdrop-blur-sm sm:items-center"
          onClick={(event) => {
            event.stopPropagation();
            setOpen(false);
          }}
        >
          <span
            className="block w-full max-w-sm rounded-xl border border-gold/30 bg-surface p-3 text-left text-[13px] font-normal normal-case leading-relaxed tracking-normal text-textMuted shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {text}
          </span>
        </span>
      )}
    </span>
  );
}
