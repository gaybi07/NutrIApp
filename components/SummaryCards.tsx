import { WeekSummary } from "@/lib/calculations";
import { Collapsible } from "@/components/Collapsible";
import { SECTION_HELP } from "@/lib/helpText";

export function SummaryCards({ summary, goal, weight }: { summary: WeekSummary; goal: number; weight?: number }) {
  const cards = [
    {
      label: "Energía consumida",
      value: summary.totalDays ? summary.avgKcal.toLocaleString("es-AR") : "–",
      color: summary.avgKcal > goal ? "text-rust" : "text-text",
      sub: `prom. kcal/día · objetivo prom. ${goal.toLocaleString("es-AR")}`,
      tone: "gold",
    },
    {
      label: "Objetivo promedio",
      value: summary.totalDays ? summary.avgGoal.toLocaleString("es-AR") : goal.toLocaleString("es-AR"),
      color: "text-gold",
      sub: "consumo diario para tu objetivo",
      tone: "gold",
    },
    {
      label: "Peso semanal",
      value: weight ? `${weight.toFixed(1)} kg` : "–",
      color: weight ? "text-sage" : "text-textMuted",
      sub: weight ? "último registro" : "pendiente de cargar",
      tone: "sage",
    },
    {
      label: "Proteína consumida",
      value: summary.totalDays ? summary.avgProt.toLocaleString("es-AR") : "–",
      color: "text-gold",
      sub: "prom. gramos/día",
      tone: "gold",
    },
    {
      label: "Gasto estimado",
      value: summary.totalDays ? summary.avgGasto.toLocaleString("es-AR") : "–",
      color: "text-text",
      sub: "prom. kcal/día",
      tone: "neutral",
    },
    {
      label: "Pasos promedio",
      value: summary.totalDays ? summary.avgSteps.toLocaleString("es-AR") : "–",
      color: "text-text",
      sub: `${summary.trainedDays}/${summary.totalDays} entrenos`,
      tone: "neutral",
    },
  ] as const;

  const deficitCards = [
    {
      label: "Déficit promedio",
      value: summary.totalDays ? summary.avgDeficit.toLocaleString("es-AR") : "–",
      color: summary.avgDeficit >= 0 ? "text-sage" : "text-rust",
      sub: `prom. por día · ${summary.totalDays} días`,
      tone: summary.avgDeficit >= 0 ? "sage" : "rust",
    },
    {
      label: "Déficit acumulado",
      value: summary.totalDays ? summary.deficitAcumulado.toLocaleString("es-AR") : "–",
      color: summary.deficitAcumulado >= 0 ? "text-sage" : "text-rust",
      sub: `suma de ${summary.totalDays} días`,
      tone: summary.deficitAcumulado >= 0 ? "sage" : "rust",
    },
  ] as const;

  const toneClasses = {
    gold: "border-gold/30 bg-[linear-gradient(180deg,rgba(201,162,39,0.12),rgba(36,34,32,0.96))]",
    sage: "border-sage/30 bg-[linear-gradient(180deg,rgba(138,154,124,0.12),rgba(36,34,32,0.96))]",
    rust: "border-rust/30 bg-[linear-gradient(180deg,rgba(181,83,60,0.12),rgba(36,34,32,0.96))]",
    neutral: "border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(36,34,32,0.96))]",
  } as const;

  const renderCard = (card: { label: string; value: string; color: string; sub: string; tone: keyof typeof toneClasses }) => (
    <div
      key={card.label}
      className={`relative overflow-hidden rounded-2xl border p-3 shadow-[0_0_0_1px_rgba(58,54,47,0.5)] ${toneClasses[card.tone]}`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/80 to-transparent" />
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-textMuted mb-2">{card.label}</div>
      <div className={`font-display text-[1.9rem] leading-none font-semibold ${card.color}`}>{card.value}</div>
      <div className="text-[11px] text-textMuted mt-1.5">{card.sub}</div>
    </div>
  );

  return (
    <Collapsible eyebrow="Semana" title="Indicadores" info={SECTION_HELP.semana} scrollable={false}>
      <div className="grid grid-cols-2 gap-2.5">
        {cards.map((card) => renderCard(card))}
        <div className="col-span-2 grid grid-cols-2 gap-2.5">
          {deficitCards.map((card) => renderCard(card))}
        </div>
      </div>
    </Collapsible>
  );
}
