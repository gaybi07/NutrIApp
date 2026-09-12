"use client";

import { MainTab } from "@/lib/types";

export type { MainTab };

const TABS: { id: MainTab; label: string }[] = [
  { id: "inicio", label: "Inicio" },
  { id: "comidas", label: "Comidas" },
  { id: "macros", label: "Macros" },
  { id: "actividad", label: "Entreno" },
];

export function TabBar({
  active,
  onChange,
  enabledTabs,
}: {
  active: MainTab;
  onChange: (tab: MainTab) => void;
  /** Solapas visibles además de Inicio (que siempre se muestra). Si no se pasa, se muestran todas. */
  enabledTabs?: MainTab[];
}) {
  const tabs = TABS.filter((tab) => tab.id === "inicio" || !enabledTabs || enabledTabs.includes(tab.id));

  return (
    <div className="sticky top-0 z-30 mb-4 -mx-3 flex gap-1 border-b border-border bg-bg/95 px-3 py-2 backdrop-blur lg:mx-0 lg:rounded-xl lg:border lg:bg-surface/70 lg:px-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`tabbar-label min-w-0 flex-1 truncate rounded-lg px-1.5 py-2 text-center font-mono uppercase tracking-normal transition-colors ${
            active === tab.id ? "bg-gold text-bg" : "text-textMuted"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
