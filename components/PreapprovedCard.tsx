"use client";

import { PLUS_EXTRA, PROFESSIONAL_LEVELS } from "@/lib/professionalLevels";
import { money } from "@/lib/expenses";
import { btn } from "@/components/buttonStyles";

/**
 * Vista del profesional PREAPROBADO: su título ya está verificado pero todavía no activó su cuenta profesional. Mientras tanto
 * sigue como Básico: no puede tener pacientes ni autogestionarse gratis. Los cobros están maquetados (todavía no funcionan):
 * por ahora un administrador lo activa a mano para que pruebe la app.
 */
export function PreapprovedCard({ quien }: { quien: "Entrenador" | "Nutricionista" }) {
  return (
    <div className="rounded-xl border border-gold/40 bg-gold/5 p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-gold">Preaprobado</div>
      <div className="mt-1 text-[13px] text-text">
        Verificamos tu título como {quien}. Para empezar a ejercer elegís un nivel según cuántos pacientes querés tener. Hasta entonces tu cuenta sigue
        como Básico.
      </div>
      <div className="mt-2 space-y-1.5">
        {PROFESSIONAL_LEVELS.map((l) => (
          <div key={l.nivel} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg/40 px-2.5 py-2">
            <div>
              <div className="text-[13px] font-semibold text-text">Profesional {l.nivel}</div>
              <div className="font-mono text-[10px] text-textMuted">hasta {l.pacientes} pacientes</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[12px] font-bold text-text">{money(l.precio)}/mes</div>
              <div className="font-mono text-[10px] text-textMuted">con Plus {money(l.precio + PLUS_EXTRA)}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 text-[11px] text-textMuted">
        El <b>Plus</b> suma lo que no es tu disciplina: vincularte a un profesional de la otra área o planificártela vos mismo.
      </div>
      <button type="button" disabled className={`${btn("primary", "md", true)} mt-3`}>
        Elegir nivel y pagar (próximamente)
      </button>
      <div className="mt-1.5 text-[11px] text-textMuted">La app está en prueba: pedile a un administrador que active tu cuenta para usarla.</div>
    </div>
  );
}
