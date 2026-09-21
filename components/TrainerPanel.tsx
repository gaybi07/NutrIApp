"use client";

import { useRef, useState } from "react";
import { useTrainerApplication, useTrainerAdmin } from "@/lib/useTrainerApplication";
import { useTrainerLink, useTrainerStudents, useTrainerRoutines, useTrainerRoutinesForStudent } from "@/lib/useTrainerLink";
import { useTrainerIncidents } from "@/lib/useRoutineIncidents";
import { useStudentMetrics } from "@/lib/useStudentMetrics";
import { TrainerApplication, TrainerStatus, TrainerRoutine, TrainerLinkRequest, RoutineIncident, RoutineIncidentType, StudentMetrics, Routine } from "@/lib/types";
import { RoutineEditorModal } from "@/components/RoutineEditorModal";

const STATUS_STYLE: Record<TrainerStatus, { label: string; color: string }> = {
  pendiente: { label: "Pendiente de revisión", color: "text-gold" },
  aprobado: { label: "Aprobado ✓", color: "text-sage" },
  rechazado: { label: "Rechazado", color: "text-rust" },
};

const INCIDENT_LABEL: Record<RoutineIncidentType, string> = {
  omitido: "Omitido",
  reemplazado: "Reemplazado",
  comentario: "Comentario",
  comentario_final: "Comentario final",
  serie_adicional: "Serie adicional",
  ejercicio_fuera_de_plan: "Ejercicio fuera de plan",
};

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function AdminRow({
  app,
  busy,
  onReview,
  onView,
}: {
  app: TrainerApplication;
  busy: boolean;
  onReview: (decision: "aprobado" | "rechazado", note: string) => void;
  onView: () => void;
}) {
  const [note, setNote] = useState("");
  const style = STATUS_STYLE[app.status];
  return (
    <div className="rounded-lg border border-border bg-bg/40 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-text">{app.userEmail}</span>
        <span className={`font-mono text-[10px] ${style.color}`}>{style.label}</span>
      </div>
      <button type="button" onClick={onView} className="mt-1.5 font-mono text-[11px] text-textMuted underline">
        Ver comprobante
      </button>
      {app.reviewNote && <div className="mt-1.5 text-[11px] text-textMuted">Nota: {app.reviewNote}</div>}
      {app.status === "pendiente" && (
        <div className="mt-2">
          <input
            type="text"
            placeholder="Nota opcional (ej: motivo del rechazo)"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="mb-1.5 w-full"
          />
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => onReview("rechazado", note)}
              className="rounded-lg border border-rust/50 px-2 py-1.5 font-mono text-[10px] uppercase tracking-wide text-rust disabled:opacity-50"
            >
              Rechazar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onReview("aprobado", note)}
              className="rounded-lg border border-sage/50 bg-sage/10 px-2 py-1.5 font-mono text-[10px] uppercase tracking-wide text-sage disabled:opacity-50"
            >
              Aprobar
            </button>
          </div>
        </div>
      )}
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

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg/40 p-2">
      <div className="font-mono text-[8.5px] uppercase tracking-wide text-textMuted">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-text">{value}</div>
    </div>
  );
}

function StudentMetricsPanel({ metrics }: { metrics: StudentMetrics }) {
  const fmt = (value: number | null, suffix = "") => (value == null ? "—" : `${value}${suffix}`);
  const cambioPeso =
    metrics.cambioPeso == null ? "—" : `${metrics.cambioPeso > 0 ? "+" : ""}${metrics.cambioPeso.toFixed(1)}kg`;
  return (
    <div className="mt-2 grid grid-cols-2 gap-1.5">
      <MetricCard label="Adherencia semanal" value={fmt(metrics.adherenciaSemanal, "%")} />
      <MetricCard label="Entrenos realizados" value={String(metrics.entrenosRealizados)} />
      <MetricCard label="Entrenos planificados" value={String(metrics.entrenosPlanificados)} />
      <MetricCard label="Peso actual" value={fmt(metrics.pesoActual, "kg")} />
      <MetricCard label="Cambio vs. semana ant." value={cambioPeso} />
      <MetricCard label="Proteína promedio" value={fmt(metrics.proteinaPromedio, "g")} />
      <MetricCard label="Pasos promedio" value={fmt(metrics.pasosPromedio)} />
      <MetricCard label="Volumen semanal" value={fmt(Math.round(metrics.volumenSemanal), "kg")} />
    </div>
  );
}

