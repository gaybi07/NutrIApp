"use client";

import { FormEvent, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/browser";

export function AuthPanel({ onAuthChange }: { onAuthChange?: (authenticated: boolean) => void }) {
  const [email, setEmail] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [status, setStatus] = useState("");

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
      setUserEmail(email);
      onAuthChange?.(Boolean(email));
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
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
    const initial = userEmail.trim().charAt(0).toUpperCase();
    return (
      <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-border bg-[linear-gradient(135deg,rgba(201,162,39,0.08),rgba(36,34,32,0.9))] px-3 py-2 shadow-[0_0_0_1px_rgba(58,54,47,0.4)]">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold/50 bg-gold/15 font-display text-sm text-gold">
            {initial}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.16em] text-sage">
              <span className="h-1.5 w-1.5 rounded-full bg-sage" />
              Sesión activa
            </div>
            <div className="truncate text-[11px] text-textMuted">{userEmail}</div>
          </div>
        </div>
        <button
          onClick={signOut}
          className="shrink-0 rounded-lg border border-border bg-bg/60 px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-textMuted transition-colors hover:border-rust/60 hover:text-rust"
        >
          Salir
        </button>
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
        <button type="submit" className="rounded-lg px-3 text-xs font-bold" style={{ background: "#C9A227", color: "#1C1B18" }}>
          Enviar enlace
        </button>
      </div>
      {status && <div className="text-[11px] text-sage mt-2">{status}</div>}
      </form>
    </div>
  );
}
