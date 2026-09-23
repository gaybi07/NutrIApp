"use client";

import { useEffect, useState } from "react";
import { LIVE_WORKOUT_STORAGE_KEY, LiveSession, formatElapsed } from "@/components/LiveWorkout";
import { fmtDate } from "@/lib/calculations";

function readActiveSession(): LiveSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LIVE_WORKOUT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LiveSession;
    // Solo mientras dura el día -- un draft viejo de otra fecha no cuenta
    // como "en curso" (LiveWorkout tampoco lo mostraría al volver a entrar).
    return parsed.fecha === fmtDate(new Date()) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Contador fijo del entrenamiento en vivo, visible en CUALQUIER pestaña --
 * antes, salir de "Actividad" desmontaba LiveWorkout y el contador
 * desaparecía hasta volver. Este componente vive en app/page.tsx (fuera del
 * render condicional por pestaña) y lee el mismo localStorage que
 * LiveWorkout ya escribe, sin duplicar ni mover el estado de la sesión --
 * si no hay sesión en curso hoy, no renderiza nada.
 */
export function GlobalWorkoutTimer({ onOpen, hidden }: { onOpen: () => void; hidden?: boolean }) {
  const [session, setSession] = useState<LiveSession | null>(() => readActiveSession());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = () => {
      setSession(readActiveSession());
      setNow(Date.now());
    };
    const id = setInterval(tick, 1000);
    // Al volver de otra pestaña del navegador/app en background, refresca
    // de una en vez de esperar el próximo segundo del interval.
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  if (hidden || !session) return null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="fixed right-3 top-[calc(env(safe-area-inset-top,0px)+8px)] z-40 flex items-center gap-1.5 rounded-full border border-gold bg-bg/95 px-3 py-1.5 shadow-lg backdrop-blur-sm"
    >
      <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-gold" />
      <span className="font-mono text-[11px] font-bold text-gold">{formatElapsed(now - session.startedAt)}</span>
    </button>
  );
}
