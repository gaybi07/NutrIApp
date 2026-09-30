"use client";

import { Lock } from "lucide-react";
import { MainTab } from "@/lib/types";

export type { MainTab };

const TABS: { id: MainTab; label: string }[] = [
  { id: "inicio", label: "Inicio" },
  { id: "alacena", label: "Alacena" },
  { id: "comidas", label: "Comidas" },
  { id: "macros", label: "Macros" },
  { id: "actividad", label: "Entreno" },
  { id: "gastos", label: "Gastos" },
  { id: "profesionales", label: "Profesionales" },
  { id: "entrenador", label: "Entrenador" },
  { id: "nutricionista", label: "Nutricion" },
];

export function TabBar({
  active,
  onChange,
  enabledTabs,
  lockedTabs,
}: {
  active: MainTab;
  onChange: (tab: MainTab) => void;
  /** Solapas visibles además de Inicio (que siempre se muestra). Si no se pasa, se muestran todas. */
  enabledTabs?: MainTab[];
  /** Solapas que el plan actual tiene bloqueadas: se ven con candado y al tocarlas muestran qué desbloquean. */
  lockedTabs?: MainTab[];
}) {
  const tabs = TABS.filter((tab) => tab.id === "inicio" || !enabledTabs || enabledTabs.includes(tab.id));

  return (
    // Carrusel, no una fila que se achica: cada solapa tiene un ancho fijo
    // (entra el texto sin cortarse) y la tira entera se desliza horizontal
    // cuando no entran todas -- antes usaban flex-1 y se apretaban cada vez
    // más chico a medida que se agregaban solapas nuevas (Entrenador,
    // Nutricionista), hasta no entrar más en un celular.
    <div
      className="tabbar-scroll -mx-3 flex gap-1 overflow-x-auto border-b border-border bg-bg/95 px-3 py-2 backdrop-blur lg:mx-0 lg:rounded-xl lg:border lg:bg-surface/70 lg:px-2"
      style={{ scrollbarWidth: "none" }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`tabbar-label min-w-[76px] shrink-0 rounded-lg px-2 py-2 text-center font-mono uppercase tracking-normal transition-colors ${
            active === tab.id ? "bg-gold text-white" : "text-textMuted"
          }`}
        >
          {lockedTabs?.includes(tab.id) ? (
            <span className="inline-flex items-center justify-center gap-1">
              <Lock size={11} strokeWidth={1.8} /> {tab.label}
            </span>
          ) : (
            tab.label
          )}
        </button>
      ))}
    </div>
  );
}
