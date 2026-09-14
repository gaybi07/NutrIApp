"use client";

import { useCallback, useEffect, useState } from "react";
import { PurchaseRecord } from "./types";

const PURCHASES_KEY = "registro:purchases:v1";

/**
 * Historial de compras (fecha, marca, precio) -- separado de la alacena
 * porque esta es una bitácora que crece con el tiempo, no un estado
 * actual que se pisa. Se llena solo al confirmar la lectura de un ticket
 * con IA (que es lo único que trae precio/marca); agregar productos a
 * mano no genera un renglón acá.
 */
export function usePurchaseHistory() {
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PURCHASES_KEY);
      if (saved) setPurchases(JSON.parse(saved));
    } catch {
      setPurchases([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  const persist = useCallback((next: PurchaseRecord[]) => {
    setPurchases(next);
    localStorage.setItem(PURCHASES_KEY, JSON.stringify(next));
  }, []);

  const addPurchases = useCallback(
    (entries: Array<Omit<PurchaseRecord, "id">>) => {
      setPurchases((previous) => {
        const withIds = entries.map((entry, i) => ({ ...entry, id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}` }));
        const next = [...withIds, ...previous];
        localStorage.setItem(PURCHASES_KEY, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const removePurchase = useCallback(
    (id: string) => {
      setPurchases((previous) => {
        const next = previous.filter((p) => p.id !== id);
        localStorage.setItem(PURCHASES_KEY, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  return { purchases, loaded, addPurchases, removePurchase, persist };
}
