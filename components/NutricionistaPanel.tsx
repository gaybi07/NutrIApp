"use client";

import { useRef, useState } from "react";
import { useTrainerApplication, useTrainerAdmin } from "@/lib/useTrainerApplication";
import { useTrainerLink, useTrainerStudents } from "@/lib/useTrainerLink";
import { TrainerLinkRequest, TrainerStatus, TrainerStudent } from "@/lib/types";
import { NutritionPlanBuilder } from "@/components/NutritionPlanBuilder";
import { AdminRow } from "@/components/TrainerPanel";

const STATUS_STYLE: Record<TrainerStatus, { label: string; color: string }> = {
  pendiente: { label: "Pendiente de revisión", color: "text-gold" },
  aprobado: { label: "Aprobado ✓", color: "text-sage" },
  rechazado: { label: "Rechazado", color: "text-rust" },
};

function StatTile({ value, label, color }: { value: number | string; label: string; color: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-2.5 text-center">
      <div className={`font-mono text-xl font-bold ${color}`}>{value}</div>
      <div className="font-mono text-[8px] uppercase tracking-wide text-textMuted">{label}</div>
    </div>
  );
}

function PendingRequestRow({
  request,
  busy,
  onRespond,
}: {
  request: TrainerLinkRequest;
  busy: boolean;
  onRespond: (decision: "aceptada" | "rechazada", note: string) => void;
}) {
  const [note, setNote] = useState("");
  return (
    <div className="rounded-lg border border-gold/40 bg-gold/5 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-text">{request.studentEmail}</span>
        <span className="font-mono text-[10px] text-gold">Quiere vincularse</span>
      </div>
      <input
        type="text"
        placeholder="Nota opcional (ej: motivo del rechazo)"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        className="mb-1.5 mt-2 w-full"
      />
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          disabled={busy}
          onClick={() => onRespond("rechazada", note)}
          className="rounded-lg border border-rust/50 px-2 py-1.5 font-mono text-[10px] uppercase tracking-wide text-rust disabled:opacity-50"
        >
          Rechazar
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onRespond("aceptada", note)}
          className="rounded-lg border border-sage/50 bg-sage/10 px-2 py-1.5 font-mono text-[10px] uppercase tracking-wide text-sage disabled:opacity-50"
        >
          Aceptar
        </button>
      </div>
    </div>
  );
}

/** Vos como Paciente de OTRO Nutricionista -- aparte de tus propios
 * pacientes. Sin adopción de plan todavía (eso es la fase siguiente: ver el
 * Plan Nutricional dentro de la carga de comidas) -- por ahora solo el
 * estado del vínculo, igual de útil para probar que el backend anda. */
function OwnPatientLinkSection({ authenticated }: { authenticated: boolean }) {
  const linkHook = useTrainerLink(authenticated, "nutricion");
  const [code, setCode] = useState("");

  return (
    <div>
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Tu nutricionista</div>
      <div className="mb-3 text-[11px] text-textMuted">
        Esto es para cuando VOS sos paciente de otro nutricionista -- no tiene que ver con tus propios pacientes.
      </div>
      {!linkHook.loaded ? (
        <div className="text-[12px] text-textMuted">Cargando...</div>
      ) : linkHook.link ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg/40 px-2.5 py-2">
          <span className="font-mono text-[11px] text-text">{linkHook.link.trainerEmail}</span>
          <button type="button" onClick={linkHook.leave} className="font-mono text-[10px] text-rust">
            Desvincularme
          </button>
        </div>
      ) : linkHook.myRequest?.status === "pendiente" ? (
        <div className="rounded-lg border border-dashed border-gold/50 bg-gold/5 p-3 text-[12px] text-textMuted">
          Solicitud enviada a <span className="font-semibold text-text">{linkHook.myRequest.trainerEmail}</span> —
          esperando que la acepte.
        </div>
      ) : (
        <div>
          {linkHook.myRequest?.status === "rechazada" && (
            <div className="mb-2 rounded-lg border border-rust/40 bg-rust/10 px-2.5 py-2 text-[11px] text-rust">
              Tu nutricionista rechazó tu solicitud{linkHook.myRequest.responseNote ? `: ${linkHook.myRequest.responseNote}` : "."} Podés
              probar con otro código.
            </div>
          )}
          <div className="mb-2 text-[11px] text-textMuted">Pedile el código a tu nutricionista para vincularte.</div>
          <div className="flex gap-2">
            <input type="text" placeholder="Código" value={code} onChange={(event) => setCode(event.target.value)} className="min-w-0 flex-1" />
            <button
              type="button"
              onClick={() => linkHook.join(code)}
              disabled={linkHook.busy || !code.trim()}
              className="shrink-0 rounded-lg border border-gold/60 bg-gold px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-bg disabled:opacity-50"
            >
              Enviar solicitud
            </button>
          </div>
        </div>
      )}
      {linkHook.status && <div className="mt-2 text-center font-mono text-[11px] text-sage">{linkHook.status}</div>}
    </div>
  );
}

