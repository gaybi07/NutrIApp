"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import { Expense, HouseholdMember } from "@/lib/expenses";

type Row = {
  id: string;
  household_id: string | null;
  user_id: string;
  fecha: string;
  tipo: Expense["tipo"];
  monto: number | string;
  categoria: string;
  descripcion: string | null;
  compartido: boolean;
  reparto: Record<string, number> | null;
  para_user_id: string | null;
  aporte_casa: boolean;
  origen: string | null;
};

const fromRow = (r: Row): Expense => ({
  id: r.id,
  householdId: r.household_id,
  userId: r.user_id,
  fecha: r.fecha,
  tipo: r.tipo,
  monto: Number(r.monto),
  categoria: r.categoria,
  descripcion: r.descripcion,
  compartido: r.compartido,
  reparto: r.reparto,
  paraUserId: r.para_user_id,
  aporteCasa: r.aporte_casa,
  origen: r.origen,
});

export type NewExpense = Pick<Expense, "fecha" | "tipo" | "monto" | "categoria"> &
  Partial<Pick<Expense, "descripcion" | "compartido" | "reparto" | "paraUserId" | "aporteCasa" | "origen">>;

/** Gastos e ingresos: los propios y los compartidos del grupo. Sin la migración devuelve todo vacío y `missing` en true. */
export function useExpenses(authenticated: boolean, householdId: string | null) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);

  const refetch = useCallback(async () => {
    if (!supabase) return;
    const { data: auth } = await supabase.auth.getUser();
    setMe(auth.user?.id ?? null);
    const { data, error } = await supabase.from("expenses").select("*").order("fecha", { ascending: false }).order("created_at", { ascending: false });
    if (error) {
      setMissing(true);
      return;
    }
    setMissing(false);
    setExpenses((data as Row[]).map(fromRow));
    if (householdId) {
      const { data: m } = await supabase.rpc("get_household_members", { p_household_id: householdId });
      if (m) setMembers((m as { user_id: string; nombre: string }[]).map((x) => ({ userId: x.user_id, nombre: x.nombre })));
    } else setMembers([]);
  }, [householdId]);

  useEffect(() => {
    if (authenticated) refetch();
  }, [authenticated, refetch]);

  /** Devuelve un mensaje de error, o null si salió bien. */
  const add = useCallback(
    async (e: NewExpense): Promise<string | null> => {
      if (!supabase || !me) return "No hay sesión.";
      setBusy(true);
      const { error } = await supabase.from("expenses").insert({
        household_id: householdId,
        user_id: me,
        fecha: e.fecha,
        tipo: e.tipo,
        monto: e.monto,
        categoria: e.categoria,
        descripcion: e.descripcion ?? null,
        compartido: Boolean(e.compartido),
        reparto: e.reparto ?? null,
        para_user_id: e.paraUserId ?? null,
        aporte_casa: Boolean(e.aporteCasa),
        origen: e.origen ?? null,
      });
      setBusy(false);
      if (error) return error.message;
      await refetch();
      return null;
    },
    [me, householdId, refetch]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!supabase) return;
      await supabase.from("expenses").delete().eq("id", id);
      await refetch();
    },
    [refetch]
  );

  return { expenses, members, me, missing, busy, add, remove, refetch };
}
