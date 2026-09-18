"use client";

import { useRef, useState } from "react";
import { useTrainerApplication, useTrainerAdmin } from "@/lib/useTrainerApplication";
import { useTrainerLink, useTrainerStudents, useTrainerRoutines, useTrainerRoutinesForStudent } from "@/lib/useTrainerLink";
import { TrainerApplication, TrainerStatus, TrainerRoutine, Routine } from "@/lib/types";
import { RoutineEditorModal } from "@/components/RoutineEditorModal";

const STATUS_STYLE: Record<TrainerStatus, { label: string; color: string }> = {
  pendiente: { label: "Pendiente de revisión", color: "text-gold" },
  aprobado: { label: "Aprobado ✓", color: "text-sage" },
  rechazado: { label: "Rechazado", color: "text-rust" },
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

function TrainerStudentsAndRoutines({ authenticated }: { authenticated: boolean }) {
  const studentsHook = useTrainerStudents(authenticated, true);
  const routinesHook = useTrainerRoutines(authenticated, true);
  const [editing, setEditing] = useState<TrainerRoutine | "new" | null>(null);

  return (
    <div className="mt-5 border-t border-border pt-3">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Tus alumnos</div>
      <button
        type="button"
        onClick={studentsHook.getInviteCode}
        disabled={studentsHook.busy}
        className="mb-2 w-full rounded-lg border border-gold/60 bg-gold/10 px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-gold disabled:opacity-50"
      >
        {studentsHook.inviteCode ? `Código: ${studentsHook.inviteCode}` : "Generar código de invitación"}
      </button>
      {studentsHook.status && <div className="mb-2 text-[11px] text-rust">{studentsHook.status}</div>}
      {!studentsHook.loaded ? (
        <div className="text-[12px] text-textMuted">Cargando...</div>
      ) : studentsHook.students.length === 0 ? (
        <div className="mb-3 rounded-lg border border-dashed border-border p-3 text-[12px] text-textMuted">Todavía no tenés alumnos vinculados.</div>
      ) : (
        <div className="mb-3 space-y-1.5">
          {studentsHook.students.map((s) => (
            <div key={s.studentId} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg/40 px-2.5 py-2">
              <span className="font-mono text-[11px] text-text">{s.studentEmail}</span>
              <button type="button" onClick={() => studentsHook.removeStudent(s.studentId)} className="font-mono text-[10px] text-rust">
                Quitar
              </button>
            </div>
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
    onSaveRoutines([...routines, { id: newId(), nombre: routine.nombre, ejercicios: routine.ejercicios.map((e) => ({ ...e })) }]);
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
      ) : (
        <div>
          <div className="mb-2 text-[11px] text-textMuted">Pedile el código a tu entrenador para vincularte.</div>
          <div className="flex gap-2">
            <input type="text" placeholder="Código" value={code} onChange={(event) => setCode(event.target.value)} className="min-w-0 flex-1" />
            <button
              type="button"
              onClick={() => linkHook.join(code)}
              disabled={linkHook.busy || !code.trim()}
              className="shrink-0 rounded-lg border border-gold/60 bg-gold px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-bg disabled:opacity-50"
            >
              Vincularme
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
