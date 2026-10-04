"use client";

import { MonthStandard } from "@/lib/monthStandard";
import { STATUS_BG } from "@/components/WeekGoalGrid";
import { ProteinSymbol } from "@/components/DayCell";

const NAME = { violeta: "Violeta", verde: "Verde", amarillo: "Amarillo", rojo: "Rojo" } as const;

/**
 * Estandarte de un mes: un patrón con una barra por cada día cerrado. El FONDO de cada barra es cómo salió en kilocalorías y
 * la FRANJA DE ARRIBA cómo salió en proteína, separadas por una línea blanca (igual que los cuadraditos de cada día). Arriba
 * de todo se resume el mes entero en los dos colores.
 */
export function MonthBanner({ standard }: { standard: MonthStandard }) {
  const { daysDetail, kcalStatus, proteinStatus, kcalOk, proteinOk, counted } = standard;
  return (
    <div>
      <div className="flex h-16 gap-[2px] overflow-hidden rounded-lg bg-white p-[2px]">
        {daysDetail.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-md bg-bg/60 text-[11px] text-textMuted">Sin días cerrados todavía</div>
        ) : (
          daysDetail.map((d) => (
            <div key={d.fecha} className="flex min-w-[3px] flex-1 flex-col gap-[2px]" title={d.fecha}>
              <div className="h-[34%] rounded-t-sm" style={{ background: STATUS_BG[d.protein] }} />
              <div className="flex-1 rounded-b-sm" style={{ background: STATUS_BG[d.kcal] }} />
            </div>
          ))
        )}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
        <div className="flex items-center gap-2">
          <span className="inline-block h-4 w-4 shrink-0 rounded" style={kcalStatus ? { background: STATUS_BG[kcalStatus] } : { border: "1px dashed rgb(var(--color-text-muted))" }} />
          <span>
            <span className="block font-mono text-[9px] uppercase tracking-wide text-textMuted">Kilocalorías (fondo)</span>
            {kcalStatus ? `${NAME[kcalStatus]} · ${kcalOk} de ${counted} días en objetivo` : "Juntando datos"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border bg-white"
            style={{ color: proteinStatus ? STATUS_BG[proteinStatus] : "rgb(var(--color-text-muted))" }}
          >
            {proteinStatus ? <ProteinSymbol status={proteinStatus} size={9} /> : null}
          </span>
          <span>
            <span className="block font-mono text-[9px] uppercase tracking-wide text-textMuted">Proteína (franja)</span>
            {proteinStatus ? `${NAME[proteinStatus]} · ${proteinOk} de ${counted} días al 95% o más` : "Juntando datos"}
          </span>
        </div>
      </div>
    </div>
  );
}
