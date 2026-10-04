"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import { ClientPlan } from "@/lib/types";
import { PersonalProfile, ProfessionalProfileData, ProfessionalProfileView, fetchProfessionalProfile, initialsOf } from "@/lib/useProfiles";
import { Avatar, ProfessionalLinkedCard, ProfessionalShortCard } from "@/components/ProfileCards";
import { btn, chip } from "@/components/buttonStyles";
import { MonthStandard } from "@/lib/monthStandard";
import { MonthBanner } from "@/components/MonthBanner";
import { STATUS_BG, isGlow, statusCellStyle } from "@/components/WeekGoalGrid";

const PLAN_LABEL: Record<ClientPlan, string> = { basico: "Básico", premium: "Premium", autoentreno: "Autoentreno", premium_plus: "Premium+" };
const MODO_LABEL = { perder: "Perdiendo grasa (déficit)", recomponer: "Recomposición", aumentar: "Ganando masa (volumen)" } as const;

export interface ProfileModalProps {
  email: string | null;
  personal: PersonalProfile;
  savePersonal: (p: PersonalProfile) => Promise<string | null>;
  plan: ClientPlan;
  modo?: "perder" | "recomponer" | "aumentar";
  sexo?: "hombre" | "mujer";
  objectiveNames: string[];
  points: number;
  achievementsDone: number;
  /** Estandarte: el color de cada mes reciente (el actual primero). */
  standards?: MonthStandard[];
  /** Solo si es profesional aprobado: aparece la pestaña "Profesional". */
  isProfessional: boolean;
  pro: ProfessionalProfileData;
  savePro: (p: ProfessionalProfileData) => Promise<string | null>;
  onClose: () => void;
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="mb-0.5 block font-mono text-[8.5px] uppercase text-textMuted">{label}</label>
    {children}
  </div>
);

export function ProfileModal(props: ProfileModalProps) {
  const { email, personal, savePersonal, plan, modo, sexo, objectiveNames, points, achievementsDone, standards, isProfessional, pro, savePro, onClose } = props;
  const [tab, setTab] = useState<"personal" | "profesional">("personal");
  const initials = initialsOf(personal.nombre, personal.alias, email);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative my-4 max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <Avatar initials={initials} size={48} />
            <div className="min-w-0">
              <div className="truncate font-display text-xl text-text">{personal.nombre || personal.alias || "Mi perfil"}</div>
              {personal.alias && <div className="font-mono text-[10px] text-textMuted">@{personal.alias}</div>}
            </div>
          </div>
          <button type="button" onClick={onClose} className={btn("neutral", "sm")}>
            Cerrar
          </button>
        </div>

        {isProfessional && (
          <div className="mb-3 flex gap-1.5">
            <button type="button" onClick={() => setTab("personal")} className={chip(tab === "personal")}>
              Personal
            </button>
            <button type="button" onClick={() => setTab("profesional")} className={chip(tab === "profesional")}>
              Profesional
            </button>
          </div>
        )}

        {tab === "personal" || !isProfessional ? (
          <PersonalTab
            personal={personal}
            savePersonal={savePersonal}
            plan={plan}
            modo={modo}
            sexo={sexo}
            objectiveNames={objectiveNames}
            points={points}
            achievementsDone={achievementsDone}
            standards={standards}
          />
        ) : (
          <ProfessionalTab personal={personal} pro={pro} savePro={savePro} initials={initials} />
        )}
      </div>
    </div>
  );
}