function IncidentRow({
  incident,
  studentEmail,
  busy,
  onMarkSeen,
}: {
  incident: RoutineIncident;
  studentEmail: string;
  busy: boolean;
  onMarkSeen: () => void;
}) {
  return (
    <div className={`rounded-lg border p-2.5 ${incident.vistoPorEntrenador ? "border-border bg-bg/40" : "border-gold/40 bg-gold/5"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-text">{studentEmail}</span>
        <span className="font-mono text-[9px] uppercase tracking-wide text-textMuted">{incident.fecha}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-gold">
          {INCIDENT_LABEL[incident.tipo]}
        </span>
        <span className="font-mono text-[10px] text-textMuted">
          {incident.routineNombre}
          {incident.ejercicioNombre ? ` · ${incident.ejercicioNombre}` : ""}
        </span>
      </div>
      {incident.detalle && <div className="mt-1 text-[11px] text-textMuted">{incident.detalle}</div>}
      {!incident.vistoPorEntrenador && (
        <button
          type="button"
          onClick={onMarkSeen}
          disabled={busy}
          className="mt-1.5 rounded-full border border-border px-2 py-1 font-mono text-[9px] uppercase tracking-wide text-textMuted disabled:opacity-50"
        >
          Marcar como vista
        </button>
      )}
    </div>
  );
}

function TrainerStudentsAndRoutines({ authenticated }: { authenticated: boolean }) {
  const studentsHook = useTrainerStudents(authenticated, true);
  const routinesHook = useTrainerRoutines(authenticated, true);
  const incidentsHook = useTrainerIncidents(authenticated, true);
  const metricsHook = useStudentMetrics();
  const [editing, setEditing] = useState<TrainerRoutine | "new" | null>(null);
  const [metricsOpenFor, setMetricsOpenFor] = useState<string | null>(null);

  const toggleMetrics = (studentId: string) => {
    if (metricsOpenFor === studentId) {
      setMetricsOpenFor(null);
      return;
    }
    setMetricsOpenFor(studentId);
    if (!metricsHook.metricsByStudent[studentId]) metricsHook.load(studentId);
  };

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
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Tus alumnos</div>
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
            Compartí este código con tu alumno
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
        <div className="mb-3 rounded-lg border border-dashed border-border p-3 text-[12px] text-textMuted">Todavía no tenés alumnos vinculados.</div>
      ) : (
        <div className="mb-3 space-y-1.5">
          {studentsHook.students.map((s) => (
            <div key={s.studentId} className="rounded-lg border border-border bg-bg/40 px-2.5 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] text-text">{s.studentEmail}</span>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => toggleMetrics(s.studentId)} className="font-mono text-[10px] text-gold">
                    {metricsOpenFor === s.studentId ? "Ocultar métricas" : "Ver métricas"}
                  </button>
                  <button type="button" onClick={() => studentsHook.removeStudent(s.studentId)} className="font-mono text-[10px] text-rust">
                    Quitar
                  </button>
                </div>
              </div>
              {metricsOpenFor === s.studentId &&
                (metricsHook.loadingId === s.studentId ? (
                  <div className="mt-2 text-[11px] text-textMuted">Calculando...</div>
                ) : metricsHook.metricsByStudent[s.studentId] ? (
                  <StudentMetricsPanel metrics={metricsHook.metricsByStudent[s.studentId]!} />
                ) : (
                  <div className="mt-2 text-[11px] text-rust">No se pudieron cargar las métricas.</div>
                ))}
            </div>
          ))}
        </div>
      )}

      <div className="mb-2 mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Incidencias</div>
      {!incidentsHook.loaded ? (
        <div className="mb-3 text-[12px] text-textMuted">Cargando...</div>
      ) : incidentsHook.incidents.length === 0 ? (
        <div className="mb-3 rounded-lg border border-dashed border-border p-3 text-[12px] text-textMuted">
          Todavía no hay incidencias reportadas en tus rutinas asignadas.
        </div>
      ) : (
        <div className="mb-3 space-y-1.5">
          {incidentsHook.incidents.map((incident) => (
            <IncidentRow
              key={incident.id}
              incident={incident}
              studentEmail={studentsHook.students.find((s) => s.studentId === incident.studentId)?.studentEmail || incident.studentId}
              busy={incidentsHook.busyId === incident.id}
              onMarkSeen={() => incidentsHook.markSeen(incident.id)}
            />
          ))}
        </div>
      )}

      <div className="mb-2 mt-4 flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Tus rutinas para alumnos</div>
        <button type="button" onClick={() => setEditing("new")} className="rounded-full border border-gold/60 bg-gold px-2.5 py-1 font-mono text-[9px] uppercase tracking-wide text-bg">
          + Nueva
        </button>
      </div>
      {!routinesHook.loaded ? (
        <div className="text-[12px] text-textMuted">Cargando...</div>
      ) : routinesHook.routines.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-3 text-[12px] text-textMuted">Todavía no armaste ninguna rutina para alumnos.</div>
      ) : (
        <div className="space-y-2">
          {routinesHook.routines.map((r) => (
            <div key={r.id} className="rounded-lg border border-border bg-bg/40 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-text">{r.nombre}</div>
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => setEditing(r)} className="rounded-full border border-border px-2 py-1 font-mono text-[9px] uppercase tracking-wide text-textMuted">
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => routinesHook.remove(r.id)}
                    className="rounded-full border border-rust/50 px-2 py-1 font-mono text-[9px] uppercase tracking-wide text-rust"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
              <div className="mt-1.5 space-y-0.5">
                {r.ejercicios.map((e, i) => (
                  <div key={i} className="font-mono text-[10px] text-textMuted">
                    {e.nombre} · {e.series}x{e.repeticiones}
                    {e.peso ? ` · ${e.peso}kg` : ""}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <RoutineEditorModal
          initial={editing === "new" ? null : editing}
          onSave={(routine) => routinesHook.save(routine)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function StudentLinkSection({
  authenticated,
  routines,
  onSaveRoutines,
}: {
  authenticated: boolean;
  routines: Routine[];
  onSaveRoutines: (routines: Routine[]) => void;
}) {
  const linkHook = useTrainerLink(authenticated);
  const trainerRoutines = useTrainerRoutinesForStudent(authenticated, Boolean(linkHook.link));
  const [code, setCode] = useState("");
  const [adoptedIds, setAdoptedIds] = useState<string[]>([]);

  const adopt = (routine: TrainerRoutine) => {
    onSaveRoutines([
      ...routines,
      {
        id: newId(),
        nombre: routine.nombre,
        ejercicios: routine.ejercicios.map((e) => ({ ...e })),
        origen: "asignada",
        trainerRoutineId: routine.id,
        trainerId: routine.trainerId,
        assignedAt: new Date().toISOString(),
      },
    ]);
    setAdoptedIds((prev) => [...prev, routine.id]);
  };

  return (
    <div className="mt-5 border-t border-border pt-3">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Tu entrenador</div>
      {!linkHook.loaded ? (
        <div className="text-[12px] text-textMuted">Cargando...</div>
      ) : linkHook.link ? (
        <>
          <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-border bg-bg/40 px-2.5 py-2">
            <span className="font-mono text-[11px] text-text">{linkHook.link.trainerEmail}</span>
            <button type="button" onClick={linkHook.leave} className="font-mono text-[10px] text-rust">
              Desvincularme
            </button>
          </div>
          {!trainerRoutines.loaded ? (
            <div className="text-[12px] text-textMuted">Cargando rutinas...</div>
          ) : trainerRoutines.routines.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-3 text-[12px] text-textMuted">Tu entrenador todavía no armó rutinas.</div>
          ) : (
            <div className="space-y-2">
              {trainerRoutines.routines.map((r) => {
                const adopted = adoptedIds.includes(r.id);
                return (
                  <div key={r.id} className="rounded-lg border border-border bg-bg/40 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-text">{r.nombre}</div>
                      <button
                        type="button"
                        onClick={() => adopt(r)}
                        disabled={adopted}
                        className="rounded-full border border-gold/60 bg-gold px-2.5 py-1 font-mono text-[9px] uppercase tracking-wide text-bg disabled:opacity-50"
                      >
                        {adopted ? "Adoptada ✓" : "Adoptar"}
                      </button>
                    </div>
                    <div className="mt-1.5 space-y-0.5">
                      {r.ejercicios.map((e, i) => (
                        <div key={i} className="font-mono text-[10px] text-textMuted">
                          {e.nombre} · {e.series}x{e.repeticiones}
                          {e.peso ? ` · ${e.peso}kg` : ""}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : linkHook.myRequest?.status === "pendiente" ? (
        <div className="rounded-lg border border-dashed border-gold/50 bg-gold/5 p-3 text-[12px] text-textMuted">
          Solicitud enviada a <span className="font-semibold text-text">{linkHook.myRequest.trainerEmail}</span> —
          esperando que la acepte.
        </div>
      ) : (
        <div>
          {linkHook.myRequest?.status === "rechazada" && (
            <div className="mb-2 rounded-lg border border-rust/40 bg-rust/10 px-2.5 py-2 text-[11px] text-rust">
              Tu entrenador rechazó tu solicitud{linkHook.myRequest.responseNote ? `: ${linkHook.myRequest.responseNote}` : "."} Podés
              probar con otro código.
            </div>
          )}
          <div className="mb-2 text-[11px] text-textMuted">Pedile el código a tu entrenador para vincularte.</div>
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

export function TrainerPanel({
  authenticated,
  userEmail,
  routines,
  onSaveRoutines,
}: {
  authenticated: boolean;
  userEmail: string | null;
  routines: Routine[];
  onSaveRoutines: (routines: Routine[]) => void;
}) {
  const own = useTrainerApplication(authenticated, userEmail);
  const admin = useTrainerAdmin(authenticated, userEmail);
  const fileRef = useRef<HTMLInputElement>(null);
  const isApprovedTrainer = own.application?.status === "aprobado";

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

  return (
    <div>
      <div className="font-display italic text-lg text-gold mb-1">Ser entrenador</div>
      <div className="mb-3 text-xs text-textMuted">
        Subí un PDF o una foto de tu título/curso como comprobante. Lo revisamos a mano y, una vez aprobado, vas a poder armar
        rutinas para que tus alumnos las adopten.
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

      {isApprovedTrainer && <TrainerStudentsAndRoutines authenticated={authenticated} />}

      <StudentLinkSection authenticated={authenticated} routines={routines} onSaveRoutines={onSaveRoutines} />

      {admin.isAdmin && (
        <div className="mt-5 border-t border-border pt-3">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Revisión (admin)</div>
          {!admin.loaded ? (
            <div className="text-[12px] text-textMuted">Cargando...</div>
          ) : admin.applications.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-3 text-[12px] text-textMuted">
              No hay postulaciones todavía.
            </div>
          ) : (
            <div className="space-y-2">
              {admin.applications.map((app) => (
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
      )}
    </div>
  );
}
