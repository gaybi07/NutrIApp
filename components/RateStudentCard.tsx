"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import { Disciplina } from "@/lib/types";
import { btn } from "@/components/buttonStyles";

type Rating = "bueno" | "regular" | "malo";

const RATING_LABEL: Record<Rating, string> = { bueno: "Bueno", regular: "Regular", malo: "Malo" };
const RATING_COLOR: Record<Rating, string> = {
  bueno: "rgb(var(--color-sage))",
  regular: "rgb(var(--color-carbs))",
  malo: "rgb(var(--color-rust))",
};

/**
 * Lado PROFESIONAL: calificación del alumno / paciente (bueno / regular / malo + comentario). Es PRIVADA: la ve
 * solo el profesional, el cliente nunca (link_feedback, migration_2026-10-08). Se puede dejar al cierre del mes
 * de vínculo y cuando el vínculo termina.
 */
export function RateStudentCard({ studentId, disciplina }: { studentId: string; disciplina: Disciplina }) {
  const [rating, setRating] = useState<Rating | null>(null);
  const [comentario, setComentario] = useState("");
  const [last, setLast] = useState<{ rating: Rating; comentario: string | null; created_at: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("link_feedback")
      .select("rating, comentario, created_at")
      .eq("student_id", studentId)
      .eq("disciplina", disciplina)
      .eq("author_role", "profesional")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.rating) setLast({ rating: data.rating as Rating, comentario: (data.comentario as string) ?? null, created_at: data.created_at as string });
      });
  }, [studentId, disciplina]);

  const save = async () => {
    if (!supabase || !rating) return;
    setBusy(true);
    setStatus("");
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setBusy(false);
      return;
    }
    const { error } = await supabase.from("link_feedback").insert({
      student_id: studentId,
      trainer_id: userId,
      disciplina,
      author_role: "profesional",
      rating,
      comentario: comentario.trim() || null,
      momento: "mensual",
    });
    if (error) {
      setStatus(`No se pudo guardar: ${error.message}`);
    } else {
      setLast({ rating, comentario: comentario.trim() || null, created_at: new Date().toISOString() });
      setRating(null);
      setComentario("");
      setStatus("Calificación guardada ✓");
    }
    setBusy(false);
  };

  return (
    <div className="mt-3 rounded-xl border border-border bg-bg/30 p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-gold">Calificar al {disciplina === "nutricion" ? "paciente" : "alumno"} · privado</div>
      <div className="mt-0.5 text-[11px] text-textMuted">Solo la ves vos. El {disciplina === "nutricion" ? "paciente" : "alumno"} no ve esta calificación.</div>
      {last && (
        <div className="mt-2 text-[12px] text-text">
          Última: <b style={{ color: RATING_COLOR[last.rating] }}>{RATING_LABEL[last.rating]}</b>
          <span className="text-textMuted"> · {new Date(last.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "numeric" })}</span>
          {last.comentario ? <span className="text-textMuted"> — {last.comentario}</span> : null}
        </div>
      )}
      <div className="mt-2 grid grid-cols-3 gap-2">
        {(["bueno", "regular", "malo"] as Rating[]).map((r) => {
          const active = rating === r;
          return (
            <button
              key={r}
              type="button"
              onClick={() => setRating(active ? null : r)}
              className="rounded-lg border px-2 py-2 font-mono text-[10px] font-bold uppercase tracking-wide"
              style={active ? { background: RATING_COLOR[r], borderColor: RATING_COLOR[r], color: r === "regular" ? "#4a2f00" : r === "bueno" ? "#0f3d2d" : "#fff" } : { borderColor: "rgb(var(--color-border))", color: "rgb(var(--color-text-muted))" }}
            >
              {RATING_LABEL[r]}
            </button>
          );
        })}
      </div>
      {rating && (
        <>
          <textarea value={comentario} onChange={(event) => setComentario(event.target.value)} placeholder="Comentario (opcional)" rows={2} maxLength={500} className="mt-2 w-full text-[12px]" />
          <button type="button" disabled={busy} onClick={save} className={`${btn("primary", "md", true)} mt-2`}>
            {busy ? "Guardando..." : "Guardar calificación"}
          </button>
        </>
      )}
      {status && <div className={`mt-1.5 text-[11px] ${status.startsWith("No se pudo") ? "text-rust" : "text-sage"}`}>{status}</div>}
    </div>
  );
}
