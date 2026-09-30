"use client";

import { useState } from "react";
import { FeedbackPrompt } from "@/lib/useTrainerLink";
import { btn } from "@/components/buttonStyles";
import { useEscapeKey } from "@/lib/useEscapeKey";

interface LinkHook {
  link: unknown;
  status: string;
  lockedUntil: string | null;
  needsMonthlyFeedback: boolean;
  feedbackPrompt: FeedbackPrompt | null;
  dismissFeedbackPrompt: () => void;
  openMonthlyFeedback: () => void;
  submitFeedback: (prompt: FeedbackPrompt, stars: number, comentario: string) => Promise<boolean>;
}

function fmtDay(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

/** Calificación del cliente a su profesional: estrellas + comentario opcional. Se pide al cerrar el mes de vínculo y al desvincularse. */
function FeedbackModal({ prompt, who, onSubmit, onClose }: { prompt: FeedbackPrompt; who: string; onSubmit: (stars: number, comentario: string) => Promise<boolean>; onClose: () => void }) {
  const [stars, setStars] = useState(0);
  const [comentario, setComentario] = useState("");
  const [busy, setBusy] = useState(false);
  useEscapeKey(onClose, true);
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-bg/80 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-t-2xl border border-border bg-surface p-4 shadow-2xl sm:rounded-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">{prompt.momento === "desvinculacion" ? "Al desvincularte" : "Cierre de mes"}</div>
        <div className="font-display text-xl text-text">¿Cómo te fue con tu {who}?</div>
        <div className="mt-1 text-[12px] text-textMuted">
          {prompt.trainerEmail}. Tu calificación le llega a tu {who} y ayuda a que otros lo elijan. Es opcional.
        </div>
        <div className="mt-3 flex justify-center gap-1" role="radiogroup" aria-label="Estrellas">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={stars === n}
              aria-label={`${n} estrella${n === 1 ? "" : "s"}`}
              onClick={() => setStars(n)}
              className="p-1 text-3xl leading-none"
              style={{ color: n <= stars ? "rgb(var(--color-carbs))" : "rgb(var(--color-border))" }}
            >
              ★
            </button>
          ))}
        </div>
        <textarea
          value={comentario}
          onChange={(event) => setComentario(event.target.value)}
          placeholder="Contanos cómo fue (opcional)"
          rows={3}
          maxLength={500}
          className="mt-2 w-full text-[13px]"
        />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className={btn("neutral", "md", true)}>
            Omitir
          </button>
          <button
            type="button"
            disabled={stars === 0 || busy}
            onClick={async () => {
              setBusy(true);
              await onSubmit(stars, comentario);
              setBusy(false);
            }}
            className={btn("primary", "md", true)}
          >
            {busy ? "Enviando..." : "Enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Avisos del ciclo de vida del vínculo del lado CLIENTE: bloqueo por cambio de profesional, pedido de calificación
 * mensual y el formulario de calificación (también al desvincularse). Va dentro de la sección "Tu nutricionista" /
 * "Tu entrenador" y se renderiza siempre, porque el formulario aparece justo cuando el vínculo ya no existe.
 */
export function LinkLifecycle({ hook, who }: { hook: LinkHook; who: "nutricionista" | "entrenador" }) {
  const hasLink = Boolean(hook.link);
  const isError = /Cambiaste de profesional|No se pudo/.test(hook.status);
  return (
    <>
      {hasLink && hook.lockedUntil && (
        <div className="mb-2 rounded-lg border border-gold/40 bg-gold/5 px-2.5 py-2 text-[12px] text-text">
          Cambiaste de profesional hace poco. Vas a poder volver a cambiar a partir del <b>{fmtDay(hook.lockedUntil)}</b> (14 días si el nuevo es del mismo
          tipo, 28 si es de otro tipo).
        </div>
      )}
      {hasLink && hook.needsMonthlyFeedback && !hook.feedbackPrompt && (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-border bg-bg/40 px-2.5 py-2">
          <span className="text-[12px] text-text">¿Cómo te va con tu {who}?</span>
          <button type="button" onClick={hook.openMonthlyFeedback} className={btn("secondary", "sm")}>
            Calificar
          </button>
        </div>
      )}
      {isError && <div className="mb-2 rounded-lg border border-rust/40 bg-rust/10 px-2.5 py-2 text-[12px] text-rust">{hook.status}</div>}
      {hook.feedbackPrompt && (
        <FeedbackModal
          prompt={hook.feedbackPrompt}
          who={who}
          onSubmit={(stars, comentario) => hook.submitFeedback(hook.feedbackPrompt!, stars, comentario)}
          onClose={hook.dismissFeedbackPrompt}
        />
      )}
    </>
  );
}
