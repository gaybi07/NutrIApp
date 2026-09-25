"use client";

import { DayEntry, INTENSITY_STYLES, MealKey, MEAL_LABELS } from "@/lib/types";
import { dayTotal, dayProt, dayGoal, getTrainingSessions } from "@/lib/calculations";
import { SECTION_HELP } from "@/lib/helpText";
import { Collapsible } from "@/components/Collapsible";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DOW = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

const QUICK_MEALS: MealKey[] = ["des", "alm", "mer", "cen", "col"];
const MEAL_ICON: Record<MealKey, string> = { des: "🌅", alm: "🍽️", mer: "🍎", cen: "🌙", col: "🍫" };

export function TodayCard({
  entry,
  goal,
  tdeeFallback,
  pesoKg,
  onLogMeal,
  onViewMeals,
  onLogSupplements,
  onLogSteps,
  onLogTraining,
}: {
  entry: DayEntry;
  goal: number;
  tdeeFallback: number;
  /** Peso real para escalar el ajuste de gasto por pasos (ver
   * estimateGasto) -- sin esto cae al fallback fijo de siempre. */
  pesoKg: number;
  /** Qué comida se tocó -- antes abría siempre el mismo formulario y ahí
   * adentro había que elegir de un desplegable; ahora se sabe de entrada. */
  onLogMeal: (meal: MealKey) => void;
  /** Ver/editar lo ya cargado hoy, colapsado por comida -- mismo componente
   * que "Modificar comidas de la semana", pero sin tener que bajar hasta esa
   * sección ni elegir el día (ya se sabe que es hoy). */
  onViewMeals: () => void;
  onLogSupplements: () => void;
  onLogSteps: () => void;
  onLogTraining: () => void;
}) {
  const today = new Date(`${entry.fecha}T00:00:00`);
  const dowLabel = DOW[today.getDay()];
  const dowCapitalized = dowLabel.charAt(0).toUpperCase() + dowLabel.slice(1);
  const consumed = dayTotal(entry);
  const adjustedGoal = dayGoal(entry, goal, tdeeFallback, pesoKg);
  const remaining = Math.max(0, adjustedGoal - consumed);
  const protein = dayProt(entry);
  const over = consumed > adjustedGoal;
  const pct = adjustedGoal > 0 ? Math.min(100, Math.round((consumed / adjustedGoal) * 100)) : 0;
  const sessions = getTrainingSessions(entry);
  const intensidad = sessions.length === 1 ? sessions[0].intensidad : entry.entreno ? "moderado" : "ninguno";
  const trainingStyle = INTENSITY_STYLES[intensidad];
  const trainingLabel = sessions.length > 1 ? `${sessions.length} entrenamientos` : trainingStyle.label;
  const mealKcal: Record<MealKey, number> = { des: entry.desK, alm: entry.almK, mer: entry.merK, cen: entry.cenK, col: entry.colK };

  return (
    <Collapsible
      eyebrow="Hoy"
      title={`${dowCapitalized} ${today.getDate()} ${MONTHS[today.getMonth()]}`}
      info={SECTION_HELP.hoy}
      defaultOpen
    >
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="font-sans font-bold text-2xl leading-none text-text">{consumed.toLocaleString("es-AR")}</span>
        <span className="font-mono text-[11px] text-textMuted">de {adjustedGoal.toLocaleString("es-AR")} kcal</span>
      </div>
      <div className="mb-3 h-2.5 w-full overflow-hidden rounded-full border border-border bg-bg/60">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: over ? "rgb(var(--color-rust))" : "rgb(var(--color-accent))" }}
        />
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-textMuted">Restantes</div>
          <div className={`font-sans font-bold text-base leading-tight ${over ? "text-rust" : "text-sage"}`}>
            {remaining.toLocaleString("es-AR")}
          </div>
        </div>
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-textMuted">Proteína</div>
          <div className="font-sans font-bold text-base leading-tight text-text">{protein.toLocaleString("es-AR")}g</div>
        </div>
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-textMuted">Pasos</div>
          <div className="font-sans font-bold text-base leading-tight text-text">{(entry.pasos || 0).toLocaleString("es-AR")}</div>
        </div>
      </div>

      {/* Tamaño fijo (h-16, mismo padding/tipografía siempre) para las 5 --
          antes el texto pasaba de "Desayuno" a "Desayuno ✓" al cargarlo, lo
          que alargaba esa etiqueta y hacía que el botón cambiara de tamaño
          (y de paso quedara distinto a los demás). El check ahora es una
          marca aparte en la esquina, nunca toca el largo del texto. */}
      <div className="grid grid-cols-3 gap-2">
        {QUICK_MEALS.map((meal) => {
          const loaded = mealKcal[meal] > 0;
          return (
            <button
              key={meal}
              type="button"
              onClick={() => onLogMeal(meal)}
              className={`relative flex h-16 flex-col items-center justify-center gap-1 rounded-xl border font-mono text-[10px] uppercase tracking-[0.06em] ${
                loaded ? "border-sage/60 bg-sage/10 text-sage" : "border-gold/60 bg-gold text-bg"
              }`}
            >
              {loaded && (
                <span className="absolute right-1.5 top-1.5 text-[9px] leading-none">✓</span>
              )}
              <span className="text-sm leading-none">{MEAL_ICON[meal]}</span>
              <span>{MEAL_LABELS[meal]}</span>
            </button>
          );
        })}
        {/* Al lado de Colación a propósito -- mismo tamaño fijo que las 5
            comidas, pero no suma kcal/macros: es un check de "lo tomé hoy",
            no algo que pase por la carga de comidas. */}
        <button
          type="button"
          onClick={onLogSupplements}
          className={`relative flex h-16 flex-col items-center justify-center gap-1 rounded-xl border font-mono text-[10px] uppercase tracking-[0.06em] ${
            (entry.suplementos?.length || 0) > 0 ? "border-sage/60 bg-sage/10 text-sage" : "border-gold/60 bg-gold text-bg"
          }`}
        >
          {(entry.suplementos?.length || 0) > 0 && <span className="absolute right-1.5 top-1.5 text-[9px] leading-none">✓</span>}
          <span className="text-sm leading-none">💊</span>
          <span>Suplementos</span>
        </button>
      </div>
      <button
        type="button"
        onClick={onViewMeals}
        className="mt-2 w-full rounded-xl border border-border bg-transparent px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-textMuted"
      >
        📋 Ver comidas cargadas
      </button>
      {/* Pasos y entrenamiento van cada uno en su propio botón -- antes
          compartían uno solo que, apenas cargabas el entrenamiento, dejaba
          de mostrar los pasos del todo (su texto pasaba a ser la intensidad
          del entrenamiento), y no quedaba forma obvia de volver a tocar los
          pasos para corregirlos. */}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onLogSteps}
          className={`rounded-xl border px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] ${
            entry.pasos ? "border-sage/60 bg-sage/10 text-sage" : "border-border bg-transparent text-textMuted"
          }`}
        >
          {entry.pasos ? `${entry.pasos.toLocaleString("es-AR")} pasos` : "+ Pasos"}
        </button>
        <button
          type="button"
          onClick={onLogTraining}
          className={`flex flex-col items-center justify-center gap-0.5 rounded-xl border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] ${
            sessions.length > 0 ? `intensity-${intensidad}` : "bg-sage text-bg border-sage/60"
          }`}
          style={sessions.length > 0 ? { background: trainingStyle.background, color: trainingStyle.color, borderColor: trainingStyle.background } : undefined}
        >
          {sessions.length > 0 ? (
            <>
              {/* Caption + "+" para que se note que se puede volver a tocar
                  y editar/agregar -- antes esto quedaba solo como "Moderado"
                  sin ninguna pista de que era un botón, no un dato fijo. */}
              <span className="text-[8px] tracking-wide opacity-75">Entrenamiento +</span>
              <span className="flex items-center gap-1 text-[11px] font-bold">
                <span className="h-2 w-2 shrink-0 rounded-full bg-current opacity-70" />
                {trainingLabel}
              </span>
            </>
          ) : (
            "+ Entrenamiento"
          )}
        </button>
      </div>
    </Collapsible>
  );
}
