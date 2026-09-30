-- Alacena compartida: cada integrante "exporta su parte" de la semana (las comidas que eligió, con sus ingredientes).
-- La lista de compras del grupo solo se arma cuando exportaron todos; se calcula con la suma de las partes y el stock
-- compartido. Cada integrante ve el estado de los demás (quién exportó y quién falta).
--   items: [ { "fecha": "2026-10-05", "meal": "alm", "title": "...", "ingredients": [ { "name", "quantity", "unit" } ] } ]

create table if not exists public.household_week_selections (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  nombre text not null default '',
  items jsonb not null default '[]'::jsonb,
  exported_at timestamptz not null default now(),
  unique (household_id, user_id, week_start)
);

create index if not exists household_week_selections_household_idx on public.household_week_selections (household_id, week_start);

alter table public.household_week_selections enable row level security;

drop policy if exists "members can view the group's exported selections" on public.household_week_selections;
create policy "members can view the group's exported selections"
  on public.household_week_selections for select
  using (household_id in (select * from public.my_household_ids()));

drop policy if exists "member manages own exported selection" on public.household_week_selections;
create policy "member manages own exported selection"
  on public.household_week_selections for all
  using (user_id = auth.uid() and household_id in (select * from public.my_household_ids()))
  with check (user_id = auth.uid() and household_id in (select * from public.my_household_ids()));
