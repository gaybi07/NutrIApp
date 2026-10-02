"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/browser";

export interface PersonalProfile {
  nombre: string;
  alias: string;
}

export interface ProfessionalProfileData {
  titulo: string;
  dedicacion: string;
  bio: string;
  logros: string;
  whatsapp: string;
  mostrarWhatsapp: boolean;
}

/** Lo que devuelve get_professional_profile (migration_2026-10-15): el perfil visto por un alumno vinculado, o por él mismo. */
export interface ProfessionalProfileView {
  nombre: string | null;
  alias: string | null;
  titulo: string | null;
  dedicacion: string | null;
  bio: string | null;
  logros: string | null;
  whatsapp: string | null;
  promedio: number | null;
  cantidad: number;
  opiniones: { stars: number; comentario: string; fecha: string }[];
  verificado: boolean;
}

const EMPTY_PERSONAL: PersonalProfile = { nombre: "", alias: "" };
const EMPTY_PRO: ProfessionalProfileData = { titulo: "", dedicacion: "", bio: "", logros: "", whatsapp: "", mostrarWhatsapp: false };

/** Mi perfil personal y (si soy profesional) mi perfil profesional. Sin la migración quedan vacíos. */
export function useMyProfiles(authenticated: boolean) {
  const [personal, setPersonal] = useState<PersonalProfile>(EMPTY_PERSONAL);
  const [pro, setPro] = useState<ProfessionalProfileData>(EMPTY_PRO);

  const refetch = useCallback(async () => {
    if (!supabase) return;
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return;
    const [p, q] = await Promise.all([
      supabase.from("user_profiles").select("nombre, alias").eq("user_id", userId).maybeSingle(),
      supabase.from("professional_profiles").select("titulo, dedicacion, bio, logros, whatsapp, mostrar_whatsapp").eq("user_id", userId).maybeSingle(),
    ]);
    if (p.data) setPersonal({ nombre: p.data.nombre ?? "", alias: p.data.alias ?? "" });
    if (q.data)
      setPro({
        titulo: q.data.titulo ?? "",
        dedicacion: q.data.dedicacion ?? "",
        bio: q.data.bio ?? "",
        logros: q.data.logros ?? "",
        whatsapp: q.data.whatsapp ?? "",
        mostrarWhatsapp: Boolean(q.data.mostrar_whatsapp),
      });
  }, []);

  useEffect(() => {
    if (authenticated) refetch();
  }, [authenticated, refetch]);

  /** Devuelve un mensaje de error, o null si salió bien. */
  const savePersonal = useCallback(
    async (value: PersonalProfile): Promise<string | null> => {
      if (!supabase) return "No hay sesión.";
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) return "No hay sesión.";
      const alias = value.alias.trim().replace(/^@/, "");
      if (alias && !/^[a-zA-Z0-9_.]{3,20}$/.test(alias)) return "El alias va de 3 a 20 caracteres: letras, números, punto o guion bajo.";
      const { error } = await supabase.from("user_profiles").upsert({
        user_id: userId,
        nombre: value.nombre.trim() || null,
        alias: alias || null,
        updated_at: new Date().toISOString(),
      });
      if (error) return error.message.includes("user_profiles_alias_idx") ? "Ese alias ya está en uso." : error.message;
      await refetch();
      return null;
    },
    [refetch]
  );

  const savePro = useCallback(
    async (value: ProfessionalProfileData): Promise<string | null> => {
      if (!supabase) return "No hay sesión.";
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) return "No hay sesión.";
      const { error } = await supabase.from("professional_profiles").upsert({
        user_id: userId,
        titulo: value.titulo.trim() || null,
        dedicacion: value.dedicacion.trim() || null,
        bio: value.bio.trim() || null,
        logros: value.logros.trim() || null,
        whatsapp: value.whatsapp.trim() || null,
        mostrar_whatsapp: value.mostrarWhatsapp,
        updated_at: new Date().toISOString(),
      });
      if (error) return error.message;
      await refetch();
      return null;
    },
    [refetch]
  );

  return { personal, pro, savePersonal, savePro, refetch };
}

/** Perfil de un profesional (vinculado conmigo, o el mío). Devuelve null si no hay permiso o falta la migración. */
export async function fetchProfessionalProfile(trainerId: string): Promise<ProfessionalProfileView | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_professional_profile", { p_trainer_id: trainerId });
  if (error || !data) return null;
  return data as ProfessionalProfileView;
}

export function initialsOf(nombre: string | null | undefined, alias: string | null | undefined, email: string | null | undefined): string {
  const source = (nombre || alias || email || "?").trim();
  const parts = source.split(/[\s._@-]+/).filter(Boolean);
  const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : source.slice(0, 2);
  return letters.toUpperCase();
}