type NutriSubtab = "pacientes" | "plan" | "cuenta";
const NUTRI_SUBTABS: { id: NutriSubtab; label: string }[] = [
  { id: "pacientes", label: "Pacientes" },
  { id: "plan", label: "Plan" },
  { id: "cuenta", label: "Cuenta" },
];

function NutricionistaPatientsAndPlan({
  authenticated,
  maxStudents,
  accountTab,
}: {
  authenticated: boolean;
  maxStudents: number;
  accountTab: React.ReactNode;
}) {
  const studentsHook = useTrainerStudents(authenticated, true, "nutricion");
  const [subtab, setSubtab] = useState<NutriSubtab>("pacientes");
  const [planFor, setPlanFor] = useState<TrainerStudent | null>(null);

  const copyInviteCode = async () => {
    if (!studentsHook.inviteCode) return;
    try {
      await navigator.clipboard.writeText(studentsHook.inviteCode);
    } catch {
      // si el portapapeles no está disponible, el código ya está visible en pantalla
    }
  };

  return (
    <div className="mt-5 border-t border-border pt-3">
      <div className="mb-3 grid grid-cols-2 gap-1.5">
        <StatTile value={`${studentsHook.students.length}/${maxStudents}`} label="Pacientes" color="text-gold" />
        <StatTile value={studentsHook.pendingRequests.length} label="Solicitudes" color={studentsHook.pendingRequests.length > 0 ? "text-gold" : "text-textMuted"} />
      </div>
      {studentsHook.pendingRequests.length > 0 && (
        <div className="mb-3 rounded-lg border border-gold/40 bg-gold/5 p-2.5">
          <div className="mb-1.5 font-mono text-[9px] uppercase tracking-wide text-gold">Necesita tu atención</div>
          <button
            type="button"
            onClick={() => setSubtab("pacientes")}
            className="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-bg/40 px-2 py-1.5 text-left text-[11px] text-text"
          >
            <span>
              {studentsHook.pendingRequests.length} solicitud{studentsHook.pendingRequests.length === 1 ? "" : "es"} pendiente
              {studentsHook.pendingRequests.length === 1 ? "" : "s"}
            </span>
            <span className="font-mono text-[10px] text-gold">Revisar ›</span>
          </button>
        </div>
      )}

      <div className="mb-3 flex gap-1 border-b border-border">
        {NUTRI_SUBTABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubtab(t.id)}
            className={`flex-1 border-b-2 px-1 py-2 font-mono text-[9px] uppercase tracking-wide transition-colors ${
              subtab === t.id ? "border-gold text-gold" : "border-transparent text-textMuted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subtab === "pacientes" && (
        <div>
          {studentsHook.students.length >= maxStudents && (
            <div className="mb-2 rounded-lg border border-dashed border-gold/40 bg-gold/5 px-2.5 py-2 text-[11px] text-textMuted">
              Llegaste al límite de pacientes de tu plan — subí de nivel para aceptar más.
            </div>
          )}
          {!studentsHook.inviteCode ? (
            <button
              type="button"
              onClick={studentsHook.getInviteCode}
              disabled={studentsHook.busy}
              className="mb-2 w-full rounded-lg border border-gold/60 bg-gold/10 px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-gold disabled:opacity-50"
            >
              Generar código de invitación
            </button>
          ) : (
            <div className="mb-2 rounded-lg border border-gold/40 bg-gold/5 p-3 text-center">
              <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted">
                Compartí este código con tu paciente
              </div>
              <div className="mb-2 font-mono text-2xl tracking-[0.3em] text-gold">{studentsHook.inviteCode}</div>
              <button
                type="button"
                onClick={copyInviteCode}
                className="rounded-lg border border-gold/60 bg-bg/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-text"
              >
                Copiar código
              </button>
            </div>
          )}
          {studentsHook.status && <div className="mb-2 text-[11px] text-rust">{studentsHook.status}</div>}
          {studentsHook.pendingRequests.length > 0 && (
            <div className="mb-3">
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Solicitudes pendientes</div>
              <div className="space-y-1.5">
                {studentsHook.pendingRequests.map((request) => (
                  <PendingRequestRow
                    key={request.id}
                    request={request}
                    busy={studentsHook.busyRequestId === request.id}
                    onRespond={(decision, note) => studentsHook.respond(request.id, decision, note)}
                  />
                ))}
              </div>
            </div>
          )}
          {!studentsHook.loaded ? (
            <div className="text-[12px] text-textMuted">Cargando...</div>
          ) : studentsHook.students.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-3 text-[12px] text-textMuted">Todavía no tenés pacientes vinculados.</div>
          ) : (
            <div className="space-y-1.5">
              {studentsHook.students.map((s) => (
                <div key={s.studentId} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg/40 px-2.5 py-2">
                  <span className="font-mono text-[11px] text-text">{s.studentEmail}</span>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPlanFor(s);
                        setSubtab("plan");
                      }}
                      className="font-mono text-[10px] text-gold"
                    >
                      Armar plan
                    </button>
                    <button type="button" onClick={() => studentsHook.removeStudent(s.studentId)} className="font-mono text-[10px] text-rust">
                      Quitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {subtab === "plan" &&
        (planFor ? (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Plan de {planFor.studentEmail}</span>
              <button type="button" onClick={() => setSubtab("pacientes")} className="font-mono text-[10px] text-textMuted">
                ‹ Volver
              </button>
            </div>
            <NutritionPlanBuilder studentId={planFor.studentId} />
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-3 text-[12px] text-textMuted">
            Elegí un paciente desde la sub-tab "Pacientes" para armarle su plan.
          </div>
        ))}

      {subtab === "cuenta" && accountTab}
    </div>
  );
}

/**
 * Panel del rol Nutricionista -- mismo espíritu que TrainerPanel.tsx (Profe)
 * pero sin Rutinas/Incidencias (exclusivas de fuerza, ticket 02 del mapa
 * apk-completa): sub-tabs Pacientes/Plan/Cuenta en vez de
 * Alumnos/Rutinas/Incidencias/Cuenta.
 */
export function NutricionistaPanel({ authenticated, userEmail }: { authenticated: boolean; userEmail: string | null }) {
  const own = useTrainerApplication(authenticated, userEmail, "nutricion");
  const admin = useTrainerAdmin(authenticated, userEmail);
  const fileRef = useRef<HTMLInputElement>(null);
  const isApproved = own.application?.status === "aprobado";

  // Mismo motivo que el gate equivalente en TrainerPanel.tsx: sin esto, un
  // Nutricionista ya aprobado ve primero la pantalla de "postularme" y
  // recién salta al panel real cuando `own` termina de cargar.
  if (!own.loaded) {
    return <div className="text-[12px] text-textMuted">Cargando...</div>;
  }

  const handlePick = () => fileRef.current?.click();
  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) own.submit(file);
    event.target.value = "";
  };

  const viewOwnCertificate = async () => {
    const url = await own.certificateSignedUrl();
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const viewAdminCertificate = async (path: string) => {
    const url = await admin.signedUrlFor(path);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  // Mismo panel de revisión que TrainerPanel.tsx (única cuenta admin, ver
  // TRAINER_ADMIN_EMAIL), filtrado acá a postulaciones de Nutricionista --
  // buscarlo solo desde Entrenador no era intuitivo si lo que querés
  // aprobar es justamente un Nutricionista.
  const nutricionistaApplications = admin.applications.filter((a) => a.disciplina === "nutricion");
  const adminReview = admin.isAdmin && (
    <div className="mt-5 border-t border-border pt-3">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Revisión (admin)</div>
      {!admin.loaded ? (
        <div className="text-[12px] text-textMuted">Cargando...</div>
      ) : nutricionistaApplications.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-3 text-[12px] text-textMuted">
          No hay postulaciones de Nutricionista todavía.
        </div>
      ) : (
        <div className="space-y-2">
          {nutricionistaApplications.map((app) => (
            <AdminRow
              key={app.id}
              app={app}
              busy={admin.busyId === app.id}
              onReview={(decision, note) => admin.review(app.id, decision, note)}
              onView={() => viewAdminCertificate(app.certificatePath)}
            />
          ))}
        </div>
      )}
    </div>
  );

  const accountTab = (
    <div className="space-y-4">
      {own.application && (
        <div className="rounded-lg border border-border bg-bg/40 p-2.5">
          <div className={`font-mono text-[11px] ${STATUS_STYLE[own.application.status].color}`}>
            {STATUS_STYLE[own.application.status].label}
          </div>
          <button type="button" onClick={viewOwnCertificate} className="mt-1 font-mono text-[11px] text-textMuted underline">
            Ver mi comprobante
          </button>
        </div>
      )}
      <OwnPatientLinkSection authenticated={authenticated} />
      {adminReview}
    </div>
  );

  if (!isApproved) {
    return (
      <div>
        <div className="font-display italic text-lg text-gold mb-1">Ser nutricionista</div>
        <div className="mb-3 text-xs text-textMuted">
          Subí un PDF o una foto de tu título/matrícula como comprobante. Lo revisamos a mano y, una vez aprobado, vas a poder
          vincularte con Pacientes y armarles su Plan Nutricional.
        </div>
        {!own.loaded ? (
          <div className="text-[12px] text-textMuted">Cargando...</div>
        ) : (
          <>
            {own.application && (
              <div className="mb-3 rounded-lg border border-border bg-bg/40 p-2.5">
                <div className={`font-mono text-[11px] ${STATUS_STYLE[own.application.status].color}`}>
                  {STATUS_STYLE[own.application.status].label}
                </div>
                <button type="button" onClick={viewOwnCertificate} className="mt-1 font-mono text-[11px] text-textMuted underline">
                  Ver mi comprobante
                </button>
                {own.application.reviewNote && (
                  <div className="mt-1.5 text-[11px] text-textMuted">Nota del admin: {own.application.reviewNote}</div>
                )}
              </div>
            )}
            {(!own.application || own.application.status === "rechazado") && (
              <>
                <input ref={fileRef} type="file" accept=".pdf,image/*" onChange={handleFile} className="hidden" />
                <button
                  type="button"
                  onClick={handlePick}
                  disabled={own.busy}
                  className="w-full rounded-lg p-2.5 font-sans text-sm font-bold bg-gold text-bg disabled:opacity-50"
                >
                  {own.application ? "Volver a postularme" : "Subir comprobante"}
                </button>
              </>
            )}
            {own.status && <div className="mt-2 text-center font-mono text-[11px] text-sage">{own.status}</div>}
          </>
        )}
        <div className="mt-5 border-t border-border pt-3">
          <OwnPatientLinkSection authenticated={authenticated} />
        </div>
        {adminReview}
      </div>
    );
  }

  return (
    <div>
      <div className="font-display italic text-lg text-gold mb-1">Nutricionista</div>
      <NutricionistaPatientsAndPlan authenticated={authenticated} maxStudents={own.application?.maxStudents ?? 1} accountTab={accountTab} />
    </div>
  );
}
