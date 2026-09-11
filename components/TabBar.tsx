"use client";

export type MainTab = "inicio" | "macros" | "actividad";

const TABS: { id: MainTab; label: string }[] = [
  { id: "inicio", label: "Inicio" },
  { id: "macros", label: "Macros" },
  { id: "actividad", label: "Actividad" },
];

export function TabBar({ active, onChange }: { active: MainTab; onChange: (tab: MainTab) => void }) {
  return (
    <div className="sticky top-0 z-30 mb-4 -mx-3 flex gap-1 border-b border-border bg-bg/95 px-3 py-2 backdrop-blur lg:mx-0 lg:rounded-xl lg:border lg:bg-surface/70 lg:px-2">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`flex-1 rounded-lg px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors ${
            active === tab.id ? "bg-gold text-bg" : "text-textMuted"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
