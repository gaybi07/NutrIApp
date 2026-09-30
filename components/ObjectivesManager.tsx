"use client";

import { useState } from "react";
import { Disciplina, OBJECTIVE_PRESETS, Objective, ObjectiveTipo } from "@/lib/types";
import { NewObjective, useStudentObjectives } from "@/lib/useObjectives";
import { btn } from "@/components/buttonStyles";

const ESTADO_STYLE: Record<Objective["estado"], { label: string; bg: string; text: string }> = {
  activo: { label: "Activo", bg: "rgb(var(--color-accent))", text: "#fff" },
  logrado: { label: "Logrado", bg: "rgb(var(--color-sage))", text: "#0f3d2d" },
  archivado: { label: "Archivado", bg: "rgb(var(--color-surface-alt))", text: "rgb(var(--color-text-muted))" },
};

function describe(o: Objective) {
  const dir = o.direccion === "min" ? "al menos" : "hasta";
  const unidad = o.unidad ? ` ${o.unidad}` : "";
  const cuando =
    o.ventana === "total"
      ? o.fechaLimite
        ? ` · antes del ${new Date(`${o.fechaLimite}T00:00:00`).toLocaleDateString("es-AR", { day: "numeric", month: "numeric" })}`
        : ""
      : o.ventana === "dia"
        ? ` por día · ${o.diasPorSemana} días por semana, ${o.semanasSeguidas} semana${o.semanasSeguidas === 1 ? "" : "s"} seguida${o.semanasSeguidas === 1 ? "" : "s"}`
        : ` por semana · ${o.semanasSeguidas} semana${o.semanasSeguidas === 1 ? "" : "s"} seguida${o.semanasSeguidas === 1 ? "" : "s"}`;
  return `${dir} ${o.meta}${unidad}${cuando}`;
}

