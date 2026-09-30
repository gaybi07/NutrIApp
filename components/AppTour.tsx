"use client";

import { useState } from "react";
import { useEscapeKey } from "@/lib/useEscapeKey";
import { SECTION_HELP } from "@/lib/helpText";
import {
  Hand,
  CalendarDays,
  Trophy,
  ClipboardList,
  Footprints,
  Package,
  Salad,
  Dumbbell,
  Calculator,
  Settings,
  LucideIcon,
} from "lucide-react";

const STOPS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Hand, title: "Bienvenido", text: SECTION_HELP.bienvenida },
  { icon: CalendarDays, title: "Inicio · Hoy", text: SECTION_HELP.hoy },
  { icon: CalendarDays, title: "Inicio · Semana del…", text: SECTION_HELP.semana },
  { icon: Trophy, title: "Inicio · Ranking de días", text: SECTION_HELP.ranking },
  { icon: ClipboardList, title: "Inicio · Tabla de la semana", text: SECTION_HELP.tabla },
  { icon: Footprints, title: "Inicio · Pasos de la semana", text: SECTION_HELP.pasos },
  { icon: Package, title: "Comidas · Alacena", text: SECTION_HELP.comidasAlacena },
  { icon: CalendarDays, title: "Comidas · Planificado", text: SECTION_HELP.comidasPlanificado },
  { icon: Salad, title: "Macros", text: SECTION_HELP.macros },
  { icon: Dumbbell, title: "Entreno", text: SECTION_HELP.actividad },
  { icon: Calculator, title: "Calculadora y carga con IA", text: SECTION_HELP.herramientas },
  { icon: Settings, title: "Configuraciones", text: SECTION_HELP.configuraciones },
  { icon: Hand, title: "Ocultar y mover secciones", text: SECTION_HELP.ocultarMover },
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
        <div className="mb-2">
          <stop.icon size={24} strokeWidth={1.8} />
        </div>
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
            className="flex-1 rounded-lg p-2.5 font-sans font-bold text-sm bg-gold text-white"
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
