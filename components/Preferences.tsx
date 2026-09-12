"use client";

import { Settings, ThemeMode, MainTab, OPTIONAL_TABS, DEFAULT_ENABLED_TABS, FontSize, FONT_SIZE_OPTIONS, resolveOrder } from "@/lib/types";

const THEME_OPTIONS: { value: ThemeMode; label: string; description: string }[] = [
  { value: "oscuro", label: "Oscuro", description: "Fondo oscuro, como está ahora." },
  { value: "claro", label: "Claro", description: "Fondo blanco, look más liviano." },
  { value: "neon", label: "Neón", description: "Todo en negros y grises, con detalles de letras, botones y gráficos en verde, rosa y amarillo flúor." },
];

const TAB_LABELS: Record<MainTab, string> = {
  inicio: "Inicio",
  comidas: "Comidas",
  macros: "Macros",
  actividad: "Entrenamientos",
};

/** Elegir el tema (oscuro/claro/neón) — separado del resto de Preferencias
 * para que el menú del engranaje lleve directo a esto, sin pasar por un
 * panel único con todo junto. */
export function ThemeSettings({ settings, onSave }: { settings: Settings; onSave: (settings: Settings) => void }) {
  const theme = settings.theme || "oscuro";
  const setTheme = (value: ThemeMode) => onSave({ ...settings, theme: value });

  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold mb-1">Preferencias</div>
      <h2 className="font-display text-xl leading-none mb-4">Tema</h2>
      <div className="flex flex-col gap-2">
        {THEME_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
              theme === opt.value ? "border-gold bg-gold/10" : "border-border"
            }`}
          >
            <div className={`font-sans text-sm font-bold ${theme === opt.value ? "text-gold" : "text-text"}`}>{opt.label}</div>
            <div className="text-[11px] text-textMuted mt-0.5">{opt.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function FontSizeSettings({ settings, onSave }: { settings: Settings; onSave: (settings: Settings) => void }) {
  const fontSize = settings.fontSize || "chico";
  const setFontSize = (value: FontSize) => onSave({ ...settings, fontSize: value });

  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold mb-1">Preferencias</div>
      <h2 className="font-display text-xl leading-none mb-4">Tamaño de letra</h2>
      <div className="flex flex-col gap-2">
        {FONT_SIZE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setFontSize(opt.value)}
            className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
              fontSize === opt.value ? "border-gold bg-gold/10" : "border-border"
            }`}
          >
            <div
              className={`font-sans font-bold ${fontSize === opt.value ? "text-gold" : "text-text"}`}
              style={{ fontSize: opt.previewPx }}
            >
              {opt.label}
            </div>
            <div className="text-[11px] text-textMuted mt-0.5">{opt.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function TabsSettings({ settings, onSave }: { settings: Settings; onSave: (settings: Settings) => void }) {
  const enabledTabs = resolveOrder(settings.enabledTabs, DEFAULT_ENABLED_TABS);
  const toggleTab = (tab: MainTab) => {
    const has = enabledTabs.includes(tab);
    const next = has ? enabledTabs.filter((t) => t !== tab) : [...enabledTabs, tab];
    onSave({ ...settings, enabledTabs: next });
  };

  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold mb-1">Preferencias</div>
      <h2 className="font-display text-xl leading-none mb-4">Solapas</h2>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 opacity-60">
          <span className="font-sans text-sm text-text">Inicio</span>
          <span className="font-mono text-[9px] uppercase tracking-wide text-textMuted">Siempre activa</span>
        </div>
        {OPTIONAL_TABS.map((tab) => {
          const active = enabledTabs.includes(tab);
          return (
            <button
              key={tab}
              type="button"
              onClick={() => toggleTab(tab)}
              className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors ${
                active ? "border-gold/60 bg-gold/10" : "border-border"
              }`}
            >
              <span className={`font-sans text-sm ${active ? "text-text" : "text-textMuted"}`}>{TAB_LABELS[tab]}</span>
              <span className={`font-mono text-[9px] uppercase tracking-wide ${active ? "text-gold" : "text-textMuted"}`}>
                {active ? "✓ Activa" : "Oculta"}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-2 text-[11px] text-textMuted">
        Elegí qué solapas ver arriba de todo, además de Inicio. Podés cambiarlo cuando quieras.
      </div>
    </div>
  );
}

export function ToolsSettings({
  onOpenCalc,
  onOpenAI,
  onOpenDatos,
}: {
  onOpenCalc: () => void;
  onOpenAI: () => void;
  onOpenDatos: () => void;
}) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold mb-1">Preferencias</div>
      <h2 className="font-display text-xl leading-none mb-4">Herramientas</h2>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onOpenCalc}
          className="rounded-xl border border-border bg-surfaceAlt px-2 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-text"
        >
          Objetivo
        </button>
        <button
          type="button"
          onClick={onOpenAI}
          className="rounded-xl border border-border bg-surfaceAlt px-2 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-text"
        >
          Cargar con IA
        </button>
        <button
          type="button"
          onClick={onOpenDatos}
          className="col-span-2 rounded-xl border border-border bg-surfaceAlt px-2 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-text"
        >
          Datos
        </button>
      </div>
    </div>
  );
}