/** Lado PROFESIONAL: objetivos medibles del cliente. Siempre con número, unidad y ventana de tiempo, para que la app pueda medirlos sola. */
export function ObjectivesManager({ studentId, disciplina }: { studentId: string; disciplina: Disciplina }) {
  const hook = useStudentObjectives(studentId, disciplina);
  const tipos = (Object.keys(OBJECTIVE_PRESETS) as ObjectiveTipo[]).filter((t) => OBJECTIVE_PRESETS[t].disciplinas.includes(disciplina));

  const [adding, setAdding] = useState(false);
  const [tipo, setTipo] = useState<ObjectiveTipo>(tipos[0]);
  const preset = OBJECTIVE_PRESETS[tipo];
  const [nombre, setNombre] = useState(preset.nombre);
  const [meta, setMeta] = useState(String(preset.meta));
  const [unidad, setUnidad] = useState(preset.unidad);
  const [direccion, setDireccion] = useState<"min" | "max">(preset.direccion);
  const [diasPorSemana, setDiasPorSemana] = useState(5);
  const [semanasSeguidas, setSemanasSeguidas] = useState(2);
  const [ejercicio, setEjercicio] = useState("");
  const [fechaLimite, setFechaLimite] = useState("");

  const pickTipo = (t: ObjectiveTipo) => {
    const p = OBJECTIVE_PRESETS[t];
    setTipo(t);
    setNombre(p.nombre);
    setMeta(String(p.meta));
    setUnidad(p.unidad);
    setDireccion(p.direccion);
  };

  const submit = async () => {
    const metaNumber = Number(meta.replace(",", "."));
    if (!nombre.trim() || !Number.isFinite(metaNumber) || metaNumber <= 0) return;
    const input: NewObjective = {
      tipo,
      nombre,
      meta: metaNumber,
      unidad,
      direccion,
      ventana: preset.ventana,
      diasPorSemana,
      semanasSeguidas,
      ejercicio: tipo === "carga" ? ejercicio : null,
      fechaLimite: preset.ventana === "total" && fechaLimite ? fechaLimite : null,
    };
    if (await hook.create(input)) setAdding(false);
  };

  const [messageFor, setMessageFor] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const active = hook.objectives.filter((o) => o.estado === "activo");
  const done = hook.objectives.filter((o) => o.estado === "logrado");
  const archived = hook.objectives.filter((o) => o.estado === "archivado");

  return (
    <div className="mb-4 rounded-xl border border-border bg-bg/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-gold">Objetivos medibles</div>
        <button type="button" onClick={() => setAdding((v) => !v)} className={btn(adding ? "neutral" : "primary", "sm")}>
          {adding ? "Cerrar" : "+ Objetivo"}
        </button>
      </div>

      {hook.error && (
        <div className="mt-2 rounded-lg border border-dashed border-border p-2 text-[11px] text-textMuted">
          Los objetivos necesitan una actualización de la base (migration 2026-10-09).
        </div>
      )}

      {adding && (
        <div className="mt-2 space-y-2 rounded-lg border border-border bg-surface p-2.5">
          <div>
            <label className="mb-1 block font-mono text-[9px] uppercase tracking-wide text-textMuted">Qué se mide</label>
            <select value={tipo} onChange={(event) => pickTipo(event.target.value as ObjectiveTipo)} className="w-full text-[13px]">
              {tipos.map((t) => (
                <option key={t} value={t}>
                  {OBJECTIVE_PRESETS[t].label}
                </option>
              ))}
            </select>
            <div className="mt-1 text-[11px] text-textMuted">{preset.fuente}</div>
          </div>
          <input type="text" value={nombre} onChange={(event) => setNombre(event.target.value)} placeholder="Nombre del objetivo" maxLength={120} className="w-full text-[13px]" />
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="mb-1 block font-mono text-[9px] uppercase tracking-wide text-textMuted">Meta</label>
              <input type="number" inputMode="decimal" value={meta} onChange={(event) => setMeta(event.target.value)} className="w-full text-[13px]" />
            </div>
            <div>
              <label className="mb-1 block font-mono text-[9px] uppercase tracking-wide text-textMuted">Unidad</label>
              <input type="text" value={unidad} onChange={(event) => setUnidad(event.target.value)} maxLength={20} className="w-full text-[13px]" />
            </div>
            <div>
              <label className="mb-1 block font-mono text-[9px] uppercase tracking-wide text-textMuted">Cómo</label>
              <select value={direccion} onChange={(event) => setDireccion(event.target.value as "min" | "max")} className="w-full text-[13px]">
                <option value="min">Llegar o superar</option>
                <option value="max">No pasarse</option>
              </select>
            </div>
          </div>
          {tipo === "carga" && (
            <input type="text" value={ejercicio} onChange={(event) => setEjercicio(event.target.value)} placeholder="Ejercicio (ej: Sentadilla)" maxLength={80} className="w-full text-[13px]" />
          )}
          {preset.ventana === "total" ? (
            <div>
              <label className="mb-1 block font-mono text-[9px] uppercase tracking-wide text-textMuted">Fecha límite (opcional)</label>
              <input type="date" value={fechaLimite} onChange={(event) => setFechaLimite(event.target.value)} className="w-full text-[13px]" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {preset.ventana === "dia" && (
                <div>
                  <label className="mb-1 block font-mono text-[9px] uppercase tracking-wide text-textMuted">Días por semana</label>
                  <select value={diasPorSemana} onChange={(event) => setDiasPorSemana(Number(event.target.value))} className="w-full text-[13px]">
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <option key={n} value={n}>
                        {n} de 7
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className={preset.ventana === "dia" ? "" : "col-span-2"}>
                <label className="mb-1 block font-mono text-[9px] uppercase tracking-wide text-textMuted">Semanas seguidas</label>
                <select value={semanasSeguidas} onChange={(event) => setSemanasSeguidas(Number(event.target.value))} className="w-full text-[13px]">
                  {[1, 2, 3, 4, 6, 8, 12].map((n) => (
                    <option key={n} value={n}>
                      {n} semana{n === 1 ? "" : "s"}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <button type="button" disabled={hook.busy} onClick={submit} className={btn("primary", "md", true)}>
            {hook.busy ? "Guardando..." : "Crear objetivo"}
          </button>
        </div>
      )}

      {!hook.loaded ? (
        <div className="mt-2 text-[12px] text-textMuted">Cargando...</div>
      ) : hook.objectives.length === 0 && !hook.error ? (
        <div className="mt-2 rounded-lg border border-dashed border-border p-2.5 text-[12px] text-textMuted">
          Todavía no fijaste objetivos. Un objetivo siempre lleva número, unidad y tiempo, así la app puede medirlo sola y avisarte cuando se cumple.
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          {[...active, ...done, ...archived].map((o) => {
            const st = ESTADO_STYLE[o.estado];
            return (
              <div key={o.id} className="rounded-lg border border-border bg-surface/60 p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-text">
                      {o.nombre}
                      {o.ejercicio ? <span className="font-normal text-textMuted"> · {o.ejercicio}</span> : null}
                    </div>
                    <div className="text-[11px] text-textMuted">{describe(o)}</div>
                  </div>
                  <span className="shrink-0 rounded-full px-2 py-1 font-mono text-[9px] font-bold uppercase leading-none" style={{ background: st.bg, color: st.text }}>
                    {st.label}
                  </span>
                </div>
                {o.estado === "logrado" && (
                  <div className="mt-2 rounded-lg border border-sage/40 bg-sage/10 p-2">
                    <div className="text-[12px] text-sage">
                      ✓ Lo logró{o.logradoAt ? ` el ${new Date(o.logradoAt).toLocaleDateString("es-AR", { day: "numeric", month: "numeric" })}` : ""}.
                    </div>
                    {o.mensajeLogro && messageFor !== o.id ? (
                      <div className="mt-1 text-[12px] text-text">Tu mensaje: “{o.mensajeLogro}”</div>
                    ) : null}
                    {messageFor === o.id ? (
                      <div className="mt-1.5">
                        <textarea
                          value={message}
                          onChange={(event) => setMessage(event.target.value)}
                          placeholder="Felicitalo y, si querés, proponele el próximo objetivo"
                          rows={3}
                          maxLength={500}
                          className="w-full text-[12px]"
                        />
                        <div className="mt-1.5 grid grid-cols-2 gap-2">
                          <button type="button" onClick={() => setMessageFor(null)} className={btn("neutral", "sm", true)}>
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await hook.setMessage(o.id, message);
                              setMessageFor(null);
                            }}
                            className={btn("primary", "sm", true)}
                          >
                            Enviar mensaje
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setMessage(o.mensajeLogro || "");
                          setMessageFor(o.id);
                        }}
                        className={`${btn("secondary", "sm")} mt-1.5`}
                      >
                        {o.mensajeLogro ? "Editar mensaje" : "Dejar un mensaje"}
                      </button>
                    )}
                  </div>
                )}
                {o.estado === "activo" && (
                  <button type="button" onClick={() => hook.archive(o.id)} className={`${btn("neutral", "sm")} mt-2`}>
                    Archivar
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
