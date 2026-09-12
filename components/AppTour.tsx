"use client";

import { useState } from "react";
import { useEscapeKey } from "@/lib/useEscapeKey";
import { SECTION_HELP } from "@/lib/helpText";

const STOPS = [
  { icon: "📅", title: "Hoy", text: SECTION_HELP.hoy },
  { icon: "🗓️", title: "Semana del…", text: SECTION_HELP.semana },
  { icon: "🏆", title: "Ranking de días", text: SECTION_HELP.ranking },
  { icon: "🧮", title: "Calculadora y carga con IA", text: SECTION_HELP.herramientas },
  { icon: "📋", title: "Tabla de la semana", text: SECTION_HELP.tabla },
  { icon: "👣", title: "Pasos de la semana", text: SECTION_HELP.pasos },
  { icon: "🛒", title: "Compras / Ticket", text: SECTION_HELP.compras },
  { icon: "🍳", title: "Planner de cocina", text: SECTION_HELP.recetas },
];

export function AppTour({ onFinish }: { onFinish: () => void }) {
  const [index, setIndex] = useState(0);
  const stop = STOPS[index];
  const isLast = index === STOPS.length - 1;
  useEscapeKey(onFinish, true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/90 p-4 backdrop-blur-sm" onClick={onFinish}>
      <div className="relative w-full max-w-md rounded-2xl border border-gold/40 bg-surface p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          onClick={onFinish}
          className="absolute right-3 top-3 font-mono text-[9px] uppercase tracking-wide text-textMuted underline"
        >
          Saltear tour
        </button>

        <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
          Recorrido {index + 1} de {STOPS.length}
        </div>
        <div className="mb-2 text-3xl">{stop.icon}</div>
        <h2 className="mb-2 font-display text-xl text-text">{stop.title}</h2>
        <p className="text-[13px] leading-relaxed text-textMuted">{stop.text}</p>

        <div className="mt-4 flex gap-2">
          {index > 0 && (
            <button
              type="button"
              onClick={() => setIndex((i) => i - 1)}
              className="rounded-lg border border-border px-3 py-2.5 font-mono text-[10px] uppercase tracking-wide text-textMuted"
            >
              Atrás
            </button>
          )}
          <button
            type="button"
            onClick={() => (isLast ? onFinish() : setIndex((i) => i + 1))}
            className="flex-1 rounded-lg p-2.5 font-sans font-bold text-sm bg-gold text-bg"
          >
            {isLast ? "Empezar a usar la app" : "Siguiente"}
          </button>
        </div>

        <div className="mt-3 flex justify-center gap-1.5">
          {STOPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full ${i === index ? "bg-gold" : "bg-border"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
