import { DayEntry } from "@/lib/types";
import { dayTotal, dayProt, dayDeficit } from "@/lib/calculations";

const DOW = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function Ledger({
  weekDates,
  weekDays,
  goal,
  tdeeFallback,
}: {
  weekDates: string[];
  weekDays: (DayEntry | null)[];
  goal: number;
  tdeeFallback: number;
}) {
  const anyData = weekDays.some((d) => d);

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden mb-4">
      <div className="grid grid-cols-[1.1fr_0.85fr_0.75fr_0.85fr_0.8fr_0.6fr] px-3 py-2 font-mono text-[8.5px] uppercase tracking-wide text-textMuted border-b border-border">
        <span>Día</span><span>Kcal</span><span>Prot.</span><span>Déficit</span><span>Pasos</span><span>Entr.</span>
      </div>
      {!anyData && <div className="p-6 text-center text-textMuted text-sm">Sin datos esta semana.</div>}
      {anyData &&
        weekDates.map((fecha, i) => {
          const d = weekDays[i];
          const dateObj = new Date(`${fecha}T00:00:00`);
          const total = d ? dayTotal(d) : null;
          const prot = d ? dayProt(d) : null;
          const deficit = d ? dayDeficit(d, tdeeFallback) : null;
          const overClass = total !== null ? (total > goal ? "text-rust" : "text-sage") : "";
          const deficitClass = deficit !== null ? (deficit >= 0 ? "text-sage" : "text-rust") : "";

          return (
            <div
              key={fecha}
              className={`grid grid-cols-[1.1fr_0.85fr_0.75fr_0.85fr_0.8fr_0.6fr] px-3 py-3 items-center border-b border-dashed border-border last:border-0 font-mono text-[11.5px] ${d?.entreno ? "bg-gold/[0.07]" : ""}`}
            >
              <span className="font-sans font-medium text-[12px]">
                {dateObj.getDate()} {MONTHS[dateObj.getMonth()]}
                <span className="block font-mono text-[9px] text-textMuted uppercase">{DOW[dateObj.getDay()]}</span>
              </span>
              <span className={overClass}>{total !== null ? total.toLocaleString("es-AR") : "—"}</span>
              <span>{prot !== null ? `${prot.toLocaleString("es-AR")}g` : "—"}</span>
              <span className={deficitClass}>{deficit !== null ? `${deficit >= 0 ? "+" : ""}${deficit.toLocaleString("es-AR")}` : "—"}</span>
              <span>{d?.pasos ? d.pasos.toLocaleString("es-AR") : "—"}</span>
              <span className={`text-center font-bold ${d?.entreno ? "text-gold" : "text-border"}`}>{d?.entreno ? "✓" : "–"}</span>
            </div>
          );
        })}
    </div>
  );
}
