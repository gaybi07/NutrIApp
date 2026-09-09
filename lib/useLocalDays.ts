"use client";

import { useEffect, useState, useCallback } from "react";
import { DayEntry, Settings } from "./types";
import { isSupabaseConfigured } from "./supabase/browser";

const DAYS_KEY = "registro:days:v1";
const SETTINGS_KEY = "registro:settings:v1";

const DEFAULT_SETTINGS: Settings = { goal: 2400, tdeeFallback: 3200, weeklyWeights: {} };

/**
 * Persistencia MVP con localStorage.
 *
 * NOTA (ver spec de producto, sección "Roadmap Fase 1"): esto es temporal.
 * Para producto real hace falta backend + cuenta de usuario, así los datos
 * sincronizan entre dispositivos. Reemplazar este hook por llamadas a una
 * API propia sin tener que tocar los componentes que lo consumen (misma firma).
 */
export function useLocalDays() {
  const [days, setDays] = useState<DayEntry[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (isSupabaseConfigured) {
      fetch("/api/data")
        .then(async (response) => {
          if (!response.ok) {
            let detail = `HTTP ${response.status}`;
            try {
              const body = await response.json();
              if (body?.error) detail = body.error;
            } catch {
              // la respuesta no era JSON, nos quedamos con el código HTTP
            }
            throw new Error(detail);
          }
          return response.json();
        })
        .then((data: { days: DayEntry[]; settings: Settings }) => {
          setDays(data.days);
          setSettings(data.settings);
          setSyncError(null);
        })
        .catch((e) => {
          const detail = e instanceof Error ? e.message : "error desconocido";
          setSyncError(
            `No se pudo traer tus datos de la nube (${detail}) — estás viendo la copia guardada en este dispositivo.`
          );
          loadLocalData();
        })
        .finally(() => setLoaded(true));
      return;
    }

    loadLocalData();
  }, []);

  const loadLocalData = () => {
    try {
      const rawDays = localStorage.getItem(DAYS_KEY);
      let nextDays: DayEntry[] = [];

      if (rawDays) {
        nextDays = JSON.parse(rawDays);
      }

      setDays(nextDays);

      const rawSettings = localStorage.getItem(SETTINGS_KEY);
      const nextSettings = rawSettings ? JSON.parse(rawSettings) : DEFAULT_SETTINGS;
      if (!rawSettings) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
      }
      setSettings(nextSettings);
    } catch (e) {
      console.error("Error cargando datos locales", e);
      setDays([]);
      setSettings(DEFAULT_SETTINGS);
    }
    setLoaded(true);
  };

  const saveDays = useCallback((next: DayEntry[]) => {
    const sorted = [...next].sort((a, b) => a.fecha.localeCompare(b.fecha));
    setDays(sorted);
    try {
      localStorage.setItem(DAYS_KEY, JSON.stringify(sorted));
    } catch (e) {
      console.error("Error guardando días", e);
    }
    if (isSupabaseConfigured) {
      return fetch("/api/data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: sorted }),
      }).then((response) => {
        if (!response.ok) throw new Error("No se pudieron guardar los días en Supabase");
      });
    }
  }, []);

  const upsertDay = useCallback(
    (entry: DayEntry) => {
      setDays((prev) => {
        const idx = prev.findIndex((d) => d.fecha === entry.fecha);
        const next = idx >= 0 ? [...prev.slice(0, idx), entry, ...prev.slice(idx + 1)] : [...prev, entry];
        const sorted = next.sort((a, b) => a.fecha.localeCompare(b.fecha));
        try {
          localStorage.setItem(DAYS_KEY, JSON.stringify(sorted));
        } catch (e) {
          console.error("Error guardando día", e);
        }
        return sorted;
      });
      if (isSupabaseConfigured) {
        fetch("/api/data", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ day: entry }),
        })
          .then((response) => {
            if (!response.ok) throw new Error("No se pudo guardar el día en la nube");
            setSyncError(null);
          })
          .catch((e) => {
            console.error("Error guardando día remoto", e);
            setSyncError("No se pudo guardar en la nube. El cambio quedó solo en este dispositivo.");
          });
      }
    },
    []
  );

  const saveSettings = useCallback((next: Settings) => {
    setSettings(next);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch (e) {
      console.error("Error guardando ajustes", e);
    }
    if (isSupabaseConfigured) {
      fetch("/api/data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: next }),
      })
        .then((response) => {
          if (!response.ok) throw new Error("No se pudieron guardar los ajustes en la nube");
          setSyncError(null);
        })
        .catch((e) => {
          console.error("Error guardando ajustes remotos", e);
          setSyncError("No se pudo guardar en la nube. El cambio quedó solo en este dispositivo.");
        });
    }
  }, []);

  return { days, settings, loaded, syncError, saveDays, upsertDay, saveSettings };
}
