"use client";

import { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useStudentMetrics } from "@/lib/useStudentMetrics";
import { useStudentDetail } from "@/lib/useStudentDetail";
import { useTrainerIncidents } from "@/lib/useRoutineIncidents";
import { useTrainerComments } from "@/lib/useTrainerComments";
import { isoMonday, fmtDate, addDays, weekdayOf } from "@/lib/calculations";
import { StudentMetrics, StudentDayDetail, RoutineIncident, RoutineIncidentType } from "@/lib/types";

const INCIDENT_LABEL: Record<RoutineIncidentType, string> = {
  omitido: "Omitido",
  reemplazado: "Reemplazado",
  comentario: "Comentario",
  comentario_final: "Comentario final",
  serie_adicional: "Serie adicional",
  ejercicio_fuera_de_plan: "Ejercicio fuera de plan",
};

const DOW_SHORT: Record<string, string> = {
  lunes: "Lun",
  martes: "Mar",
  miercoles: "Mié",
  jueves: "Jue",
  viernes: "Vie",
  sabado: "Sáb",
  domingo: "Dom",
};

type Tab = "resumen" | "entrenamientos" | "incidencias" | "nutricion" | "peso" | "comentarios";

const TABS: { id: Tab; label: string }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "entrenamientos", label: "Entrenamientos" },
  { id: "incidencias", label: "Incidencias" },
  { id: "nutricion", label: "Nutrición" },
  { id: "peso", label: "Peso" },
  { id: "comentarios", label: "Comentarios" },
];

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg/40 p-2">
      <div className="font-mono text-[8.5px] uppercase tracking-wide text-textMuted">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-text">{value}</div>
    </div>
  );
}

/** Lo primero que se ve al abrir la pantalla -- todo lo necesario para
 * entender el estado del alumno de un vistazo, sin tocar nada. */
function ResumenTab({ metrics }: { metrics: StudentMetrics | null }) {
  if (!metrics) return <div className="text-[12px] text-textMuted">Calculando...</div>;
  const fmt = (value: number | null, suffix = "") => (value == null ? "—" : `${value}${suffix}`);
  const cambioPeso =
    metrics.cambioPeso == null ? "—" : `${metrics.cambioPeso > 0 ? "+" : ""}${metrics.cambioPeso.toFixed(1)}kg`;
  const adherenciaColor =
    metrics.adherenciaSemanal == null
      ? "text-textMuted"
      : metrics.adherenciaSemanal >= 80
        ? "text-sage"
        : metrics.adherenciaSemanal >= 50
          ? "text-gold"
          : "text-rust";
  return (
    <div>
      <div className="mb-3 rounded-xl border border-border bg-bg/40 p-3 text-center">
        <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-textMuted">Adherencia esta semana</div>
        <div className={`mt-1 font-display text-3xl ${adherenciaColor}`}>{fmt(metrics.adherenciaSemanal, "%")}</div>
        <div className="mt-0.5 font-mono text-[10px] text-textMuted">
          {metrics.entrenosRealizados} de {metrics.entrenosPlanificados} entrenos asignados
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <MetricCard label="Peso actual" value={fmt(metrics.pesoActual, "kg")} />
        <MetricCard label="Cambio vs. semana ant." value={cambioPeso} />
        <MetricCard label="Proteína promedio" value={fmt(metrics.proteinaPromedio, "g")} />
        <MetricCard label="Pasos promedio" value={fmt(metrics.pasosPromedio)} />
        <MetricCard label="Volumen semanal" value={fmt(Math.round(metrics.volumenSemanal), "kg")} />
      </div>
    </div>
  );
}

