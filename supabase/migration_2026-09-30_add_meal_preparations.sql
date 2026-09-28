-- Preparaciones guardadas, por usuario -- antes vivían 100% en localStorage
-- (ver lib/useMealPreparations.ts), así que no sincronizaban entre
-- dispositivos (guardarlas en el celu no las mostraba en la PC con la misma
-- cuenta). Mismo patrón que user_settings/days: una fila por usuario,
-- policy "for all" con auth.uid() = user_id, sin RPCs (acá no hay
-- escritura cross-usuario como en shared_preparations).

create table public.meal_preparations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  categoria text not null,
  ingredientes jsonb not null default '[]'::jsonb, -- string[] (nombres) -- compat con lo viejo
  ingredientes_detalle jsonb, -- PreparationIngredient[] | null
  porciones integer,
  meal text check (meal in ('des', 'alm', 'mer', 'cen', 'col')),
  shared_preparation_id uuid references public.shared_preparations(id),
  veces_usada integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index meal_preparations_user_idx on public.meal_preparations (user_id);

alter table public.meal_preparations enable row level security;

create policy "user administra sus propias preparaciones"
  on public.meal_preparations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
