import { GoalMode, MuscleGroup, MUSCLE_GROUP_LABELS } from "@/lib/types";
import { Collapsible } from "@/components/Collapsible";

const GROUPS: MuscleGroup[] = ["pecho", "espalda", "hombros", "piernas", "brazos", "core"];

function pctDelta(actual: number, anterior: number): number | null {
  if (anterior <= 0) return null;
  return Math.round(((actual - anterior) / anterior) * 100);
}

/** Mensaje motivacional distinto según el objetivo: en volumen/aumentar lo
 * ideal es subir semana a semana (sobrecarga progresiva); en déficit/perder
 * alcanza con SOSTENER el volumen (una caída grande ahí es señal de estar
 * perdiendo músculo, no solo grasa); en recomposición un término medio. */
function volumeMessage(modo: GoalMode | undefined, deltaPct: number | null): { texto: string; color: string } {
  if (deltaPct == null) return { texto: "Todavía no hay una semana anterior para comparar.", color: "text-textMuted" };

  if (modo === "aumentar") {
    if (deltaPct >= 5) return { texto: `Subiste ${deltaPct}% el volumen — así se construye masa. Seguí así.`, color: "text-sage" };
    if (deltaPct >= -5) return { texto: "Volumen estable. Para seguir sumando masa, probá subir un poco el peso o las series.", color: "text-gold" };
    return { texto: `Bajaste ${Math.abs(deltaPct)}% el volumen — para ganar masa necesitás sostener o subir el estímulo.`, color: "text-rust" };
  }

  if (modo === "perder") {
    if (deltaPct >= -5) return { texto: "Sostenés el volumen a pesar del déficit — así se cuida el músculo mientras baja el peso.", color: "text-sage" };
    if (deltaPct >= -15) return { texto: `El volumen bajó ${Math.abs(deltaPct)}% — algo esperable en déficit, pero no dejes que siga cayendo.`, color: "text-gold" };
    return { texto: `El volumen cayó ${Math.abs(deltaPct)}% — con tanto déficit se puede estar perdiendo músculo, no solo grasa.`, color: "text-rust" };
  }

  // recomponer (o sin modo): término medio, sin urgencia de subir ni bajar.
  if (deltaPct >= -10 && deltaPct <= 15) return { texto: "Volumen parejo semana a semana — buen ritmo para recomponer.", color: "text-sage" };
  if (deltaPct > 15) return { texto: `Subiste ${deltaPct}% el volumen — de a poco, sin apurar el peso.`, color: "text-gold" };
  return { texto: `El volumen bajó ${Math.abs(deltaPct)}% respecto a la semana pasada.`, color: "text-gold" };
}

export function MuscleGroupVolume({
  trend,
  modo,
  openOnDesktop,
}: {
  trend: Record<MuscleGroup, { actual: number; anterior: number }>;
  modo?: GoalMode;
  openOnDesktop?: boolean;
}) {
  const totalActual = GROUPS.reduce((a, g) => a + trend[g].actual, 0);
  const totalAnterior = GROUPS.reduce((a, g) => a + trend[g].anterior, 0);
  const totalDelta = pctDelta(totalActual, totalAnterior);
  const { texto, color } = volumeMessage(modo, totalDelta);
  const maxVolume = Math.max(1, ...GROUPS.map((g) => Math.max(trend[g].actual, trend[g].anterior)));

  if (totalActual === 0 && totalAnterior === 0) {
    return (
      <Collapsible eyebrow="Semana" title="Volumen por grupo muscular" openOnDesktop={openOnDesktop}>
        <div className="rounded-xl border border-dashed border-border p-3 text-[12px] text-textMuted">
          Todavía no hay ejercicios con grupo muscular cargados esta semana. Elegí los ejercicios "desde biblioteca" al armar tu rutina para que esto se complete solo.
        </div>
      </Collapsible>
    );
  }

  return (
    <Collapsible eyebrow="Semana" title="Volumen por grupo muscular" openOnDesktop={openOnDesktop}>
      <div className="mb-3 flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wide text-textMuted">
          Total: {Math.round(totalActual).toLocaleString("es-AR")}kg
          {totalAnterior > 0 && <span className="text-textMuted"> (antes {Math.round(totalAnterior).toLocaleString("es-AR")}kg)</span>}
        </span>
        {totalDelta != null && (
          <span className={`font-mono text-[11px] font-bold ${totalDelta >= 0 ? "text-sage" : "text-rust"}`}>
            {totalDelta > 0 ? "+" : ""}
            {totalDelta}%
          </span>
        )}
      </div>
      <div className={`mb-3 text-center text-[12px] ${color}`}>{texto}</div>

      <div className="space-y-2">
        {GROUPS.map((group) => {
          const { actual, anterior } = trend[group];
          const delta = pctDelta(actual, anterior);
          if (actual === 0 && anterior === 0) {
            return (
              <div key={group} className="flex items-center justify-between gap-2 text-[11px] text-textMuted">
                <span className="font-mono uppercase tracking-wide">{MUSCLE_GROUP_LABELS[group]}</span>
                <span>sin entrenar</span>
              </div>
            );
          }
          return (
            <div key={group}>
              <div className="mb-0.5 flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wide text-textMuted">{MUSCLE_GROUP_LABELS[group]}</span>
                <span className="font-mono text-[10px] text-text">
                  {Math.round(actual).toLocaleString("es-AR")}kg
                  {delta != null && (
                    <span className={delta >= 0 ? "text-sage" : "text-rust"}> {delta > 0 ? "+" : ""}{delta}%</span>
                  )}
                </span>
              </div>
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-bg">
                {anterior > 0 && (
                  <div className="absolute inset-y-0 left-0 rounded-full bg-border" style={{ width: `${(anterior / maxVolume) * 100}%` }} />
                )}
                <div
                  className={`absolute inset-y-0 left-0 rounded-full ${delta != null && delta < 0 ? "bg-rust" : "bg-sage"}`}
                  style={{ width: `${(actual / maxVolume) * 100}%`, opacity: 0.85 }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Collapsible>
  );
}
