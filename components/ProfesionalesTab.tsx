"use client";

import { useState } from "react";
import { MainTab, Disciplina } from "@/lib/types";
import { useTrainerLink } from "@/lib/useTrainerLink";
import { useMyTrainerComments } from "@/lib/useTrainerComments";
import { LinkLifecycle } from "@/components/LinkLifecycle";
import { btn } from "@/components/buttonStyles";

type HookResult = ReturnType<typeof useTrainerLink>;

const TIPO: Record<Disciplina, { titulo: string; quien: "nutricionista" | "entrenador" }> = {
  nutricion: { titulo: "Tu Nutricionista", quien: "nutricionista" },
  fuerza: { titulo: "Tu Entrenador", quien: "entrenador" },
};

function daysSince(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000)));
}

function ProfessionalCard({
  disciplina,
  hook,
  goalLine,
  statusLine,
  statusAction,
  lastComment,
}: {
  disciplina: Disciplina;
  hook: HookResult;
  goalLine?: string | null;
  statusLine?: string | null;
  statusAction?: { label: string; onClick: () => void };
  lastComment?: { texto: string; createdAt: string; unread: boolean } | null;
}) {
  const [confirmLeave, setConfirmLeave] = useState(false);
  const link = hook.link;
  if (!link) return null;
  const tipo = TIPO[disciplina];
  const dias = daysSince(link.createdAt);
  const locked = Boolean(hook.lockedUntil);

  return (
    <section className="rounded-2xl border border-border bg-surface/70 p-3">
      <LinkLifecycle hook={hook} who={tipo.quien} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">{tipo.titulo}</div>
          <div className="truncate font-display text-lg text-text">{link.trainerEmail}</div>
          <div className="text-[11px] text-textMuted">
            Vinculado hace {dias === 0 ? "menos de un día" : `${dias} día${dias === 1 ? "" : "s"}`}
          </div>
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-1 font-mono text-[9px] font-bold uppercase leading-none tracking-wide"
          style={{ background: "rgb(var(--color-sage))", color: "#0f3d2d" }}
          title="Solo los profesionales aprobados pueden generar códigos de invitación"
        >
          Verificado
        </span>
      </div>

      {goalLine && (
        <div className="mt-2 rounded-lg border border-gold/40 bg-gold/5 px-2.5 py-2">
          <div className="font-mono text-[9px] uppercase tracking-wide text-gold">Lo que fijó para vos</div>
          <div className="text-[13px] text-text">{goalLine}</div>
        </div>
      )}

      {statusLine && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-border bg-bg/40 px-2.5 py-2">
          <span className="text-[12px] text-text">{statusLine}</span>
          {statusAction && (
            <button type="button" onClick={statusAction.onClick} className={`${btn("secondary", "sm")} shrink-0`}>
              {statusAction.label}
            </button>
          )}
        </div>
      )}

      {lastComment && (
        <div className="mt-2 rounded-lg border border-border bg-bg/40 px-2.5 py-2">
          <div className="flex items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-wide text-textMuted">
            <span>Último comentario</span>
            <span>
              {lastComment.unread ? <b className="text-gold">nuevo · </b> : null}
              {new Date(lastComment.createdAt).toLocaleDateString("es-AR", { day: "numeric", month: "numeric" })}
            </span>
          </div>
          <div className="mt-0.5 text-[12px] text-text">{lastComment.texto}</div>
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={hook.openMonthlyFeedback} className={btn("secondary", "sm", true)}>
          Calificar
        </button>
        {!confirmLeave ? (
          <button
            type="button"
            disabled={hook.busy || locked}
            onClick={() => setConfirmLeave(true)}
            title={locked ? "Cambiaste de profesional hace poco" : undefined}
            className={btn("danger", "sm", true)}
          >
            Desvincularme
          </button>
        ) : (
          <div />
        )}
      </div>

      {confirmLeave && (
        <div className="mt-2 rounded-xl border border-rust/50 bg-rust/10 p-2.5">
          <div className="text-[12px] text-text">
            ¿Seguro? Si después te vinculas a otro profesional, no vas a poder volver a cambiar por 14 días (mismo tipo) o 28 días (otro tipo).
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setConfirmLeave(false)} className={btn("neutral", "sm", true)}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={async () => {
                setConfirmLeave(false);
                await hook.leave();
              }}
              className={btn("dangerSolid", "sm", true)}
            >
              Sí, desvincularme
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * Solapa "Profesionales" (cliente): una tarjeta por profesional vinculado con lo que fijó, cómo viene la semana,
 * su último comentario y las acciones del vínculo (calificar, desvincularme con el aviso de espera). Con cupo
 * libre suma la tarjeta para vincularse con un código. Aparece solo si hay al menos un profesional vinculado.
 */
export function ProfesionalesTab({
  authenticated,
  hasFreeSlot,
  nutritionGoalLine,
  trainingGoalLine,
  nutritionStatus,
  onGoToTab,
}: {
  authenticated: boolean;
  hasFreeSlot: boolean;
  nutritionGoalLine: string | null;
  trainingGoalLine: string | null;
  nutritionStatus: string | null;
  onGoToTab: (tab: MainTab) => void;
}) {
  const nutri = useTrainerLink(authenticated, "nutricion");
  const fuerza = useTrainerLink(authenticated, "fuerza");
  const comments = useMyTrainerComments(authenticated, Boolean(nutri.link || fuerza.link));
  const [code, setCode] = useState("");

  const lastFor = (trainerId?: string) => {
    const mine = comments.comments.filter((c) => c.trainerId === trainerId);
    const c = mine[0];
    return c ? { texto: c.texto, createdAt: c.createdAt, unread: !c.readAt } : null;
  };

  const pending = [nutri.myRequest, fuerza.myRequest].find((r) => r && r.status === "pendiente") ?? null;

  return (
    <div className="space-y-4">
      {nutri.link && (
        <ProfessionalCard
          disciplina="nutricion"
          hook={nutri}
          goalLine={nutritionGoalLine}
          statusLine={nutritionStatus}
          statusAction={{ label: "Ir a Comidas", onClick: () => onGoToTab("comidas") }}
          lastComment={lastFor(nutri.link.trainerId)}
        />
      )}
      {fuerza.link && (
        <ProfessionalCard
          disciplina="fuerza"
          hook={fuerza}
          goalLine={trainingGoalLine}
          statusAction={{ label: "Ir a Entreno", onClick: () => onGoToTab("actividad") }}
          statusLine={trainingGoalLine ? "Tu plan de la semana está en Entreno." : null}
          lastComment={lastFor(fuerza.link.trainerId)}
        />
      )}

      {hasFreeSlot && (
        <section className="rounded-2xl border border-dashed border-border bg-surface/40 p-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Vincularme a un profesional</div>
          <div className="mt-1 text-[12px] text-textMuted">
            Tenés un cupo libre en tu plan. Pedile el código a tu Entrenador o Nutricionista.
          </div>
          {pending ? (
            <div className="mt-2 rounded-lg border border-gold/40 bg-gold/5 px-2.5 py-2 text-[12px] text-text">
              Solicitud enviada a <b>{pending.trainerEmail}</b>: esperando que la acepte.
            </div>
          ) : (
            <div className="mt-2 flex gap-2">
              <input type="text" placeholder="Código" value={code} onChange={(event) => setCode(event.target.value)} className="min-w-0 flex-1" />
              <button
                type="button"
                disabled={fuerza.busy || !code.trim()}
                onClick={async () => {
                  await fuerza.join(code);
                  await Promise.all([nutri.refetch(), fuerza.refetch()]);
                  setCode("");
                }}
                className={`${btn("primary", "md")} shrink-0`}
              >
                Enviar solicitud
              </button>
            </div>
          )}
          {(fuerza.status || nutri.status) && /[Cc]ódigo|plan|Premium|vincul/.test(fuerza.status + nutri.status) && !/Te desvinculaste/.test(fuerza.status + nutri.status) && (
            <div className="mt-1.5 text-[11px] text-rust">{fuerza.status || nutri.status}</div>
          )}
        </section>
      )}
    </div>
  );
}
