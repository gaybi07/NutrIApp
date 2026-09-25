-- Pagos, fase 1: cobro real de los Client Plans vía MercadoPago
-- (Suscripciones/Preapproval). `user_settings.plan` sigue siendo la única
-- fuente de verdad de qué puede hacer el usuario (gating ya existente) --
-- esta tabla es el respaldo de facturación que lo sincroniza, no un
-- gating nuevo. Sin split todavía (ver Contexto del plan: Preapproval no
-- soporta application_fee) -- eso es una fase aparte, para cuando haya
-- profesionales de verdad usando la app.

-- El check constraint de user_settings.plan (migration_2026-09-21g) nunca
-- se actualizó cuando el ticket 04 del mapa agregó Autoentreno como 4to
-- nivel -- hoy solo admite basico/premium/premium_plus. Se corrige acá,
-- antes de que el cobro real intente ponerlo.
alter table public.user_settings drop constraint if exists user_settings_plan_check;
alter table public.user_settings
  add constraint user_settings_plan_check
  check (plan in ('basico', 'premium', 'autoentreno', 'premium_plus'));

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null check (plan in ('premium', 'autoentreno', 'premium_plus')), -- básico no tiene suscripción, es gratis
  mp_preapproval_id text not null unique, -- id que devuelve MercadoPago al crear el /preapproval
  status text not null default 'pending' check (status in ('pending', 'authorized', 'paused', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_user_idx on public.subscriptions (user_id);

alter table public.subscriptions enable row level security;

create policy "user can view own subscriptions"
  on public.subscriptions for select
  using (user_id = auth.uid());

-- El insert lo hace la propia ruta /api/mercadopago/subscribe, autenticada
-- como el usuario (misma sesión, respeta RLS) -- crea SU propia suscripción
-- pendiente antes de redirigir a MercadoPago.
create policy "user can create own subscription"
  on public.subscriptions for insert
  with check (user_id = auth.uid());

-- Sin policy de UPDATE para el usuario: el estado (pending -> authorized/
-- paused/cancelled) lo escribe el webhook, que corre con el service role
-- (bypassa RLS) porque MercadoPago lo llama sin sesión de ningún usuario.
