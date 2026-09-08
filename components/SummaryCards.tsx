import { WeekSummary } from "@/lib/calculations";

export function SummaryCards({ summary, goal }: { summary: WeekSummary; goal: number }) {
  const cards = [
    {
      label: "Prom. kcal/día",
      value: summary.totalDays ? summary.avgKcal.toLocaleString("es-AR") : "–",
      color: summary.avgKcal > goal ? "text-rust" : "text-text",
      sub: `objetivo ${goal.toLocaleString("es-AR")}`,
    },
    {
      label: "Prom. proteína/día",
      value: summary.totalDays ? summary.avgProt.toLocaleString("es-AR") : "–",
      color: "text-gold",
      sub: "gramos",
    },
    {
      label: "Gasto estim. prom.",
      value: summary.totalDays ? summary.avgGasto.toLocaleString("es-AR") : "–",
      color: "text-text",
      sub: "kcal/día (pasos+entreno)",
    },
    {
      label: "Prom. pasos",
      value: summary.totalDays ? summary.avgSteps.toLocaleString("es-AR") : "–",
      color: "text-text",
      sub: `${summary.trainedDays}/${summary.totalDays} días entrenados`,
    },
    {
      label: "Déficit acum. (semana)",
      value: summary.totalDays ? summary.deficitAcumulado.toLocaleString("es-AR") : "–",
      color: summary.deficitAcumulado >= 0 ? "text-sage" : "text-rust",
      sub: `suma de ${summary.totalDays} día(s)`,
      span: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 mb-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`bg-surface border border-border rounded-xl p-3 ${c.span ? "col-span-2" : ""}`}
        >
          <div className="font-mono text-[10px] uppercase tracking-wide text-textMuted mb-1">{c.label}</div>
          <div className={`font-display text-2xl font-semibold ${c.color}`}>{c.value}</div>
          <div className="text-[11px] text-textMuted mt-0.5">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}
