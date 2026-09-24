import { GoalProgressInfo } from "@/lib/calculations";
import { Collapsible } from "@/components/Collapsible";
import { SECTION_HELP } from "@/lib/helpText";

const MODO_LABEL: Record<"perder" | "aumentar", { verbo: string; hacia: string }> = {
  perder: { verbo: "Bajando", hacia: "hasta" },
  aumentar: { verbo: "Subiendo", hacia: "hasta" },
};

function fmt(n: number) {
  return Math.abs(n).toLocaleString("es-AR", { maximumFractionDigits: 1, minimumFractionDigits: n % 1 === 0 ? 0 : 1 });
}

function fmtDateAr(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export function GoalProgress({ progress, openOnDesktop }: { progress: GoalProgressInfo; openOnDesktop?: boolean }) {
  const { modo, metaKg, fechaObjetivo, diasRestantes, kgTotalPlan, kgYaLogrados, kgRestantes, kgPorSemanaNecesario, ritmoRealSemanal, yaLlego, proteinTargetG, goalKcal, actualKg } =
    progress;

  // "Recomponer" no tiene una meta de peso (no hay dirección clara: el
  // objetivo es cambiar composición corporal, no el número de la balanza),
  // así que en vez de la barra de progreso muestra lo que sí importa acá:
  // cuánta proteína y cuántas kcal por día.
  if (modo === "recomponer") {
    return (
      <Collapsible eyebrow="Objetivo" title="Recomposición corporal" info={SECTION_HELP.objetivo} openOnDesktop={openOnDesktop}>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-lg border border-border bg-bg/40 px-2 py-2">
            <div className="font-mono text-[9px] uppercase tracking-wide text-textMuted">Objetivo diario</div>
            <div className="font-sans text-lg font-bold leading-tight text-text">{goalKcal.toLocaleString("es-AR")}kcal</div>
          </div>
          <div className="rounded-lg border border-border bg-bg/40 px-2 py-2">
            <div className="font-mono text-[9px] uppercase tracking-wide text-textMuted">Proteína</div>
            <div className="font-sans text-lg font-bold leading-tight text-text">{proteinTargetG}g</div>
            <div className="font-mono text-[9px] text-textMuted">por día</div>
          </div>
        </div>
        <div className="mt-2 text-center text-[12px] text-textMuted">
          Sin meta de peso: la proteína alta es lo que sostiene el músculo mientras recomponés.
        </div>
      </Collapsible>
    );
  }

  const label = MODO_LABEL[modo];
  const pct = kgTotalPlan > 0 ? Math.max(0, Math.min(100, Math.round((kgYaLogrados / kgTotalPlan) * 100))) : 0;

  const onTrack = ritmoRealSemanal != null && kgPorSemanaNecesario != null && ritmoRealSemanal >= kgPorSemanaNecesario * 0.85;
  const wrongWay = ritmoRealSemanal != null && ritmoRealSemanal <= 0;
  const behind = ritmoRealSemanal != null && !onTrack && !wrongWay;

  let mensaje = "Cargá tu peso de esta semana para ver cómo venís.";
  let colorMensaje = "text-textMuted";
  if (yaLlego) {
    mensaje = "🎉 ¡Ya llegaste a tu objetivo!";
    colorMensaje = "text-sage";
  } else if (ritmoRealSemanal != null && kgPorSemanaNecesario == null && diasRestantes <= 0) {
    mensaje = "La fecha objetivo ya pasó — pero seguís sumando progreso. Podés poner una fecha nueva desde la calculadora.";
    colorMensaje = "text-textMuted";
  } else if (onTrack) {
    mensaje = "¡Vas mejor de lo que necesitás! Seguí así.";
    colorMensaje = "text-sage";
  } else if (behind) {
    mensaje = "Vas progresando, un poco más lento de lo necesario.";
    colorMensaje = "text-gold";
  } else if (wrongWay) {
    mensaje = "Esta semana no avanzaste en la dirección que buscás — no aflojés.";
    colorMensaje = "text-rust";
  }

  return (
    <Collapsible eyebrow="Objetivo" title={`${label.verbo} ${label.hacia} ${fmt(metaKg)}kg`} info={SECTION_HELP.objetivo} openOnDesktop={openOnDesktop}>
      {yaLlego ? (
        <div className="rounded-lg border border-sage/40 bg-sage/10 px-3 py-2.5 text-[13px] text-sage">{mensaje}</div>
      ) : (
        <>
          <div className="mb-1 flex items-baseline justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wide text-textMuted">
              Ya {modo === "perder" ? "bajaste" : "subiste"} {fmt(kgYaLogrados)}kg de {fmt(kgTotalPlan)}kg
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wide text-textMuted">{pct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-bg">
            <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1 flex items-center justify-between font-mono text-[9px] text-textMuted">
            <span>Empezaste en {fmt(actualKg)}kg</span>
            <span>Meta: {fmt(metaKg)}kg</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg border border-border bg-bg/40 px-2 py-2">
              <div className="font-mono text-[9px] uppercase tracking-wide text-textMuted">Te faltan</div>
              <div className="font-sans text-lg font-bold leading-tight text-text">{fmt(kgRestantes)}kg</div>
              <div className="font-mono text-[9px] text-textMuted">antes del {fmtDateAr(fechaObjetivo)}</div>
            </div>
            <div className="rounded-lg border border-border bg-bg/40 px-2 py-2">
              <div className="font-mono text-[9px] uppercase tracking-wide text-textMuted">Ritmo necesario</div>
              <div className="font-sans text-lg font-bold leading-tight text-text">
                {kgPorSemanaNecesario != null ? `${fmt(kgPorSemanaNecesario)}kg` : "—"}
              </div>
              <div className="font-mono text-[9px] text-textMuted">por semana</div>
            </div>
          </div>

          {ritmoRealSemanal != null && (
            <div className="mt-2 flex items-center justify-center gap-1.5 rounded-lg border border-border bg-bg/40 px-2 py-1.5 font-mono text-[11px]">
              <span className="text-textMuted">Esta semana veniste:</span>
              <span className={ritmoRealSemanal > 0 ? "text-sage" : ritmoRealSemanal < 0 ? "text-rust" : "text-textMuted"}>
                {ritmoRealSemanal > 0 ? "+" : ritmoRealSemanal < 0 ? "-" : ""}
                {fmt(ritmoRealSemanal)}kg
              </span>
            </div>
          )}

          <div className={`mt-2 text-center text-[12px] ${colorMensaje}`}>{mensaje}</div>
        </>
      )}
    </Collapsible>
  );
}
