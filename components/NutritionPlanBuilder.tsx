"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DayMealOptions, MEAL_LABELS, MealKey, MealOption, Weekday, WEEKDAY_LABELS_SHORT } from "@/lib/types";
import { isoMonday, fmtDate, addDays } from "@/lib/calculations";
import { useNutritionPlan } from "@/lib/useNutritionPlan";

const WEEKDAYS_LMV: Weekday[] = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
const MEAL_KEYS: MealKey[] = ["des", "alm", "mer", "cen", "col"];
const MAX_OPTIONS = 3;

function emptyOption(): MealOption {
  return { nombre: "", kcal: 0, protein: 0, carbs: 0, fat: 0, explicacion: "" };
}

function countOptions(day: DayMealOptions | undefined): number {
  if (!day) return 0;
  return MEAL_KEYS.reduce((sum, k) => sum + (day[k]?.length || 0), 0);
}

/**
 * Lado NUTRICIONISTA: armar y publicar el Plan Nutricional de UN paciente
 * puntual, semana por semana -- mismo carrusel de 7 días que
 * `TrainingPlanBuilder.tsx` (ya validado con el usuario para fuerza), pero
 * sin selector de rutina: cada comida tiene 2-3 Meal Options escritas a
 * mano (nombre + macros + explicación de cuándo/por qué elegirla, ticket 01
 * del mapa apk-completa) en vez de elegirse de una biblioteca.
 *
 * "Publicar" congela la semana entera de una (no hay ciclo por día como en
 * fuerza -- ver `lib/useNutritionPlan.ts`).
 */
