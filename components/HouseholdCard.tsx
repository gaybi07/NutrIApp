"use client";

import { useState } from "react";
import { Collapsible } from "@/components/Collapsible";
import { InventoryItem } from "@/lib/types";
import { HouseholdInfo } from "@/lib/useHousehold";
import { SECTION_HELP } from "@/lib/helpText";

/**
 * Alacena compartida entre cuentas (pareja, amigos, "hogar"): crear un
 * grupo, invitar con un código, o salir. El resto de Comidas > Alacena no
 * necesita saber si la alacena que está mirando es local o de grupo — eso
 * se decide en app/page.tsx eligiendo qué hook de inventario usar.
 */
export function HouseholdCard({
  household,
  loaded,
  status,
  busy,
  localItems,
  create,
  join,
  leave,
  getInviteCode,
}: {
  household: HouseholdInfo | null;
  loaded: boolean;
  status: string;
  busy: boolean;
  localItems: InventoryItem[];
  create: (name: string, importItems: InventoryItem[]) => Promise<void>;
  join: (code: string) => Promise<void>;
  leave: () => Promise<void>;
  getInviteCode: () => Promise<string | null>;
}) {
  const [nameDraft, setNameDraft] = useState("");
  const [codeDraft, setCodeDraft] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [confirmingLeave, setConfirmingLeave] = useState(false);

  if (!loaded) return null;

  const toggleInvite = async () => {
    if (showInvite) {
      setShowInvite(false);
      return;
    }
    setShowInvite(true);
    setInviteLoading(true);
    const code = await getInviteCode();
    setInviteCode(code);
    setInviteLoading(false);
  };

  const copyCode = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
    } catch {
      // si el portapapeles no está disponible, el código ya está visible en pantalla
    }
  };

  return (
    <Collapsible eyebrow="Alacena en grupo" title={household ? household.name : "Compartir alacena"} info={SECTION_HELP.hogar}>
      {household ? (
        <>
          <div className="mb-3 text-[12px] text-textMuted">
            Compartida con {household.memberCount} persona{household.memberCount !== 1 ? "s" : ""}. Todos ven y descuentan de la misma alacena.
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={toggleInvite}
              className="rounded-xl border border-gold/60 bg-gold px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-bg"
            >
              {showInvite ? "Ocultar código" : "Invitar a alguien"}
            </button>
            {!confirmingLeave ? (
              <button
                type="button"
                onClick={() => setConfirmingLeave(true)}
                className="rounded-xl border border-border bg-bg/60 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted"
              >
                Salir del grupo
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    leave();
                    setConfirmingLeave(false);
                  }}
                  className="rounded-xl border border-rust/60 bg-rust/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-rust"
                >
                  Sí, salir
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingLeave(false)}
                  className="rounded-xl border border-border bg-bg/60 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted"
                >
                  Cancelar
                </button>
              </>
            )}
          </div>

          {showInvite && (
            <div className="mt-3 rounded-xl border border-gold/40 bg-gold/10 p-2.5 text-center">
              {inviteLoading ? (
                <div className="text-[11px] text-textMuted">Generando código...</div>
              ) : inviteCode ? (
                <>
                  <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-textMuted">
                    Pasale este código — no vence, sirve para siempre
                  </div>
                  <div className="mb-2 font-mono text-2xl tracking-[0.3em] text-gold">{inviteCode}</div>
                  <button
                    type="button"
                    onClick={copyCode}
                    className="rounded-lg border border-gold/60 bg-bg/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-text"
                  >
                    Copiar código
                  </button>
                </>
              ) : (
                <div className="text-[11px] text-rust">No pude generar el código, probá de nuevo.</div>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mb-3 text-[12px] text-textMuted">
            Compartí tu alacena con tu pareja, amigos o quien viva con vos — todos suman y descuentan del mismo stock. Empieza con 2 pero podés sumar a más gente después.
          </div>

          <div className="mb-4 rounded-xl border border-border bg-bg/40 p-2.5">
            <label className="mb-1.5 flex items-center font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted">Crear un grupo nuevo</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                placeholder="Mi hogar"
                className="flex-1"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => create(nameDraft, localItems)}
                className="shrink-0 rounded-lg border border-gold/60 bg-gold px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-bg disabled:opacity-60"
              >
                Crear
              </button>
            </div>
            {localItems.length > 0 && (
              <div className="mt-1.5 text-[10px] text-textMuted">
                Tu alacena actual ({localItems.length} producto{localItems.length !== 1 ? "s" : ""}) se va a convertir en la alacena del grupo.
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-bg/40 p-2.5">
            <label className="mb-1.5 flex items-center font-mono text-[10px] uppercase tracking-[0.12em] text-textMuted">
              Unirme con un código
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={codeDraft}
                onChange={(e) => setCodeDraft(e.target.value.toUpperCase())}
                placeholder="Ej: 7XQK2P"
                className="flex-1 uppercase tracking-[0.15em]"
              />
              <button
                type="button"
                disabled={busy || !codeDraft.trim()}
                onClick={() => join(codeDraft)}
                className="shrink-0 rounded-lg border border-sage/50 bg-sage/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-sage disabled:opacity-60"
              >
                Unirme
              </button>
            </div>
          </div>
        </>
      )}

      {status && <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-sage">{status}</div>}
    </Collapsible>
  );
}
