"use client";

import { DayEntry } from "@/lib/types";
import { rankDays, proteinQualityTier, ProteinQualityTier } from "@/lib/calculations";
import { Collapsible } from "@/components/Collapsible";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const fmtDay = (fecha: string) => {
  const d = new Date(`${fecha}T00:00:00`);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

const TIER_STYLE: Record<ProteinQualityTier, { label: string; color: string; dot: string; panel: string }> = {
  bueno: { label: "bueno", color: "text-sage", dot: "bg-sage", panel: "border-l-sage/70" },
  medio: { label: "medio", color: "text-gold", dot: "bg-gold", panel: "border-l-gold/70" },
  malo: { label: "malo", color: "text-rust", dot: "bg-rust", panel: "border-l-rust/70" },
};

export function RankingCard({ days }: { days: DayEntry[] }) {
  const ranked = rankDays(days);
  const buenos = ranked.filter((r) => proteinQualityTier(r.density) === "bueno");
  const paraMejorar = ranked
    .filter((r) => proteinQualityTier(r.density) !== "bueno")
    .sort((a, b) => a.density - b.density);

  return (
    <Collapsible eyebrow="Semana" title="Ranking de días">
      {ranked.length < 2 ? (
        <div className="text-center text-textMuted text-sm py-4">Cargá al menos 2 días para ver el ranking.</div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[9.5px] uppercase tracking-wide text-textMuted">
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-sage" /> ≥2.5 bueno</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-gold" /> 1.5–2.5 medio</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-rust" /> &lt;1.5 a mejorar</span>
          </div>

          <div className="font-mono text-[9px] uppercase tracking-wide text-textMuted mb-1">
            Buenos días (más proteína por caloría)
          </div>
          {buenos.length === 0 ? (
            <div className="py-2 text-[11px] text-textMuted italic">Todavía ningún día llegó a 2.5g/100kcal.</div>
          ) : (
            buenos.map((r) => <RankRow key={r.day.fecha} r={r} />)
          )}

          <div className="font-mono text-[9px] uppercase tracking-wide text-textMuted mt-3 mb-1">
            Días para mejorar
          </div>
          {paraMejorar.length === 0 ? (
            <div className="py-2 text-[11px] text-sage italic">🎉 Todos tus días están en buen nivel.</div>
          ) : (
            paraMejorar.map((r) => <RankRow key={r.day.fecha} r={r} />)
          )}

          <div className="mt-3 rounded-lg border border-gold/30 bg-gold/10 p-2.5 text-[11px] text-textMuted">
            <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.14em] text-gold">Cómo subir la densidad</div>
            Sumá una porción de proteína magra (pollo, pescado, claras de huevo, yogur o queso fresco) en las
            comidas con más calorías "vacías" (harinas, frituras, salsas con azúcar). El objetivo es superar
            2.5g de proteína cada 100 kcal en cada comida, no solo en el total del día.
          </div>

          <div className="text-[11px] text-textMuted italic mt-3">
            Puntaje = gramos de proteína cada 100 kcal del día. Más alto = comiste más proteína en relación a las
            calorías totales.
          </div>
        </>
      )}
    </Collapsible>
  );
}

function RankRow({ r }: { r: ReturnType<typeof rankDays>[number] }) {
  const tier = proteinQualityTier(r.density);
  const tierColor = TIER_STYLE[tier].color;

  const reason =
    tier === "bueno"
      ? r.bestMeal
        ? `Mucha proteína por caloría en ${r.bestMeal.label} (${r.bestMeal.density.toFixed(1)}g/100kcal)`
        : ""
      : r.worstMeal
      ? `${r.worstMeal.label.charAt(0).toUpperCase() + r.worstMeal.label.slice(1)} aportó pocas kcal de proteína (${(
          r.worstMeal.density ?? 0
        ).toFixed(1)}g/100kcal)`
      : "";

  const segments = [
    { key: "des", label: "Desayuno", kcal: r.day.desK, protein: r.day.desP },
    { key: "alm", label: "Almuerzo", kcal: r.day.almK, protein: r.day.almP },
    { key: "mer", label: "Merienda", kcal: r.day.merK, protein: r.day.merP },
    { key: "cen", label: "Cena", kcal: r.day.cenK, protein: r.day.cenP },
  ];

  const weakSegment = segments
    .filter((s) => s.kcal > 0)
    .sort((a, b) => (a.protein * 100) / Math.max(a.kcal, 1) - (b.protein * 100) / Math.max(b.kcal, 1))[0];

  const improvementText =
    tier === "bueno"
      ? "Buen equilibrio general. Mantené esta estructura de comidas."
      : weakSegment
      ? `Mejorá ${weakSegment.label.toLowerCase()} con más proteína y menos calorías vacías.`
      : "Muy buen balance general. Mantené la consistencia en la estructura diaria.";

  return (
    <div className="group relative">
      <div className="flex justify-between items-center py-2.5 border-b border-dashed border-border last:border-0 gap-2.5">
        <div className="flex-1">
          <div className="font-semibold text-[13px]">
            {fmtDay(r.day.fecha)} · {r.total.toLocaleString("es-AR")} kcal · {r.protein.toLocaleString("es-AR")}g
          </div>
          <div className="text-[11px] text-textMuted mt-0.5">{reason}</div>
        </div>
        <div className={`font-mono text-sm font-semibold ${tierColor}`}>
          {r.density.toFixed(1)}
        </div>
      </div>

      <div className="pointer-events-none absolute left-0 top-full z-20 mt-1 w-[260px] max-w-[80vw] rounded-xl border border-border bg-surface p-2.5 text-left shadow-2xl opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-gold mb-2">Detalle del día</div>
        <div className="space-y-1.5">
          {segments.map((segment) => {
            const density = segment.kcal > 0 ? (segment.protein * 100) / segment.kcal : 0;
            const segmentTier = segment.kcal > 0 ? proteinQualityTier(density) : null;
            const style = segmentTier
              ? TIER_STYLE[segmentTier]
              : { label: "sin datos", color: "text-textMuted", dot: "bg-textMuted", panel: "border-l-border" };
            return (
              <div key={segment.key} className={`flex items-center justify-between gap-2 border-l-2 pl-2 text-[11px] text-textMuted ${style.panel}`}>
                <span className={`flex items-center gap-1.5 font-semibold ${style.color}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                  {segment.label}
                </span>
                <span className="font-mono text-text">
                  {segment.kcal} kcal · {segment.protein}g · {density.toFixed(1)}g/100kcal · {style.label}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-2 border-t border-dashed border-border pt-2 text-[11px] text-textMuted">
          <span className="text-text">Cómo mejorar:</span> {improvementText}
        </div>
      </div>
    </div>
  );
}
