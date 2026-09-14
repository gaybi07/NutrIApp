"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import { InventoryItem } from "./types";

export interface HouseholdInfo {
  id: string;
  name: string;
  role: string;
  memberCount: number;
}

/**
 * Grupo compartido (pareja, amigos, "hogar") para llevar una sola alacena
 * entre varias cuentas -- cada usuario pertenece a lo sumo a un grupo.
 * Crear/unirse pasan por funciones RPC (ver migration_2026-09-14b) en vez
 * de inserts directos: para poder insertarte en household_members ya
 * tendrías que ser miembro, así que esa parte necesita privilegios
 * elevados y validación propia del lado del server.
 */
export function useHousehold(authenticated: boolean) {
  const [household, setHousehold] = useState<HouseholdInfo | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const refetch = useCallback(async () => {
    if (!supabase) {
      setLoaded(true);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setHousehold(null);
      setLoaded(true);
      return;
    }
    const { data: memberships } = await supabase
      .from("household_members")
      .select("household_id, role")
      .eq("user_id", user.id)
      .limit(1);
    const membership = memberships?.[0];
    if (!membership) {
      setHousehold(null);
      setLoaded(true);
      return;
    }
    const [{ data: householdRow }, { count }] = await Promise.all([
      supabase.from("households").select("id, name").eq("id", membership.household_id).maybeSingle(),
      supabase
        .from("household_members")
        .select("user_id", { count: "exact", head: true })
        .eq("household_id", membership.household_id),
    ]);
    if (householdRow) {
      setHousehold({ id: householdRow.id, name: householdRow.name, role: membership.role, memberCount: count || 1 });
    } else {
      setHousehold(null);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (authenticated) refetch();
    else {
      setHousehold(null);
      setLoaded(true);
    }
  }, [authenticated, refetch]);

  const create = useCallback(
    async (name: string, importItems: InventoryItem[]) => {
      if (!supabase) return;
      setBusy(true);
      setStatus("Creando grupo...");
      const { error } = await supabase.rpc("create_household", {
        p_name: name,
        p_import_items: importItems.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category,
          nutritionPer100g: item.nutritionPer100g,
          nutritionConfirmed: item.nutritionConfirmed,
        })),
      });
      if (error) {
        setStatus(error.message);
        setBusy(false);
        return;
      }
      await refetch();
      setStatus("Grupo creado ✓");
      setBusy(false);
    },
    [refetch]
  );

  const join = useCallback(
    async (code: string) => {
      if (!supabase) return;
      setBusy(true);
      setStatus("Uniéndote...");
      const { error } = await supabase.rpc("join_household", { p_code: code.trim() });
      if (error) {
        setStatus(error.message.includes("nv") ? "Código inválido." : error.message);
        setBusy(false);
        return;
      }
      await refetch();
      setStatus("Te uniste al grupo ✓");
      setBusy(false);
    },
    [refetch]
  );

  const leave = useCallback(async () => {
    if (!supabase || !household) return;
    setBusy(true);
    await supabase.rpc("leave_household", { p_household_id: household.id });
    setHousehold(null);
    setStatus("Saliste del grupo — volviste a tu alacena individual.");
    setBusy(false);
  }, [household]);

  const getInviteCode = useCallback(async (): Promise<string | null> => {
    if (!supabase || !household) return null;
    const { data: existing } = await supabase
      .from("household_invites")
      .select("code")
      .eq("household_id", household.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing?.code) return existing.code;
    const { data, error } = await supabase.rpc("generate_invite_code", { p_household_id: household.id });
    if (error) return null;
    return (data as string) || null;
  }, [household]);

  return { household, loaded, status, setStatus, busy, create, join, leave, getInviteCode };
}
