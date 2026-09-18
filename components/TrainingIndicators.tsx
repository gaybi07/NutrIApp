import { Routine, WorkoutSuggestion } from "@/lib/types";
import { Collapsible } from "@/components/Collapsible";
import { SECTION_HELP } from "@/lib/helpText";

function timeAgo(generatedAt: number): string {
  const days = Math.floor((Date.now() - generatedAt) / 86400000);
  if (days <= 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;
  const weeks = Math.floor(days / 7);
  return `hace ${weeks} semana${weeks === 1 ? "" : "s"}`;
}

/**
 * Resumen de "qué tan bien viene cada ejercicio de tu plan" -- junta las
 * sugerencias que ya se generan solas al cerrar un entrenamiento en vivo
 * (ver LiveWorkout/suggestNextSession) en una sola vista por rutina, en vez
 * de que solo se vean una por una la próxima vez que arranca esa rutina.
 */
export function TrainingIndicators({ routines, workoutSuggestions }: { routines: Routine[]; workoutSuggestions: Record<string, WorkoutSuggestion> }) {
  const routinesWithData = routines
    .map((routine) => ({
      routine,
      rows: routine.ejercicios
        .map((ex) => {
          const suggestion = workoutSuggestions[`${routine.id}::${ex.nombre}`];
          if (!suggestion) return null;
          const delta =
            suggestion.pesoSugerido != null && ex.peso != null ? Math.round((suggestion.pesoSugerido - ex.peso) * 10) / 10 : null;
          return { nombre: ex.nombre, pesoPlan: ex.peso, suggestion, delta };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null),
    }))
    .filter((r) => r.rows.length > 0);

  return (
    <Collapsible eyebrow="Fuerza" title="Indicadores de entrenamiento" info={SECTION_HELP.indicadoresEntreno}>
      {routinesWithData.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-3 text-[12px] text-textMuted">
          Todavía no hay datos — entrená una rutina en vivo (con peso/sensación cargados por serie) para empezar a ver acá qué tan
          bien te viene cada ejercicio y cuánto más o menos podés cargar.
        </div>
      ) : (
        <div className="space-y-3">
          {routinesWithData.map(({ routine, rows }) => (
            <div key={routine.id}>
              <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-gold">{routine.nombre}</div>
              <div className="space-y-1.5">
                {rows.map((row) => (
                  <div key={row.nombre} className="rounded-lg border border-border bg-bg/40 px-2.5 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-semibold text-text">{row.nombre}</span>
                      <span className="shrink-0 font-mono text-[9px] uppercase tracking-wide text-textMuted">
                        {timeAgo(row.suggestion.generatedAt)}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-textMuted">{row.suggestion.nota}</div>
                    {row.delta != null && row.delta !== 0 && (
                      <div className={`mt-1 font-mono text-[11px] ${row.delta > 0 ? "text-sage" : "text-rust"}`}>
                        {row.pesoPlan}kg planificado → {row.suggestion.pesoSugerido}kg sugerido ({row.delta > 0 ? "+" : ""}
                        {row.delta}kg)
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Collapsible>
  );
}
