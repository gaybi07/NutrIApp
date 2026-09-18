"use client";

import { useRef, useState } from "react";
import { useTrainerApplication, useTrainerAdmin } from "@/lib/useTrainerApplication";
import { TrainerApplication, TrainerStatus } from "@/lib/types";

const STATUS_STYLE: Record<TrainerStatus, { label: string; color: string }> = {
  pendiente: { label: "Pendiente de revisión", color: "text-gold" },
  aprobado: { label: "Aprobado ✓", color: "text-sage" },
  rechazado: { label: "Rechazado", color: "text-rust" },
};

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

export function TrainerPanel({ authenticated, userEmail }: { authenticated: boolean; userEmail: string | null }) {
  const own = useTrainerApplication(authenticated, userEmail);
  const admin = useTrainerAdmin(authenticated, userEmail);
  const fileRef = useRef<HTMLInputElement>(null);

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
        rutinas para que tus alumnos las adopten (esto último todavía no está activo).
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
