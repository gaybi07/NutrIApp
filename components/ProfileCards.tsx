"use client";

import { ProfessionalProfileView } from "@/lib/useProfiles";

/** Círculo con las iniciales (por ahora no hay fotos). */
export function Avatar({ initials, size = 40 }: { initials: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full border border-gold/60 bg-gold/15 font-mono font-bold text-gold"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

function Stars({ promedio, cantidad }: { promedio: number | null; cantidad: number }) {
  if (promedio == null || cantidad === 0) return <span className="text-[11px] text-textMuted">Todavía sin calificaciones</span>;
  const full = Math.round(promedio);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-[14px] tracking-tight text-gold" aria-label={`${promedio} de 5`}>
        {"★".repeat(full)}
        <span className="text-textMuted/50">{"★".repeat(5 - full)}</span>
      </span>
      <span className="font-mono text-[11px] text-text">{Number(promedio).toLocaleString("es-AR", { maximumFractionDigits: 1 })}</span>
      <span className="font-mono text-[10px] text-textMuted">({cantidad})</span>
    </span>
  );
}

function Verified() {
  return (
    <span
      className="shrink-0 rounded-full px-2 py-1 font-mono text-[9px] font-bold uppercase leading-none tracking-wide"
      style={{ background: "rgb(var(--color-sage))", color: "#0f3d2d" }}
    >
      Verificado
    </span>
  );
}

const Block = ({ label, text }: { label: string; text?: string | null }) =>
  text ? (
    <div className="mt-2">
      <div className="font-mono text-[9px] uppercase tracking-wide text-gold">{label}</div>
      <div className="whitespace-pre-line text-[13px] text-text">{text}</div>
    </div>
  ) : null;

/** Vista corta: cómo se muestra el profesional a quien está pensando vincularse (cupos libres). */
export function ProfessionalShortCard({ view, initials }: { view: ProfessionalProfileView; initials: string }) {
  const name = view.nombre || view.alias || "Profesional";
  return (
    <div className="rounded-xl border border-border bg-bg/40 p-3">
      <div className="flex items-start gap-3">
        <Avatar initials={initials} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate font-display text-lg text-text">{name}</div>
            {view.verificado && <Verified />}
          </div>
          {view.alias && view.nombre && <div className="font-mono text-[10px] text-textMuted">@{view.alias}</div>}
          {view.titulo && <div className="text-[12px] text-textMuted">{view.titulo}</div>}
        </div>
      </div>
      <Block label="A qué me dedico" text={view.dedicacion} />
      <Block label="Sobre mí" text={view.bio} />
      <Block label="Logros y metas" text={view.logros} />
    </div>
  );
}

/** Vista extendida: la que ve quien ya está vinculado (suma estrellas, opiniones y WhatsApp si lo dejó visible). */
export function ProfessionalLinkedCard({ view, initials }: { view: ProfessionalProfileView; initials: string }) {
  return (
    <div className="space-y-3">
      <ProfessionalShortCard view={view} initials={initials} />
      <div className="rounded-xl border border-border bg-bg/40 p-3">
        <div className="font-mono text-[9px] uppercase tracking-wide text-gold">Calificación</div>
        <div className="mt-1">
          <Stars promedio={view.promedio} cantidad={view.cantidad} />
        </div>
        {view.opiniones.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {view.opiniones.map((o, i) => (
              <div key={i} className="rounded-lg border border-border bg-bg/30 px-2.5 py-2">
                <div className="text-[11px] text-gold">{"★".repeat(o.stars)}</div>
                <div className="text-[12px] text-text">{o.comentario}</div>
                <div className="font-mono text-[9px] text-textMuted">{new Date(o.fecha).toLocaleDateString("es-AR")} · anónimo</div>
              </div>
            ))}
          </div>
        )}
      </div>
      {view.whatsapp && (
        <a
          href={`https://wa.me/${view.whatsapp.replace(/\D/g, "")}`}
          target="_blank"
          rel="noreferrer"
          className="block rounded-xl border border-sage/50 bg-sage/10 px-3 py-2.5 text-[13px] text-sage"
        >
          WhatsApp: {view.whatsapp}
        </a>
      )}
    </div>
  );
}
