"use client";

import { ClientPlan } from "@/lib/types";

/**
 * Mismo estilo que WeeklyWeight cuando falta cargar el peso -- pero para
 * "todavía no te vinculaste a un profesional", que tiene sentido solo si tu
 * plan pago lo espera (Premium: uno de los dos; Premium+: los dos). Básico
 * y Autoentreno no muestran nada -- no necesitan ningún vínculo.
 */
export function PendingLinkCard({
  plan,
  hasTrainerLink,
  hasNutricionistaLink,
  onOpen,
}: {
  plan: ClientPlan;
  hasTrainerLink: boolean;
  hasNutricionistaLink: boolean;
  onOpen: () => void;
}) {
  if (plan !== "premium" && plan !== "premium_plus") return null;

  const missing: string[] = [];
  if (plan === "premium") {
    if (!hasTrainerLink && !hasNutricionistaLink) missing.push("un Profe o un Nutricionista");
  } else {
    if (!hasTrainerLink) missing.push("un Profe");
    if (!hasNutricionistaLink) missing.push("un Nutricionista");
  }
  if (missing.length === 0) return null;

  return (
    <section className="mb-4 rounded-xl border-2 border-rust/50 bg-surface p-3 shadow-[0_0_24px_-6px_rgba(239,68,68,0.45)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">Tu plan incluye esto</div>
          <h2 className="font-display text-lg text-text">Vincularte a {missing.join(" y ")}</h2>
        </div>
        <div className="shrink-0 rounded-full border border-rust/50 bg-rust/15 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-rust">
          Pendiente
        </div>
      </div>
      <div className="mt-2 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-[11px] text-textMuted">
        Todavía no usaste el código de {missing.length > 1 ? "ningún profesional" : "tu profesional"} -- vinculate para
        aprovechar lo que tu plan ya paga.
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="mt-3 w-full rounded-lg border border-gold/60 bg-gold px-3 py-2 font-sans text-[12px] font-bold text-bg"
      >
        Vincularme ahora
      </button>
    </section>
  );
}