function PersonalTab({
  personal,
  savePersonal,
  plan,
  modo,
  sexo,
  objectiveNames,
  points,
  achievementsDone,
  standards,
}: Pick<ProfileModalProps, "personal" | "savePersonal" | "plan" | "modo" | "sexo" | "objectiveNames" | "points" | "achievementsDone" | "standards">) {
  const [nombre, setNombre] = useState(personal.nombre);
  const [alias, setAlias] = useState(personal.alias);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  useEffect(() => {
    setNombre(personal.nombre);
    setAlias(personal.alias);
  }, [personal.nombre, personal.alias]);

  const submit = async () => {
    const err = await savePersonal({ nombre, alias });
    setMsg(err ? { text: err, ok: false } : { text: "Guardado.", ok: true });
  };

  const basic = plan === "basico";
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Nombre real">
          <input value={nombre} onChange={(event) => setNombre(event.target.value)} placeholder="Ej. Gabriel Rosa" maxLength={60} />
        </Field>
        <Field label="Alias (usuario)">
          <input value={alias} onChange={(event) => setAlias(event.target.value)} placeholder="Ej. gabi.rosa" maxLength={21} />
        </Field>
      </div>
      {msg && <div className={`text-[12px] ${msg.ok ? "text-sage" : "text-rust"}`}>{msg.text}</div>}
      <div className="flex justify-end">
        <button type="button" onClick={submit} className={btn("primary", "sm")}>
          Guardar
        </button>
      </div>

      {basic ? (
        <div className="rounded-xl border border-border bg-bg/40 p-3 text-center">
          <div className="font-mono text-[9px] uppercase tracking-wide text-gold">Mi plan</div>
          <div className="font-display text-lg text-text">Miembro básico</div>
          <div className="text-[11px] text-textMuted">Con un plan Premium se suma tu etapa, objetivos e insignias.</div>
        </div>
      ) : (
        <>
      <div className="rounded-xl border border-border bg-bg/40 p-3">
        <div className="font-mono text-[9px] uppercase tracking-wide text-gold">Mi plan</div>
        <div className="font-display text-lg text-text">{PLAN_LABEL[plan]}</div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-wide text-textMuted">Sexo</div>
            <div className="text-text">{sexo === "mujer" ? "Mujer" : sexo === "hombre" ? "Hombre" : "—"}</div>
          </div>
          <div>
            <div className="font-mono text-[9px] uppercase tracking-wide text-textMuted">Etapa</div>
            <div className="text-text">{modo ? MODO_LABEL[modo] : "—"}</div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-bg/40 p-3">
        <div className="font-mono text-[9px] uppercase tracking-wide text-gold">Objetivos</div>
        {objectiveNames.length === 0 ? (
          <div className="text-[12px] text-textMuted">Todavía no tenés objetivos activos.</div>
        ) : (
          <ul className="mt-1 space-y-0.5 text-[13px] text-text">
            {objectiveNames.map((n) => (
              <li key={n}>• {n}</li>
            ))}
          </ul>
        )}
      </div>

      {standards && standards.length > 0 && (() => {
        const MONTH_NAMES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
        const nameOf = (ym: string) => MONTH_NAMES[Number(ym.slice(5)) - 1];
        const current = standards[0];
        // El estandarte muestra el mes en curso si ya tiene al menos 7 días cerrados; si no, el último mes que sí tiene color.
        const main = current.status ? current : standards.find((m) => m.status) ?? current;
        const isCurrent = main.month === current.month;
        const style = (m: MonthStandard) =>
          m.status ? { background: STATUS_BG[m.status], color: m.status === "verde" ? "#0f3d2d" : m.status === "amarillo" ? "#4a2f00" : "#ffffff" } : { border: "1px dashed rgb(var(--color-text-muted))" };
        return (
          <div className="rounded-xl border border-border bg-bg/40 p-3">
            <div className="font-mono text-[9px] uppercase tracking-wide text-gold">Estandarte</div>
            <div className="mt-1.5 flex items-baseline justify-between gap-2">
              <span className="font-display text-lg capitalize">{nameOf(main.month)}</span>
              <span className="font-mono text-[10px] uppercase tracking-wide text-textMuted">{main.counted} días cerrados</span>
            </div>
            <div className="mt-1.5">
              <MonthBanner standard={main} />
            </div>
            {!isCurrent && (
              <div className="mt-1.5 text-[11px] text-textMuted">
                {nameOf(current.month).replace(/^./, (c) => c.toUpperCase())} todavía junta datos: {current.counted} de 7 días cerrados. Cuando llegue a 7, el estandarte pasa a ser el de este mes.
              </div>
            )}
            {standards.length > 1 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {standards.map((m) => (
                  <span key={m.month} title={`${nameOf(m.month)}: ${m.counted} días`} className="rounded-md px-2 py-1 font-mono text-[9px] uppercase" style={{ ...style(m), color: m.status ? style(m).color : "rgb(var(--color-text-muted))" }}>
                    {nameOf(m.month).slice(0, 3)}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-1.5 text-[11px] text-textMuted">Cada mes se resume en un color, con los días ya cerrados. Cuanto más violeta, mejor.</div>
          </div>
        );
      })()}

      <div className="rounded-xl border border-gold/40 bg-gold/5 p-3">
        <div className="font-mono text-[9px] uppercase tracking-wide text-gold">Insignias</div>
        <div className="mt-1 flex items-center gap-3">
          <span className="rounded-full border border-gold/50 bg-gold/10 px-3 py-1.5 font-mono text-[12px] font-bold text-gold">⭐ {points} puntos</span>
          <span className="text-[13px] text-text">{achievementsDone} logro{achievementsDone === 1 ? "" : "s"} alcanzado{achievementsDone === 1 ? "" : "s"}</span>
        </div>
      </div>
        </>
      )}
    </div>
  );
}

function ProfessionalTab({
  personal,
  pro,
  savePro,
  initials,
}: {
  personal: PersonalProfile;
  pro: ProfessionalProfileData;
  savePro: (p: ProfessionalProfileData) => Promise<string | null>;
  initials: string;
}) {
  const [form, setForm] = useState(pro);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [preview, setPreview] = useState<"corta" | "vinculado" | null>(null);
  const [stats, setStats] = useState<ProfessionalProfileView | null>(null);
  useEffect(() => setForm(pro), [pro]);
  useEffect(() => {
    supabase?.auth.getUser().then(({ data }) => {
      if (data.user?.id) fetchProfessionalProfile(data.user.id).then(setStats);
    });
  }, []);

  const set = <K extends keyof ProfessionalProfileData>(key: K, value: ProfessionalProfileData[K]) => setForm((f) => ({ ...f, [key]: value }));
  const submit = async () => {
    if (!personal.nombre.trim()) return setMsg({ text: "Primero poné tu nombre real en la pestaña Personal: es obligatorio en el perfil profesional.", ok: false });
    const err = await savePro(form);
    setMsg(err ? { text: err, ok: false } : { text: "Guardado.", ok: true });
  };

  const asView = (extended: boolean): ProfessionalProfileView => ({
    nombre: personal.nombre || null,
    alias: personal.alias || null,
    titulo: form.titulo || null,
    dedicacion: form.dedicacion || null,
    bio: form.bio || null,
    logros: form.logros || null,
    whatsapp: extended && form.mostrarWhatsapp ? form.whatsapp || null : null,
    promedio: stats?.promedio ?? null,
    cantidad: stats?.cantidad ?? 0,
    opiniones: stats?.opiniones ?? [],
    verificado: stats?.verificado ?? false,
  });

  return (
    <div className="space-y-3">
      <Field label="Título">
        <input value={form.titulo} onChange={(event) => set("titulo", event.target.value)} placeholder="Ej. Lic. en Nutrición (MP 1234)" maxLength={100} />
      </Field>
      <Field label="A qué me dedico">
        <textarea value={form.dedicacion} onChange={(event) => set("dedicacion", event.target.value)} rows={2} maxLength={300} placeholder="Ej. Recomposición corporal y nutrición deportiva" />
      </Field>
      <Field label="Mini biografía">
        <textarea value={form.bio} onChange={(event) => set("bio", event.target.value)} rows={3} maxLength={600} placeholder="Contá en pocas líneas quién sos y cómo trabajás" />
      </Field>
      <Field label="Logros y metas">
        <textarea value={form.logros} onChange={(event) => set("logros", event.target.value)} rows={3} maxLength={600} placeholder="Ej. +80 pacientes acompañados, certificación X" />
      </Field>
      <Field label="WhatsApp (opcional)">
        <input value={form.whatsapp} onChange={(event) => set("whatsapp", event.target.value)} placeholder="+54 9 11 ..." maxLength={30} inputMode="tel" />
      </Field>
      <label className="flex items-start gap-2 text-[12px] text-textMuted">
        <input type="checkbox" checked={form.mostrarWhatsapp} onChange={(event) => set("mostrarWhatsapp", event.target.checked)} className="mt-0.5 h-4 w-4" />
        <span>Mostrar mi WhatsApp a mis alumnos vinculados. Solo lo ven ellos, nunca es público.</span>
      </label>
      {msg && <div className={`text-[12px] ${msg.ok ? "text-sage" : "text-rust"}`}>{msg.text}</div>}
      <div className="flex justify-end">
        <button type="button" onClick={submit} className={btn("primary", "sm")}>
          Guardar perfil profesional
        </button>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => setPreview(preview === "corta" ? null : "corta")} className={btn("secondary", "sm", true)}>
          Cómo me ve quien busca
        </button>
        <button type="button" onClick={() => setPreview(preview === "vinculado" ? null : "vinculado")} className={btn("secondary", "sm", true)}>
          Cómo me ve mi alumno
        </button>
      </div>
      {preview === "corta" && <ProfessionalShortCard view={asView(false)} initials={initials} />}
      {preview === "vinculado" && <ProfessionalLinkedCard view={asView(true)} initials={initials} />}
    </div>
  );
}
