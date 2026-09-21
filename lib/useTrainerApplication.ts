"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import { TrainerApplication, TrainerStatus } from "./types";

/** Único admin de la app (vos) -- el que revisa a mano los comprobantes.
 * Coincide con la policy de RLS en migration_2026-09-17_add_trainer_applications.sql. */
export const TRAINER_ADMIN_EMAIL = "jgabrielrosa8@gmail.com";

const BUCKET = "trainer-certificates";
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic"];

function fromRow(row: Record<string, unknown>): TrainerApplication {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    userEmail: row.user_email as string,
    certificatePath: row.certificate_path as string,
    status: row.status as TrainerStatus,
    createdAt: row.created_at as string,
    reviewedAt: (row.reviewed_at as string) ?? null,
    reviewNote: (row.review_note as string) ?? null,
    trainerPlan: (row.trainer_plan as TrainerApplication["trainerPlan"]) ?? "gratis",
    maxStudents: (row.max_students as number) ?? 1,
  };
}

/**
 * Postulación propia para ser entrenador certificado: subís un PDF o foto de
 * tu título/curso como comprobante y queda "pendiente" hasta que el admin lo
 * revisa a mano. Podés volver a postularte (pisa el mismo archivo y la misma
 * fila) mientras esté pendiente o si te rechazaron.
 */
export function useTrainerApplication(authenticated: boolean, userEmail: string | null) {
  const [application, setApplication] = useState<TrainerApplication | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const refetch = useCallback(async () => {
    if (!supabase) {
      setLoaded(true);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setApplication(null);
      setLoaded(true);
      return;
    }
    const { data } = await supabase.from("trainer_applications").select("*").eq("user_id", user.id).maybeSingle();
    setApplication(data ? fromRow(data) : null);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (authenticated) refetch();
    else {
      setApplication(null);
      setLoaded(true);
    }
  }, [authenticated, refetch]);

  const submit = useCallback(
    async (file: File) => {
      if (!supabase) return;
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setStatus("Formato no válido — subí un PDF o una foto (JPG/PNG).");
        return;
      }
      if (file.size > MAX_SIZE_BYTES) {
        setStatus("El archivo pesa demasiado (máx. 10MB).");
        return;
      }
      setBusy(true);
      setStatus("Subiendo comprobante...");
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setStatus("Iniciá sesión primero.");
        setBusy(false);
        return;
      }
      const ext = file.name.split(".").pop() || "pdf";
      const path = `${user.id}/certificado.${ext}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
      if (uploadError) {
        setStatus(`No se pudo subir el archivo: ${uploadError.message}`);
        setBusy(false);
        return;
      }
      const { data, error } = await supabase
        .from("trainer_applications")
        .upsert(
          {
            user_id: user.id,
            user_email: userEmail || user.email || "",
            certificate_path: path,
            status: "pendiente",
            reviewed_at: null,
            review_note: null,
          },
          { onConflict: "user_id" }
        )
        .select()
        .single();
      if (error) {
        setStatus(`No se pudo enviar la postulación: ${error.message}`);
        setBusy(false);
        return;
      }
      setApplication(fromRow(data));
      setStatus("Comprobante enviado — queda pendiente de revisión ✓");
      setBusy(false);
    },
    [userEmail]
  );

  const certificateSignedUrl = useCallback(async (): Promise<string | null> => {
    if (!supabase || !application) return null;
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(application.certificatePath, 300);
    return data?.signedUrl || null;
  }, [application]);

  return { application, loaded, busy, status, submit, certificateSignedUrl, refetch };
}

/**
 * Panel de revisión, solo para el admin: lista todas las postulaciones
 * (pendientes primero) y deja aprobar/rechazar. Si no sos el admin, `isAdmin`
 * da false y no hace ninguna consulta -- las policies de RLS igual lo
 * bloquearían del lado del server, esto es solo para no mostrar la UI.
 */
export function useTrainerAdmin(authenticated: boolean, userEmail: string | null) {
  const isAdmin = authenticated && userEmail === TRAINER_ADMIN_EMAIL;
  const [applications, setApplications] = useState<TrainerApplication[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!supabase || !isAdmin) {
      setLoaded(true);
      return;
    }
    const { data } = await supabase
      .from("trainer_applications")
      .select("*")
      .order("status", { ascending: true }) // "pendiente" < "rechazado" alfabéticamente, ambos antes que "aprobado" no es ideal pero se reordena abajo
      .order("created_at", { ascending: false });
    const rows = (data || []).map(fromRow);
    rows.sort((a, b) => {
      const rank = (s: TrainerStatus) => (s === "pendiente" ? 0 : s === "rechazado" ? 1 : 2);
      return rank(a.status) - rank(b.status);
    });
    setApplications(rows);
    setLoaded(true);
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) refetch();
    else setLoaded(true);
  }, [isAdmin, refetch]);

  const review = useCallback(
    async (id: string, decision: "aprobado" | "rechazado", note: string) => {
      if (!supabase) return;
      setBusyId(id);
      const { error } = await supabase
        .from("trainer_applications")
        .update({ status: decision, reviewed_at: new Date().toISOString(), review_note: note.trim() || null })
        .eq("id", id);
      if (!error) await refetch();
      setBusyId(null);
    },
    [refetch]
  );

  const signedUrlFor = useCallback(async (path: string): Promise<string | null> => {
    if (!supabase) return null;
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 300);
    return data?.signedUrl || null;
  }, []);

  return { isAdmin, applications, loaded, busyId, review, signedUrlFor };
}
