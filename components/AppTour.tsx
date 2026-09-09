"use client";

import { useState } from "react";

const STOPS = [
  {
    icon: "📅",
    title: "Hoy",
    text: "Lo primero que vas a ver cada vez que entrás: cuántas kcal llevás consumidas sobre tu objetivo del día (que se ajusta solo según los pasos y el entrenamiento que cargues), más tu proteína y pasos. Los botones \"+ Cargar comida\" y \"+ Entrenamiento\" son el atajo más rápido para registrar todo.",
  },
  {
    icon: "🗓️",
    title: "Semana del…",
    text: "Navegá entre semanas con las flechas. Ahí adentro está el control de tu peso semanal (una vez cargado queda compacto, con la comparación contra la semana anterior y una racha 🔥 si venís cumpliendo seguido), los indicadores agregados de la semana (colapsados, tocá para abrir) y el gráfico de kcal por día, que siempre se ve.",
  },
  {
    icon: "🏆",
    title: "Ranking de días",
    text: "Clasifica cada día según si llegaste a tu objetivo real de proteína diaria (1.3g por cada kilo de tu peso — el piso para no perder masa muscular). Tocá un día para ver el detalle por comida y un consejo concreto de qué mejorar.",
  },
  {
    icon: "🧮",
    title: "Calculadora y carga con IA",
    text: "Volvé a abrir la calculadora si cambia tu peso o tu meta, o cargá una comida contándole a la IA qué comiste (podés dictarlo con el micrófono del teclado). Ahí también está \"Datos\", para importar o exportar un respaldo de toda tu información.",
  },
  {
    icon: "📋",
    title: "Tabla de la semana",
    text: "El detalle día por día: kcal, proteína, déficit, pasos y entrenamiento. Tocá el círculo de color de un día para cambiar la intensidad de entrenamiento de ese día puntual.",
  },
  {
    icon: "👣",
    title: "Pasos de la semana",
    text: "Si un día se te pasó cargar los pasos desde \"Hoy\", acá podés completarlos para cualquier día de la semana que estés mirando.",
  },
  {
    icon: "🛒",
    title: "Compras / Ticket",
    text: "Registrá lo que compraste — a mano o sacándole una foto al ticket — para armar tu inventario de la despensa. El Planner de cocina de abajo usa ese inventario para sugerirte recetas.",
  },
  {
    icon: "🍳",
    title: "Planner de cocina",
    text: "Recetas armadas con lo que tenés en el inventario. Al usar una, se descuentan los ingredientes automáticamente y podés sumarla directo a una comida de tu día.",
  },
];

export function AppTour({ onFinish }: { onFinish: () => void }) {
  const [index, setIndex] = useState(0);
  const stop = STOPS[index];
  const isLast = index === STOPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/90 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-gold/40 bg-surface p-4 shadow-2xl">
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
        <div className="mb-2 text-3xl">{stop.icon}</div>
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
            className="flex-1 rounded-lg p-2.5 font-sans font-bold text-sm"
            style={{ background: "#C9A227", color: "#1C1B18" }}
          >
            {isLast ? "Empezar a usar la app" : "Siguiente"}
          </button>
        </div>

        <div className="mt-3 flex justify-center gap-1.5">
          {STOPS.map((_, i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: i === index ? "#C9A227" : "rgba(255,255,255,0.15)" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
