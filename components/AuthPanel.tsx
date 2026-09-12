"use client";

import { FormEvent, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/browser";

export function AuthPanel({
  onAuthChange,
  onOpenPreferences,
}: {
  onAuthChange?: (authenticated: boolean) => void;
  onOpenPreferences?: () => void;
}) {
  const [email, setEmail] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!supabase) {
      onAuthChange?.(true);
      return;
    }
    Promise.all([
      supabase.auth.getUser(),
      fetch("/api/auth/session").then((response) => response.json()),
    ]).then(([browserResult, serverResult]) => {
      const email = browserResult.data.user?.email ?? serverResult.email ?? null;
      const metadata = browserResult.data.user?.user_metadata as Record<string, unknown> | undefined;
      setUserEmail(email);
      setUserName((metadata?.full_name as string) || (metadata?.name as string) || null);
      onAuthChange?.(Boolean(email));
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const metadata = session?.user?.user_metadata as Record<string, unknown> | undefined;
      setUserEmail(session?.user?.email ?? null);
      setUserName((metadata?.full_name as string) || (metadata?.name as string) || null);
      onAuthChange?.(Boolean(session?.user));
    });
    return () => listener.subscription.unsubscribe();
  }, [onAuthChange]);

  if (!isSupabaseConfigured) {
    return <div className="text-center text-[11px] text-textMuted mb-4">Modo local: configurá Supabase para sincronizar entre dispositivos.</div>;
  }

  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !email.trim()) return;
    setStatus("Enviando enlace...");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setStatus(error ? "No se pudo enviar el enlace." : "Revisá tu email para entrar.");
  };

  const signInWithGoogle = async () => {
    if (!supabase) return;
    setStatus("Abriendo Google...");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) setStatus("No se pudo abrir Google.");
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    await fetch("/api/auth/session", { method: "POST" });
    onAuthChange?.(false);
    setStatus("Sesión cerrada.");
  };

  if (userEmail) {
    const displayName = userName || userEmail;
    return (
      <div className="relative -mx-3 mb-3 flex items-center justify-between gap-2 border-b border-border bg-surface px-3 py-2.5 lg:mx-0 lg:rounded-xl lg:border">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sage" />
          <span className="truncate font-sans text-[13px] font-bold text-text">{displayName}</span>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Ajustes"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-bg text-base text-textMuted transition-colors hover:border-gold/60 hover:text-gold"
        >
          ⚙
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-11 z-50 w-48 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenPreferences?.();
                }}
                className="block w-full px-3 py-2.5 text-left text-[13px] text-text transition-colors hover:bg-surfaceAlt"
              >
                Preferencias
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  signOut();
                }}
                className="block w-full border-t border-border px-3 py-2.5 text-left text-[13px] text-rust transition-colors hover:bg-surfaceAlt"
              >
                Cerrar sesión
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl p-4">
      <div className="font-display italic text-lg text-gold mb-1">Bienvenida a Registro</div>
      <div className="text-xs text-textMuted mb-4">Creá tu cuenta o ingresá para ver tus registros.</div>
      <button
        type="button"
        onClick={signInWithGoogle}
        className="w-full rounded-lg p-3 font-sans font-bold text-sm mb-3"
        style={{ background: "#F4F0E8", color: "#1C1B18" }}
      >
        Continuar con Google
      </button>
      <div className="text-center text-[10px] text-textMuted mb-3">o con tu email</div>
      <form onSubmit={signIn}>
      <div className="flex gap-2">
        <input
          type="email"
          required
          placeholder="tu@email.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="min-w-0 flex-1"
        />
        <button type="submit" className="rounded-lg px-3 text-xs font-bold bg-gold text-bg">
          Enviar enlace
        </button>
      </div>
      {status && <div className="text-[11px] text-sage mt-2">{status}</div>}
      </form>
    </div>
  );
}
