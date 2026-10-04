"use client";

import { useState } from "react";
import { MonthStandard } from "@/lib/monthStandard";
import { BANNER_PATTERNS, BannerArt, BannerPattern, BannerStyles, isStyleLocked, patternFor } from "@/components/MonthBanner";
import { STATUS_BG } from "@/components/WeekGoalGrid";
import { btn } from "@/components/buttonStyles";
import { useEscapeKey } from "@/lib/useEscapeKey";

const MONTH_NAMES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/**
 * Diseñá tu estandarte: se ve el estandarte del mes con el estilo elegido y una galería de estilos. Se guarda para ese mes o
 * para todos los meses, y una vez guardado no se puede volver a cambiar.
 */
export function StandardDesigner({
  standard,
  styles,
  onSave,
  onClose,
}: {
  standard: MonthStandard;
  styles: BannerStyles;
  onSave: (scope: "mes" | "todos", pattern: BannerPattern) => void;
  onClose: () => void;
}) {
  useEscapeKey(onClose, true);
  const locked = isStyleLocked(styles, standard.month);
  const current = patternFor(styles, standard.month);
  const [pick, setPick] = useState<BannerPattern>(current);
  const [confirm, setConfirm] = useState<"mes" | "todos" | null>(null);
  const name = MONTH_NAMES[Number(standard.month.slice(5)) - 1];
  // Sin datos suficientes se muestra con colores de ejemplo para poder diseñar igual.
  const bg = standard.kcalStatus ? STATUS_BG[standard.kcalStatus] : STATUS_BG.verde;
  const line = standard.proteinStatus ? STATUS_BG[standard.proteinStatus] : STATUS_BG.amarillo;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-bg/80 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-md flex-col rounded-t-2xl border border-border bg-surface shadow-2xl sm:rounded-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-2 border-b border-border p-4 pb-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">Diseñá tu estandarte</div>
            <div className="font-display text-xl capitalize text-text">{name}</div>
          </div>
          <button type="button" onClick={onClose} className={btn("neutral", "sm")}>
            Cerrar
          </button>
        </div>

        <div className="overflow-y-auto p-4 pt-3">
          <BannerArt pattern={pick} lineColor={line} background={bg} />
          {!standard.kcalStatus && <div className="mt-1 text-[11px] text-textMuted">Colores de ejemplo: los reales se calculan con 7 días cerrados.</div>}

          {locked ? (
            <div className="mt-3 rounded-lg border border-gold/40 bg-gold/5 px-3 py-2 text-[12px] text-text">
              🔒 Este mes ya tiene su estilo guardado ({BANNER_PATTERNS.find((p) => p.id === current)?.label}). Una vez guardado no se puede cambiar.
            </div>
          ) : (
            <div className="mt-3 text-[12px] text-textMuted">Elegí un estilo. Cuando lo guardes, queda fijo.</div>
          )}

          <div className="mt-2 grid grid-cols-3 gap-2">
            {BANNER_PATTERNS.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={locked}
                onClick={() => setPick(p.id)}
                className={`rounded-lg border p-1 text-left ${pick === p.id ? "border-gold bg-gold/10" : "border-border"} ${locked && pick !== p.id ? "opacity-40" : ""}`}
              >
                <div className="pointer-events-none origin-top-left scale-100">
                  <BannerArt pattern={p.id} lineColor={line} background={bg} />
                </div>
                <div className="mt-1 text-center font-mono text-[9px] uppercase tracking-wide text-textMuted">{p.label}</div>
              </button>
            ))}
          </div>

          {!locked && (
            <div className="mt-4 space-y-2">
              {confirm ? (
                <div className="rounded-xl border border-rust/50 bg-rust/10 p-2.5">
                  <div className="text-[12px] text-text">
                    {confirm === "mes"
                      ? `¿Seguro? Se guarda "${BANNER_PATTERNS.find((p) => p.id === pick)?.label}" para ${name} y no se puede cambiar después.`
                      : `¿Seguro? Se guarda "${BANNER_PATTERNS.find((p) => p.id === pick)?.label}" para todos los meses y no se puede cambiar después.`}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setConfirm(null)} className={btn("neutral", "sm", true)}>
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onSave(confirm, pick);
                        setConfirm(null);
                      }}
                      className={btn("primary", "sm", true)}
                    >
                      Sí, guardar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button type="button" onClick={() => setConfirm("mes")} className={btn("primary", "md", true)}>
                    Guardar para este mes
                  </button>
                  <button type="button" onClick={() => setConfirm("todos")} className={btn("secondary", "md", true)}>
                    Guardar para todos los meses
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
