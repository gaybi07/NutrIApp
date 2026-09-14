"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import { PurchaseRecord } from "./types";

function rowToPurchase(row: Record<string, unknown>): PurchaseRecord {
  return {
    id: String(row.id),
    fecha: String(row.fecha),
    name: String(row.name),
    quantity: Number(row.quantity),
    unit: row.unit as PurchaseRecord["unit"],
    brand: (row.brand as string) || undefined,
    price: row.price != null ? Number(row.price) : undefined,
    category: (row.category as PurchaseRecord["category"]) || undefined,
  };
}

/** Misma forma que usePurchaseHistory() pero respaldada por la tabla
 * compartida purchase_history -- así todos los del grupo ven el mismo
 * historial de compras, con sync en vivo igual que useSharedInventory. */
export function useSharedPurchases(householdId: string | null) {
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refetch = useCallback(async () => {
    if (!supabase || !householdId) {
      setPurchases([]);
      setLoaded(true);
      return;
    }
    const { data, error } = await supabase
      .from("purchase_history")
      .select("*")
      .eq("household_id", householdId)
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false });
    if (!error && data) setPurchases(data.map(rowToPurchase));
    setLoaded(true);
  }, [householdId]);

  useEffect(() => {
    setLoaded(false);
    refetch();
  }, [refetch]);

  // Respaldo del realtime: si volvés a la pestaña/app después de un rato,
  // refresca igual aunque el canal realtime se haya cortado o tardado.
  useEffect(() => {
    if (!householdId) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") refetch();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [householdId, refetch]);

  useEffect(() => {
    if (!supabase || !householdId) return;
    const client = supabase;
    const channel = client
      .channel(`purchases-${householdId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "purchase_history", filter: `household_id=eq.${householdId}` },
        () => refetch()
      )
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }, [householdId, refetch]);

  const addPurchases = useCallback(
    (entries: Array<Omit<PurchaseRecord, "id">>) => {
      if (!supabase || !householdId) return;
      (async () => {
        await supabase!.from("purchase_history").insert(
          entries.map((entry) => ({
            household_id: householdId,
            fecha: entry.fecha,
            name: entry.name,
            quantity: entry.quantity,
            unit: entry.unit,
            brand: entry.brand || null,
            price: entry.price ?? null,
            category: entry.category || null,
          }))
        );
        await refetch();
      })();
    },
    [householdId, refetch]
  );

  const removePurchase = useCallback(
    (id: string) => {
      if (!supabase || !householdId) return;
      (async () => {
        await supabase!.from("purchase_history").delete().eq("id", id);
        await refetch();
      })();
    },
    [householdId, refetch]
  );

  return { purchases, loaded, addPurchases, removePurchase };
}
