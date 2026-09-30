"use client";

import { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useStudentMetrics } from "@/lib/useStudentMetrics";
import { useStudentDetail } from "@/lib/useStudentDetail";
import { usePatientNutritionAdherence } from "@/lib/usePatientNutritionAdherence";
import { useTrainerComments } from "@/lib/useTrainerComments";
import { useStudentReports } from "@/lib/useStudentReports";
import { NutritionPlanBuilder } from "@/components/NutritionPlanBuilder";
import { isoMonday, fmtDate, addDays, weekdayOf } from "@/lib/calculations";
import { WEEKDAY_LABELS_SHORT } from "@/lib/types";

type Tab = "resumen" | "plan" | "nutricion" | "peso" | "comentarios";

const TABS: { id: Tab; label: string }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "plan", label: "Plan" },
  { id: "nutricion", label: "Adherencia" },
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

function pctColor(pct: number | null) {
  if (pct == null) return "text-textMuted";
  if (pct >= 80) return "text-sage";
  if (pct >= 50) return "text-gold";
  return "text-rust";
}

/** Lo primero que se ve al abrir la pantalla -- adherencia al plan
 * nutricional (comparado contra lo publicado, no un conteo de entrenos
 * como en el lado Entrenador) + peso/proteína, de un vistazo. */
function ResumenTab({
  proteinaPromedio,
  pasosPromedio,
  pesoActual,
  cambioPeso,
  adherenciaPromedio,
  hasPlan,
}: {
  proteinaPromedio: number | null;
  pasosPromedio: number | null;
  pesoActual: number | null;
  cambioPeso: number | null;
  adherenciaPromedio: number | null;
  hasPlan: boolean;
}) {
  const fmt = (value: number | null, suffix = "") => (value == null ? "—" : `${value}${suffix}`);
  const cambioPesoStr = cambioPeso == null ? "—" : `${cambioPeso > 0 ? "+" : ""}${cambioPeso.toFixed(1)}kg`;
  return (
    <div>
      <div className="mb-3 rounded-xl border border-border bg-bg/40 p-3 text-center">
        <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-textMuted">Adherencia al plan esta semana</div>
        <div className={`mt-1 font-display text-3xl ${pctColor(adherenciaPromedio)}`}>{fmt(adherenciaPromedio, "%")}</div>
        <div className="mt-0.5 font-mono text-[10px] text-textMuted">
          {!hasPlan ? "Sin plan publicado esta semana" : "similitud entre kcal cargadas y kcal planificadas"}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <MetricCard label="Peso actual" value={fmt(pesoActual, "kg")} />
        <MetricCard label="Cambio vs. semana ant." value={cambioPesoStr} />
        <MetricCard label="Proteína promedio" value={fmt(proteinaPromedio, "g")} />
        <MetricCard label="Pasos promedio" value={fmt(pasosPromedio)} />
      </div>
    </div>
  );
}

function AdherenciaTab({
  weekDates,
  dias,
  loaded,
}: {
  weekDates: string[];
  dias: { fecha: string; plannedKcal: number; plannedProtein: number; actualKcal: number; actualProtein: number; pctSimilitud: number | null }[] | null;
  loaded: boolean;
}) {
  if (!loaded) return <div className="text-[12px] text-textMuted">Cargando...</div>;
  if (!dias) return <div className="rounded-lg border border-dashed border-border p-3 text-[12px] text-textMuted">No se pudo calcular.</div>;
  return (
    <div className="space-y-1.5">
      {weekDates.map((fecha) => {
        const d = dias.find((x) => x.fecha === fecha);
        if (!d) return null;
        const sinDatos = d.plannedKcal === 0 && d.actualKcal === 0;
        return (
          <div key={fecha} className="rounded-lg border border-border bg-bg/40 px-2.5 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wide text-textMuted">{WEEKDAY_LABELS_SHORT[weekdayOf(fecha)]}</span>
              {d.pctSimilitud != null && (
                <span className={`font-mono text-[11px] font-bold ${pctColor(d.pctSimilitud)}`}>{d.pctSimilitud}%</span>
              )}
            </div>
            {sinDatos ? (
              <div className="mt-0.5 font-mono text-[10px] text-textMuted">Sin plan ni registro ese día</div>
            ) : (
              <div className="mt-0.5 font-mono text-[10px] text-textMuted">
                Planificado {Math.round(d.plannedKcal)} kcal · {Math.round(d.plannedProtein)}g P — Real {Math.round(d.actualKcal)} kcal ·{" "}
                {Math.round(d.actualProtein)}g P
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function WeightTooltip({ active, payload, label }: { active?: boolean; payload?: { value?: number }[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div style={{ background: "rgb(var(--color-surface))", border: "1px solid rgb(var(--color-border))", borderRadius: 8, padding: "6px 9px" }}>
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
          <XAxis dataKey="semana" tick={{ fill: "rgb(var(--color-text-muted))", fontSize: 9, fontFamily: "JetBrains Mono" }} axisLine={{ stroke: "rgb(var(--color-border))" }} tickLine={false} />
          <YAxis tick={{ fill: "rgb(var(--color-text-muted))", fontSize: 9, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} domain={["dataMin - 1", "dataMax + 1"]} />
          <Tooltip content={<WeightTooltip />} cursor={{ stroke: "rgb(var(--color-accent) / 0.3)" }} />
          <Line type="monotone" dataKey="peso" stroke="rgb(var(--color-accent))" strokeWidth={2} dot={{ r: 3, fill: "rgb(var(--color-accent))" }} />
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
          placeholder="Escribile un comentario a tu paciente..."
          className="min-w-0 flex-1"
        />
        <button
          type="button"
          disabled={sending || !texto.trim()}
          onClick={() => {
            send(texto);
            setTexto("");
          }}
          className="shrink-0 rounded-lg border border-gold/60 bg-gold px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-white disabled:opacity-50"
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

export function PatientDetailScreen({
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
  const adherenceHook = usePatientNutritionAdherence();

  const weekStart = useMemo(() => fmtDate(isoMonday(fmtDate(new Date()))), []);
  const weekDates = useMemo(() => [...Array(7)].map((_, i) => fmtDate(addDays(new Date(`${weekStart}T00:00:00`), i))), [weekStart]);

  useEffect(() => {
    metricsHook.load(studentId, "nutricion");
    detailHook.load(studentId, weekStart, "nutricion");
    adherenceHook.load(studentId, weekStart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, weekStart]);

  const metrics = metricsHook.metricsByStudent[studentId] ?? null;
  const adherence = adherenceHook.byPatient[studentId] ?? null;

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
                tab === t.id ? "bg-gold text-white" : "border border-border text-textMuted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {tab === "resumen" && (
            <ResumenTab
              proteinaPromedio={metrics?.proteinaPromedio ?? null}
              pasosPromedio={metrics?.pasosPromedio ?? null}
              pesoActual={metrics?.pesoActual ?? null}
              cambioPeso={metrics?.cambioPeso ?? null}
              adherenciaPromedio={adherence?.adherenciaPromedio ?? null}
              hasPlan={adherence?.hasPlan ?? false}
            />
          )}
          {tab === "plan" && <NutritionPlanBuilder studentId={studentId} />}
          {tab === "nutricion" && (
            <AdherenciaTab weekDates={weekDates} dias={adherence?.dias ?? null} loaded={adherenceHook.loadingId !== studentId} />
          )}
          {tab === "peso" && <PesoTab weightHistory={detailHook.weightHistory} />}
          {tab === "comentarios" && <ComentariosTab studentId={studentId} />}
        </div>
      </div>
    </div>
  );
}
