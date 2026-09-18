import { FoodTrainingInsight } from "@/lib/calculations";
import { Collapsible } from "@/components/Collapsible";
import { SECTION_HELP } from "@/lib/helpText";

export function FoodTrainingInsights({ insight, openOnDesktop }: { insight: FoodTrainingInsight; openOnDesktop?: boolean }) {
  if (!insight.unlocked) {
    const faltan = insight.weeksNeeded - insight.weeksLoaded;
    return (
      <Collapsible eyebrow="Alto impacto" title="🔒 Comida vs. entrenamiento" info={SECTION_HELP.cruceComidaEntreno} openOnDesktop={openOnDesktop}>
        <div className="rounded-lg border border-dashed border-gold/40 bg-gold/5 p-3 text-[12px] text-textMuted">
          Se desbloquea con {insight.weeksNeeded} semanas de peso cargado — llevás {insight.weeksLoaded}. Te{" "}
          {faltan === 1 ? "falta 1 semana más" : `faltan ${faltan} semanas más`}.
        </div>
      </Collapsible>
    );
  }

  const { avgProteinTrained, avgProteinRest, avgKcalTrained, avgKcalRest, trainedDaysCount, restDaysCount } = insight;
  const proteinDelta = avgProteinTrained != null && avgProteinRest != null ? avgProteinTrained - avgProteinRest : null;

  let mensaje = "Todavía no hay suficientes días de ambos tipos para comparar.";
  let color = "text-textMuted";
  if (proteinDelta != null) {
    if (proteinDelta >= 10) {
      mensaje = "Comés notablemente más proteína los días que entrenás — bien encaminado.";
      color = "text-sage";
    } else if (proteinDelta <= -10) {
      mensaje = "Comés menos proteína los días que entrenás que los de descanso — al revés de lo ideal.";
      color = "text-rust";
    } else {
      mensaje = "Comés parecido los días de entreno y de descanso — sin una diferencia marcada.";
    }
  }

  return (
    <Collapsible eyebrow="Alto impacto" title="Comida vs. entrenamiento" info={SECTION_HELP.cruceComidaEntreno} openOnDesktop={openOnDesktop}>
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg border border-border bg-bg/40 px-2 py-2">
          <div className="font-mono text-[9px] uppercase tracking-wide text-textMuted">Proteína · días de entreno</div>
          <div className="font-sans text-lg font-bold leading-tight text-text">{avgProteinTrained ?? "—"}g</div>
          <div className="font-mono text-[9px] text-textMuted">{trainedDaysCount} días</div>
        </div>
        <div className="rounded-lg border border-border bg-bg/40 px-2 py-2">
          <div className="font-mono text-[9px] uppercase tracking-wide text-textMuted">Proteína · días de descanso</div>
          <div className="font-sans text-lg font-bold leading-tight text-text">{avgProteinRest ?? "—"}g</div>
          <div className="font-mono text-[9px] text-textMuted">{restDaysCount} días</div>
        </div>
        <div className="rounded-lg border border-border bg-bg/40 px-2 py-2">
          <div className="font-mono text-[9px] uppercase tracking-wide text-textMuted">Kcal · días de entreno</div>
          <div className="font-sans text-lg font-bold leading-tight text-text">{avgKcalTrained ?? "—"}</div>
        </div>
        <div className="rounded-lg border border-border bg-bg/40 px-2 py-2">
          <div className="font-mono text-[9px] uppercase tracking-wide text-textMuted">Kcal · días de descanso</div>
          <div className="font-sans text-lg font-bold leading-tight text-text">{avgKcalRest ?? "—"}</div>
        </div>
      </div>
      <div className={`mt-2 text-center text-[12px] ${color}`}>{mensaje}</div>
    </Collapsible>
  );
}
