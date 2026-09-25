"use client";

import { useRef, useState } from "react";
import { ClientPlan, PLAN_PRICES_ARS } from "@/lib/types";

type PlanId = ClientPlan;
const PLAN_IDS: PlanId[] = ["basico", "premium", "autoentreno", "premium_plus"];
const PLAN_TAB_LABEL: Record<PlanId, string> = { basico: "Básico", premium: "Premium", autoentreno: "Autoentreno", premium_plus: "Premium+" };

function fmtPrice(n: number) {
  return n.toLocaleString("es-AR");
}

/**
 * Carrusel de planes real (versión validada del prototipo en
 * design-scratch/prototype-planes-carousel.html) -- "Elegir" en un plan
 * pago llama a /api/mercadopago/subscribe y redirige al checkout de
 * MercadoPago. Básico no tiene botón: es el estado por default, no hay
 * nada que "elegir" para volver a él desde acá (bajar de plan queda para
 * cuando haga falta, no es parte de esta fase).
 */
export function PlansCarousel({ currentPlan }: { currentPlan: ClientPlan }) {
  const [selected, setSelected] = useState(PLAN_IDS.indexOf(currentPlan) >= 0 ? PLAN_IDS.indexOf(currentPlan) : 1);
  const [busyPlan, setBusyPlan] = useState<PlanId | null>(null);
  const [error, setError] = useState("");
  const deckRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const goTo = (i: number) => {
    setSelected(i);
    cardRefs.current[i]?.scrollIntoView({ behavior: "smooth", inline: "start" });
  };

  const elegir = async (plan: PlanId) => {
    if (plan === "basico") return;
    setError("");
    setBusyPlan(plan);
    try {
      const res = await fetch("/api/mercadopago/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "No se pudo armar el cobro.");
      window.location.href = data.initPoint;
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo armar el cobro.");
      setBusyPlan(null);
    }
  };

  return (
    <div>
      <div className="font-display italic text-lg text-gold mb-3">💎 Planes y suscripción</div>

      <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1" style={{ scrollbarWidth: "none" }}>
        {PLAN_IDS.map((id, i) => (
          <button
            key={id}
            type="button"
            onClick={() => goTo(i)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 font-mono text-[12px] font-bold whitespace-nowrap ${
              selected === i ? "border-gold text-gold bg-gold/10" : "border-border bg-surface text-textMuted"
            }`}
          >
            {PLAN_TAB_LABEL[id]}
          </button>
        ))}
      </div>

      <div ref={deckRef} className="-mx-3 flex gap-3 overflow-x-auto px-3 pb-1" style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none" }}>
        {/* BÁSICO */}
        <div ref={(el) => { cardRefs.current[0] = el; }} className="shrink-0 basis-full rounded-2xl border border-border bg-surface p-4" style={{ scrollSnapAlign: "start" }}>
          <div className="font-mono text-[10px] uppercase tracking-wide text-textMuted">BÁSICO</div>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-text">$0</span>
            <span className="text-[11px] text-textMuted">/mes, para siempre</span>
          </div>
          <Feature check nombre="Registro diario a mano" detalle="Comidas, macros, peso, sueño, pasos y entrenamientos — todo lo cargás vos." />
          <Feature check nombre="Alacena personal" detalle="Inventario propio, escaneo de códigos y control de stock." />
          <Feature nombre="Plan armado (por IA o por un profesional)" detalle="Ni la IA ni ningún profesional te organizan la semana." />
          <Feature nombre="Reportes de progreso" detalle="Sin reportes semanales ni seguimiento de adherencia." />
        </div>

        {/* PREMIUM */}
        <div
          ref={(el) => { cardRefs.current[1] = el; }}
          className="shrink-0 basis-full rounded-2xl border border-gold bg-gradient-to-br from-gold/10 to-surface p-4"
          style={{ scrollSnapAlign: "start" }}
        >
          <div className="font-mono text-[10px] uppercase tracking-wide text-gold">PREMIUM · MÁS ELEGIDO</div>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-text">${fmtPrice(PLAN_PRICES_ARS.premium)}</span>
            <span className="text-[11px] text-textMuted">/mes</span>
          </div>
          <div className="mb-2 text-[11px] italic text-textMuted">Incluye todo lo de Básico, más:</div>
          <Feature check nombre="Un Profe o un Nutricionista" detalle="Elegís con quién vincularte: entrenamiento o plan nutricional, no ambos." />
          <Feature check nombre="Plan semanal armado por tu profesional" detalle="Rutinas asignadas día por día, o un plan de comidas con opciones y macros." />
          <Feature check nombre="Seguimiento real" detalle="Tu profesional ve tu progreso semana a semana y te deja comentarios." />
          <button
            type="button"
            disabled={busyPlan === "premium" || currentPlan === "premium"}
            onClick={() => elegir("premium")}
            className="mt-3 w-full rounded-lg bg-gold p-2.5 font-sans text-sm font-bold text-bg disabled:opacity-50"
          >
            {currentPlan === "premium" ? "Tu plan actual" : busyPlan === "premium" ? "Redirigiendo..." : "Elegir Premium"}
          </button>
        </div>

        {/* AUTOENTRENO */}
        <div ref={(el) => { cardRefs.current[2] = el; }} className="shrink-0 basis-full rounded-2xl border border-border bg-surface p-4" style={{ scrollSnapAlign: "start" }}>
          <div className="font-mono text-[10px] uppercase tracking-wide text-textMuted">AUTOENTRENO</div>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-text">${fmtPrice(PLAN_PRICES_ARS.autoentreno)}</span>
            <span className="text-[11px] text-textMuted">/mes</span>
          </div>
          <div className="mb-2 text-[11px] italic text-textMuted">Incluye todo lo de Básico, más:</div>
          <Feature check nombre="Plan semanal de entrenamiento por IA" detalle="Rutinas armadas y ajustadas automáticamente, sin que haya un Profe humano." />
          <Feature check nombre="Plan de comidas por IA" detalle="Opciones de comida con macros y explicación, sin un Nutricionista humano." />
          <Feature check nombre="Reportes de adherencia" detalle="Igual que con un profesional, pero generados." />
          <button
            type="button"
            disabled={busyPlan === "autoentreno" || currentPlan === "autoentreno"}
            onClick={() => elegir("autoentreno")}
            className="mt-3 w-full rounded-lg border border-border bg-bg/60 p-2.5 font-sans text-sm font-bold text-text disabled:opacity-50"
          >
            {currentPlan === "autoentreno" ? "Tu plan actual" : busyPlan === "autoentreno" ? "Redirigiendo..." : "Elegir Autoentreno"}
          </button>
        </div>

        {/* PREMIUM+ */}
        <div ref={(el) => { cardRefs.current[3] = el; }} className="shrink-0 basis-full rounded-2xl border border-border bg-surface p-4" style={{ scrollSnapAlign: "start" }}>
          <div className="font-mono text-[10px] uppercase tracking-wide text-textMuted">PREMIUM+</div>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-text">${fmtPrice(PLAN_PRICES_ARS.premium_plus)}</span>
            <span className="text-[11px] text-textMuted">/mes</span>
          </div>
          <div className="mb-2 text-[11px] italic text-textMuted">Incluye todo lo de Premium, más:</div>
          <Feature check nombre="Profe y Nutricionista a la vez" detalle="Entrenamiento y alimentación coordinados, cada uno viendo su parte." />
          <Feature check nombre="Dos planes semanales en paralelo" detalle="Tu rutina de entrenamiento y tu plan de comidas, cada uno con su profesional." />
          <button
            type="button"
            disabled={busyPlan === "premium_plus" || currentPlan === "premium_plus"}
            onClick={() => elegir("premium_plus")}
            className="mt-3 w-full rounded-lg border border-border bg-bg/60 p-2.5 font-sans text-sm font-bold text-text disabled:opacity-50"
          >
            {currentPlan === "premium_plus" ? "Tu plan actual" : busyPlan === "premium_plus" ? "Redirigiendo..." : "Elegir Premium+"}
          </button>
        </div>
      </div>

      <div className="mt-2 flex justify-center gap-1.5">
        {PLAN_IDS.map((id, i) => (
          <span key={id} className={`h-1.5 rounded-full transition-all ${selected === i ? "w-4 bg-gold" : "w-1.5 bg-border"}`} />
        ))}
      </div>

      {error && <div className="mt-2 text-center text-[12px] text-rust">{error}</div>}
    </div>
  );
}

function Feature({ nombre, detalle, check }: { nombre: string; detalle: string; check?: boolean }) {
  return (
    <div className="flex gap-2 border-t border-border/60 py-2 first:border-t-0">
      <span className={`w-4 shrink-0 text-[13px] ${check ? "text-sage" : "text-textMuted"}`}>{check ? "✓" : "–"}</span>
      <div>
        <b className="block text-[12px] text-text">{nombre}</b>
        <span className="text-[11px] leading-snug text-textMuted">{detalle}</span>
      </div>
    </div>
  );
}
