"use client";

import { useState } from "react";
import { Objective } from "@/lib/types";
import { ObjectiveProgress, objectivePoints } from "@/lib/objectiveProgress";
import { btn } from "@/components/buttonStyles";

export interface ObjectiveWithProgress {
  objective: Objective;
  progress: ObjectiveProgress;
}

const TIPO_LABEL: Record<string, string> = { nutricion: "Nutricionista", fuerza: "Entrenador" };

function ManualCheck({ item, onCheck, todayFecha }: { item: ObjectiveWithProgress; onCheck: (id: string, fecha: string, cumplido: boolean, valor?: number) => void; todayFecha: string }) {
  const { objective: o, progress } = item;
  const [valor, setValor] = useState("");
  if (o.tipo === "agua") {
    return (
      <div className="mt-2 flex items-center gap-2">
        <input type="number" inputMode="decimal" value={valor} onChange={(event) => setValor(event.target.value)} placeholder={`Hoy (${o.unidad})`} className="min-w-0 flex-1 text-[13px]" />
        <button
          type="button"
          disabled={!valor}
          onClick={() => {
            onCheck(o.id, todayFecha, Number(valor.replace(",", ".")) >= o.meta, Number(valor.replace(",", ".")));
            setValor("");
          }}
          className={`${btn("secondary", "sm")} shrink-0`}
        >
          Guardar hoy
        </button>
      </div>
    );
  }
  return (
    <div className="mt-2 grid grid-cols-2 gap-2">
      <button type="button" onClick={() => onCheck(o.id, todayFecha, true)} className={btn(progress.todayMet === true ? "success" : "neutral", "sm", true)}>
        ✓ Hoy lo cumplí
      </button>
      <button type="button" onClick={() => onCheck(o.id, todayFecha, false)} className={btn(progress.todayMet === false ? "danger" : "neutral", "sm", true)}>
        Hoy no
      </button>
    </div>
  );
}

/**
 * Lado CLIENTE: los objetivos medibles que fijaron sus profesionales, con el progreso que la app calcula sola.
 * Los logrados quedan arriba con el mensaje del profesional (si lo dejó).
 */
export function MyObjectivesCard({
  items,
  onCheck,
  todayFecha,
  totalPoints = 0,
  pointsByObjective = {},
}: {
  items: ObjectiveWithProgress[];
  onCheck: (objectiveId: string, fecha: string, cumplido: boolean, valor?: number) => void;
  todayFecha: string;
  /** Puntos acumulados por objetivos logrados. */
  totalPoints?: number;
  pointsByObjective?: Record<string, number>;
}) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const achieved = items.filter((i) => i.objective.estado === "logrado" && !dismissed.has(i.objective.id));
  const active = items.filter((i) => i.objective.estado === "activo");
  if (achieved.length === 0 && active.length === 0) return null;

  return (
    <div className="space-y-3">
      {achieved.map(({ objective: o }) => (
        <section key={o.id} className="rounded-2xl border border-sage/50 bg-sage/10 p-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-sage">Objetivo cumplido</div>
          <div className="font-display text-lg text-text">¡Lo lograste! {o.nombre}</div>
          <div className="mt-1 text-[12px] text-textMuted">
            <b className="text-sage">+{pointsByObjective[o.id] || objectivePoints(o)} puntos · </b>
            Tu {TIPO_LABEL[o.disciplina] ?? "profesional"} ya fue avisado.
            {o.logradoAt ? ` (${new Date(o.logradoAt).toLocaleDateString("es-AR", { day: "numeric", month: "numeric" })})` : ""}
          </div>
          {o.mensajeLogro ? (
            <div className="mt-2 rounded-lg border border-sage/40 bg-bg/40 px-2.5 py-2">
              <div className="font-mono text-[9px] uppercase tracking-wide text-sage">Mensaje de tu {TIPO_LABEL[o.disciplina]?.toLowerCase() ?? "profesional"}</div>
              <div className="text-[13px] text-text">{o.mensajeLogro}</div>
            </div>
          ) : (
            <div className="mt-2 text-[12px] text-text">Pronto vas a poder ver su mensaje y el próximo objetivo que te proponga.</div>
          )}
          <button type="button" onClick={() => setDismissed((prev) => new Set(prev).add(o.id))} className={`${btn("neutral", "sm")} mt-2`}>
            Cerrar
          </button>
        </section>
      ))}

      {active.length > 0 && (
        <section className="rounded-2xl border border-border bg-surface/70 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Objetivos de tus profesionales</div>
            <span className="shrink-0 rounded-full border border-gold/40 bg-gold/10 px-2 py-1 font-mono text-[10px] font-bold text-gold">⭐ {totalPoints} puntos</span>
          </div>
          <div className="mt-2 space-y-2.5">
            {active.map((item) => {
              const { objective: o, progress } = item;
              return (
                <div key={o.id} className="rounded-xl border border-border bg-bg/30 p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-text">{o.nombre}</div>
                      <div className="font-mono text-[9px] uppercase tracking-wide text-textMuted">
                        {TIPO_LABEL[o.disciplina] ?? ""} · vale {objectivePoints(o)} puntos
                      </div>
                    </div>
                    <span className="shrink-0 font-sans text-lg font-bold text-text">{progress.percent}%</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surfaceAlt">
                    <div className="h-full bg-gold" style={{ width: `${progress.percent}%` }} />
                  </div>
                  <div className="mt-1.5 text-[12px] text-text">{progress.headline}</div>
                  {progress.sub && <div className="text-[11px] text-textMuted">{progress.sub}</div>}
                  {progress.todayMet === true && <div className="text-[11px] text-sage">✓ Hoy ya lo cumpliste</div>}
                  {progress.manual && <ManualCheck item={item} onCheck={onCheck} todayFecha={todayFecha} />}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
