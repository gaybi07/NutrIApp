"use client";

import { MouseEvent, useEffect, useState } from "react";
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

function writeSession(session: LiveSession) {
  window.localStorage.setItem(LIVE_WORKOUT_STORAGE_KEY, JSON.stringify(session));
}

/**
 * Barra fija del entrenamiento en vivo, visible en CUALQUIER pestaña --
 * antes, salir de "Actividad" desmontaba LiveWorkout y el contador
 * desaparecía hasta volver. Vive en app/page.tsx (fuera del render
 * condicional por pestaña) y lee/escribe el mismo localStorage que
 * LiveWorkout ya usa, sin duplicar el estado de la sesión -- si no hay
 * sesión en curso hoy, no renderiza nada. Grande y con texto explícito a
 * propósito (no una pastilla chica) para no depender de que se "descubra";
 * incluye pausar/reanudar acá mismo, para no tener que entrar a Actividad
 * solo para eso (ej. ir al baño a mitad de entrenamiento).
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

  const isPaused = Boolean(session.pausedAt);
  const elapsedLabel = formatElapsed((session.pausedAt ?? now) - session.startedAt);

  const togglePause = (event: MouseEvent) => {
    event.stopPropagation();
    const next: LiveSession = session.pausedAt
      ? { ...session, startedAt: session.startedAt + (Date.now() - session.pausedAt), pausedAt: undefined }
      : { ...session, pausedAt: Date.now() };
    writeSession(next);
    setSession(next);
  };

  return (
    <div
      className="fixed inset-x-3 z-40 flex items-center gap-2 rounded-2xl border border-gold bg-surface px-3 py-2.5 shadow-2xl"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
    >
      <button type="button" onClick={togglePause} className="shrink-0 rounded-full border border-gold/50 p-2 text-gold" aria-label={isPaused ? "Seguir" : "Pausar"}>
        {isPaused ? "▶" : "⏸"}
      </button>
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left">
        <span className="min-w-0">
          <span className="block font-mono text-[8.5px] uppercase tracking-wide text-textMuted">
            {isPaused ? "Entrenamiento en pausa" : "Entrenamiento en curso"}
          </span>
          <span className={`block font-mono text-lg font-bold tabular-nums ${isPaused ? "text-gold" : "text-text"}`}>{elapsedLabel}</span>
        </span>
        <span className="shrink-0 rounded-lg bg-gold px-3 py-2 font-sans text-[12px] font-bold text-bg">Volver ›</span>
      </button>
    </div>
  );
}