function EntrenamientosTab({ weekDates, week }: { weekDates: string[]; week: StudentDayDetail[] | null }) {
  if (!week) return <div className="text-[12px] text-textMuted">Cargando...</div>;
  return (
    <div className="space-y-1.5">
      {weekDates.map((fecha) => {
        const day = week.find((d) => d.fecha === fecha);
        const trained = day?.entreno || false;
        return (
          <div key={fecha} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg/40 px-2.5 py-2">
            <div className="flex items-center gap-2">
              <span className="w-8 font-mono text-[10px] uppercase tracking-wide text-textMuted">{DOW_SHORT[weekdayOf(fecha)]}</span>
              <span className={`h-2 w-2 shrink-0 rounded-full ${trained ? "bg-sage" : "bg-textMuted/30"}`} />
              <span className="text-[12px] text-text">{trained ? "Entrenó" : "Sin entrenar"}</span>
            </div>
            {trained && (
              <span className="font-mono text-[10px] text-textMuted">
                {day?.entrenoIntensidad || ""} {day?.volumen ? `· ${Math.round(day.volumen)}kg vol.` : ""}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function IncidenciasTab({
  incidents,
  loaded,
  busyId,
  onMarkSeen,
}: {
  incidents: RoutineIncident[];
  loaded: boolean;
  busyId: string | null;
  onMarkSeen: (id: string) => void;
}) {
  if (!loaded) return <div className="text-[12px] text-textMuted">Cargando...</div>;
  if (incidents.length === 0) {
    return <div className="rounded-lg border border-dashed border-border p-3 text-[12px] text-textMuted">Sin incidencias reportadas.</div>;
  }
  return (
    <div className="space-y-1.5">
      {incidents.map((incident) => (
        <div
          key={incident.id}
          className={`rounded-lg border p-2.5 ${incident.vistoPorEntrenador ? "border-border bg-bg/40" : "border-gold/40 bg-gold/5"}`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-gold">
              {INCIDENT_LABEL[incident.tipo]}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-wide text-textMuted">{incident.fecha}</span>
          </div>
          <div className="mt-1 font-mono text-[10px] text-textMuted">
            {incident.routineNombre}
            {incident.ejercicioNombre ? ` · ${incident.ejercicioNombre}` : ""}
          </div>
          {incident.detalle && <div className="mt-1 text-[11px] text-textMuted">{incident.detalle}</div>}
          {!incident.vistoPorEntrenador && (
            <button
              type="button"
              onClick={() => onMarkSeen(incident.id)}
              disabled={busyId === incident.id}
              className="mt-1.5 rounded-full border border-border px-2 py-1 font-mono text-[9px] uppercase tracking-wide text-textMuted disabled:opacity-50"
            >
              Marcar como vista
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function NutricionTab({ weekDates, week }: { weekDates: string[]; week: StudentDayDetail[] | null }) {
  if (!week) return <div className="text-[12px] text-textMuted">Cargando...</div>;
  const withData = weekDates.map((fecha) => week.find((d) => d.fecha === fecha)).filter((d): d is StudentDayDetail => !!d && d.kcal > 0);
  const avg = (key: "kcal" | "proteina" | "carbohidratos" | "grasas") =>
    withData.length ? Math.round(withData.reduce((sum, d) => sum + d[key], 0) / withData.length) : null;
  return (
    <div>
      <div className="mb-2 grid grid-cols-4 gap-1.5">
        <MetricCard label="Kcal prom." value={avg("kcal") != null ? String(avg("kcal")) : "—"} />
        <MetricCard label="Prot. prom." value={avg("proteina") != null ? `${avg("proteina")}g` : "—"} />
        <MetricCard label="Carb. prom." value={avg("carbohidratos") != null ? `${avg("carbohidratos")}g` : "—"} />
        <MetricCard label="Grasa prom." value={avg("grasas") != null ? `${avg("grasas")}g` : "—"} />
      </div>
      <div className="space-y-1.5">
        {weekDates.map((fecha) => {
          const day = week.find((d) => d.fecha === fecha);
          const hasData = day && day.kcal > 0;
          return (
            <div key={fecha} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg/40 px-2.5 py-2">
              <span className="w-8 font-mono text-[10px] uppercase tracking-wide text-textMuted">{DOW_SHORT[weekdayOf(fecha)]}</span>
              {hasData ? (
                <span className="font-mono text-[10px] text-text">
                  {Math.round(day!.kcal)} kcal · {Math.round(day!.proteina)}g P · {Math.round(day!.carbohidratos)}g C ·{" "}
                  {Math.round(day!.grasas)}g G
                </span>
              ) : (
                <span className="font-mono text-[10px] text-textMuted">Sin registrar</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeightTooltip({ active, payload, label }: { active?: boolean; payload?: { value?: number }[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      style={{
        background: "rgb(var(--color-surface))",
        border: "1px solid rgb(var(--color-border))",
        borderRadius: 8,
        padding: "6px 9px",
      }}
    >
      <div style={{ color: "rgb(var(--color-text-muted))", fontSize: 10 }}>{label}</div>
      <div style={{ color: "rgb(var(--color-accent))", fontSize: 13, fontWeight: 700 }}>{payload[0].value}kg</div>
    </div>
  );
}

function PesoTab({ weightHistory }: { weightHistory: { weekStart: string; peso: number }[] | null }) {
  if (!weightHistory) return <div className="text-[12px] text-textMuted">Cargando...</div>;
  if (weightHistory.length < 2) {
    return (
      <div className="rounded-lg border border-dashed border-border p-3 text-[12px] text-textMuted">
        Todavía no hay suficiente peso cargado para ver una tendencia (hace falta al menos 2 semanas).
      </div>
    );
  }
  const data = weightHistory.map((p) => ({
    semana: `${new Date(`${p.weekStart}T00:00:00`).getDate()}/${new Date(`${p.weekStart}T00:00:00`).getMonth() + 1}`,
    peso: p.peso,
  }));
  const primero = weightHistory[0].peso;
  const ultimo = weightHistory[weightHistory.length - 1].peso;
  const delta = Math.round((ultimo - primero) * 10) / 10;
  return (
    <div>
      <div className="mb-2 text-center font-mono text-[11px] text-textMuted">
        {delta === 0 ? "Sin cambio" : delta > 0 ? `+${delta}kg` : `${delta}kg`} en las últimas {weightHistory.length} semanas
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ left: -20, right: 10, top: 5, bottom: 0 }}>
          <XAxis
            dataKey="semana"
            tick={{ fill: "rgb(var(--color-text-muted))", fontSize: 9, fontFamily: "JetBrains Mono" }}
            axisLine={{ stroke: "rgb(var(--color-border))" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "rgb(var(--color-text-muted))", fontSize: 9, fontFamily: "JetBrains Mono" }}
            axisLine={false}
            tickLine={false}
            domain={["dataMin - 1", "dataMax + 1"]}
          />
          <Tooltip content={<WeightTooltip />} cursor={{ stroke: "rgb(var(--color-accent) / 0.3)" }} />
          <Line
            type="monotone"
            dataKey="peso"
            stroke="rgb(var(--color-accent))"
            strokeWidth={2}
            dot={{ r: 3, fill: "rgb(var(--color-accent))" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ComentariosTab({ studentId }: { studentId: string }) {
  const { comments, loaded, sending, send } = useTrainerComments(studentId);
  const [texto, setTexto] = useState("");
  return (
    <div>
      <div className="mb-3 flex gap-1.5">
        <input
          type="text"
          value={texto}
          onChange={(event) => setTexto(event.target.value)}
          placeholder="Escribile un comentario a tu alumno..."
          className="min-w-0 flex-1"
        />
        <button
          type="button"
          disabled={sending || !texto.trim()}
          onClick={() => {
            send(texto);
            setTexto("");
          }}
          className="shrink-0 rounded-lg border border-gold/60 bg-gold px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-bg disabled:opacity-50"
        >
          Enviar
        </button>
      </div>
      {!loaded ? (
        <div className="text-[12px] text-textMuted">Cargando...</div>
      ) : comments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-3 text-[12px] text-textMuted">Todavía no le mandaste ningún comentario.</div>
      ) : (
        <div className="space-y-1.5">
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-lg border border-border bg-bg/40 p-2.5">
              <div className="text-[12px] text-text">{comment.texto}</div>
              <div className="mt-1 font-mono text-[9px] uppercase tracking-wide text-textMuted">
                {new Date(comment.createdAt).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                {comment.readAt ? " · visto ✓" : " · no visto"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function StudentDetailScreen({
  studentId,
  studentEmail,
  onClose,
}: {
  studentId: string;
  studentEmail: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("resumen");
  const metricsHook = useStudentMetrics();
  const detailHook = useStudentDetail();
  const incidentsHook = useTrainerIncidents(true, true, studentId);

  const weekStart = useMemo(() => fmtDate(isoMonday(fmtDate(new Date()))), []);
  const weekDates = useMemo(() => [...Array(7)].map((_, i) => fmtDate(addDays(new Date(`${weekStart}T00:00:00`), i))), [weekStart]);

  useEffect(() => {
    metricsHook.load(studentId);
    detailHook.load(studentId, weekStart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, weekStart]);

  return (
    <div className="fixed inset-0 z-50 bg-bg">
      <div className="flex h-full flex-col">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-3 py-2.5">
          <div className="min-w-0">
            <div className="font-display text-base leading-tight text-text">{studentEmail}</div>
            <div className="font-mono text-[9px] uppercase tracking-wide text-textMuted">Semana del {weekStart}</div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full border border-border bg-bg px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted"
          >
            Cerrar
          </button>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-border bg-bg/95 px-3 py-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-full px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wide transition-colors ${
                tab === t.id ? "bg-gold text-bg" : "border border-border text-textMuted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {tab === "resumen" && <ResumenTab metrics={metricsHook.metricsByStudent[studentId] ?? null} />}
          {tab === "entrenamientos" && <EntrenamientosTab weekDates={weekDates} week={detailHook.week} />}
          {tab === "incidencias" && (
            <IncidenciasTab
              incidents={incidentsHook.incidents}
              loaded={incidentsHook.loaded}
              busyId={incidentsHook.busyId}
              onMarkSeen={incidentsHook.markSeen}
            />
          )}
          {tab === "nutricion" && <NutricionTab weekDates={weekDates} week={detailHook.week} />}
          {tab === "peso" && <PesoTab weightHistory={detailHook.weightHistory} />}
          {tab === "comentarios" && <ComentariosTab studentId={studentId} />}
        </div>
      </div>
    </div>
  );
}