export function NutritionPlanBuilder({ studentId }: { studentId: string }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = useMemo(() => {
    const monday = isoMonday(fmtDate(new Date()));
    return fmtDate(addDays(monday, weekOffset * 7));
  }, [weekOffset]);
  const weekDates = useMemo(() => WEEKDAYS_LMV.map((_, i) => fmtDate(addDays(new Date(`${weekStart}T00:00:00`), i))), [weekStart]);

  const { days, loaded, busy, status, setDay, saveDraft, publish } = useNutritionPlan(true, studentId, weekStart);

  const todayIso = fmtDate(new Date());
  const [selected, setSelected] = useState(0);
  useEffect(() => {
    const idx = weekDates.indexOf(todayIso);
    setSelected(idx >= 0 ? idx : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  const weekLabel = `${weekStart} al ${fmtDate(addDays(new Date(`${weekStart}T00:00:00`), 6))}`;
  const selectedWeekday = WEEKDAYS_LMV[selected];
  const selectedFecha = weekDates[selected];
  const selectedDay = days[selectedWeekday];

  const updateMeal = (mealKey: MealKey, options: MealOption[]) => {
    const nextDay: DayMealOptions = { ...selectedDay, [mealKey]: options.length > 0 ? options : undefined };
    // Sin ninguna comida cargada, no dejamos una entrada vacía colgando.
    const hasAny = MEAL_KEYS.some((k) => (nextDay[k]?.length || 0) > 0);
    setDay(selectedWeekday, hasAny ? nextDay : null);
  };

  const addOption = (mealKey: MealKey) => {
    const current = selectedDay?.[mealKey] || [];
    if (current.length >= MAX_OPTIONS) return;
    updateMeal(mealKey, [...current, emptyOption()]);
  };

  const updateOption = (mealKey: MealKey, index: number, patch: Partial<MealOption>) => {
    const current = selectedDay?.[mealKey] || [];
    updateMeal(
      mealKey,
      current.map((opt, i) => (i === index ? { ...opt, ...patch } : opt))
    );
  };

  const removeOption = (mealKey: MealKey, index: number) => {
    const current = selectedDay?.[mealKey] || [];
    updateMeal(mealKey, current.filter((_, i) => i !== index));
  };

  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState("");

  // Lee el PDF/Word/Excel que el Nutricionista ya usaba con este paciente y
  // lo convierte en Meal Options -- nunca publica solo, solo llena el
  // borrador de esta semana para que se revise/retoque antes de publicar
  // (mismo botón "Publicar" de siempre).
  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImporting(true);
    setImportStatus("Leyendo tu archivo...");
    try {
      const fileDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/parse-nutrition-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileDataUrl, mimeType: file.type }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "No pude leer el archivo.");
      let dias = 0;
      for (const weekday of WEEKDAYS_LMV) {
        if (data[weekday]) {
          setDay(weekday, data[weekday]);
          dias++;
        }
      }
      setImportStatus(dias > 0 ? `Se cargaron ${dias} día${dias === 1 ? "" : "s"} — revisá y ajustá antes de publicar ✓` : "No encontré días reconocibles en el archivo.");
    } catch (e) {
      setImportStatus(e instanceof Error ? e.message : "No pude leer el archivo. Probá con otro, o cargalo a mano.");
    } finally {
      setImporting(false);
      setTimeout(() => setImportStatus(""), 6000);
    }
  };

  if (!loaded) {
    return <div className="text-[12px] text-textMuted">Cargando planificador...</div>;
  }

  return (
    <div>
      <input ref={fileRef} type="file" accept=".pdf,.docx,.xlsx" onChange={handleImportFile} className="hidden" />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={importing}
        className="mb-3 w-full rounded-lg border border-dashed border-gold/50 bg-gold/5 px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-gold disabled:opacity-50"
      >
        {importing ? "Leyendo tu archivo..." : "📄 Importar desde PDF, Word o Excel"}
      </button>
      {importStatus && <div className="mb-3 text-center text-[11px] text-textMuted">{importStatus}</div>}

      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setWeekOffset((o) => o - 1)}
          className="rounded-full border border-border px-2 py-1 font-mono text-[11px] text-textMuted"
        >
          ‹
        </button>
        <div className="text-center">
          <div className="font-mono text-[10px] uppercase tracking-wide text-textMuted">Semana del {weekLabel}</div>
          <div className={`font-mono text-[9px] uppercase tracking-wide ${weekOffset === 0 ? "text-gold" : "text-textMuted"}`}>
            {weekOffset === 0 ? "esta semana" : weekOffset > 0 ? `en ${weekOffset} semana${weekOffset > 1 ? "s" : ""}` : "semana pasada"}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setWeekOffset((o) => o + 1)}
          className="rounded-full border border-border px-2 py-1 font-mono text-[11px] text-textMuted"
        >
          ›
        </button>
      </div>

      {/* Carrusel: un vistazo a toda la semana, tocar un día lo selecciona
          para editar abajo -- mismo patrón que TrainingPlanBuilder. */}
      <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1.5">
        {WEEKDAYS_LMV.map((weekday, i) => {
          const fecha = weekDates[i];
          const n = countOptions(days[weekday]);
          const isToday = fecha === todayIso;
          const isSelected = i === selected;
          return (
            <button
              key={weekday}
              type="button"
              onClick={() => setSelected(i)}
              className={`min-w-[108px] shrink-0 rounded-xl border p-2.5 text-left ${
                isSelected ? "border-gold bg-gold/10" : isToday ? "border-gold/50 bg-gold/5" : "border-border bg-surface"
              }`}
            >
              <div className="font-mono text-[9px] uppercase tracking-wide text-textMuted">
                {WEEKDAY_LABELS_SHORT[weekday]} {new Date(`${fecha}T00:00:00`).getDate()}
              </div>
              <div className={`mt-1.5 text-[12px] font-semibold leading-tight ${n > 0 ? "text-text" : "text-textMuted"}`}>
                {n > 0 ? `${n} opción${n === 1 ? "" : "es"}` : "Sin cargar"}
              </div>
            </button>
          );
        })}
      </div>

      {/* Panel de edición del día seleccionado: una sección por comida, cada
          una con 0-3 tarjetas de Meal Option. */}
      <div className="mt-3 rounded-xl border border-dashed border-gold/40 bg-gold/5 p-3">
        <div className="mb-2 font-mono text-[9px] uppercase tracking-wide text-textMuted">
          Editar {WEEKDAY_LABELS_SHORT[selectedWeekday]} {new Date(`${selectedFecha}T00:00:00`).getDate()}
        </div>

        <div className="space-y-3">
          {MEAL_KEYS.map((mealKey) => {
            const options = selectedDay?.[mealKey] || [];
            return (
              <div key={mealKey} className="rounded-lg border border-border bg-surface p-2.5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wide text-gold">{MEAL_LABELS[mealKey]}</span>
                  {options.length < MAX_OPTIONS && (
                    <button
                      type="button"
                      onClick={() => addOption(mealKey)}
                      className="rounded-full border border-gold/60 bg-gold px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-bg"
                    >
                      + Opción
                    </button>
                  )}
                </div>
                {options.length === 0 ? (
                  <div className="text-[11px] text-textMuted">Sin opciones cargadas.</div>
                ) : (
                  <div className="space-y-2">
                    {options.map((opt, idx) => (
                      <div key={idx} className="rounded-lg border border-border bg-bg/40 p-2">
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <input
                            type="text"
                            placeholder={`Opción ${idx + 1} (ej: Pollo con arroz)`}
                            value={opt.nombre}
                            onChange={(e) => updateOption(mealKey, idx, { nombre: e.target.value })}
                            className="min-w-0 flex-1 text-[13px]"
                          />
                          <button
                            type="button"
                            onClick={() => removeOption(mealKey, idx)}
                            className="shrink-0 font-mono text-[10px] text-rust"
                          >
                            Quitar
                          </button>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          <input
                            type="number"
                            placeholder="kcal"
                            value={opt.kcal || ""}
                            onChange={(e) => updateOption(mealKey, idx, { kcal: Number(e.target.value) || 0 })}
                            className="text-[12px]"
                          />
                          <input
                            type="number"
                            placeholder="prot"
                            value={opt.protein || ""}
                            onChange={(e) => updateOption(mealKey, idx, { protein: Number(e.target.value) || 0 })}
                            className="text-[12px]"
                          />
                          <input
                            type="number"
                            placeholder="carb"
                            value={opt.carbs || ""}
                            onChange={(e) => updateOption(mealKey, idx, { carbs: Number(e.target.value) || 0 })}
                            className="text-[12px]"
                          />
                          <input
                            type="number"
                            placeholder="grasa"
                            value={opt.fat || ""}
                            onChange={(e) => updateOption(mealKey, idx, { fat: Number(e.target.value) || 0 })}
                            className="text-[12px]"
                          />
                        </div>
                        <textarea
                          placeholder="¿Cuándo/por qué elegir esta opción? (ej: si entrenás a la tarde)"
                          value={opt.explicacion}
                          onChange={(e) => updateOption(mealKey, idx, { explicacion: e.target.value })}
                          rows={2}
                          className="mt-1.5 w-full text-[12px]"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => saveDraft()}
          className="flex-1 rounded-lg border border-border bg-bg/60 p-2.5 font-mono text-[11px] uppercase tracking-wide text-textMuted disabled:opacity-50"
        >
          Guardar borrador
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => publish()}
          className="flex-1 rounded-lg bg-gold p-2.5 font-sans text-[13px] font-bold text-bg disabled:opacity-50"
        >
          Publicar
        </button>
      </div>
      {status && <div className="mt-2 text-center font-mono text-[11px] text-textMuted">{status}</div>}
      <div className="mt-2 text-center font-mono text-[9px] text-textMuted">
        Publicar congela la semana completa -- tu paciente la ve entera, no día por día.
      </div>
    </div>
  );
}
