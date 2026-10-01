-- Mediciones corporales (cintura, % de grasa, etc.) para objetivos medibles de recomposición, déficit y volumen.
-- Cada persona carga las suyas; una fila por día.
create table if not exists public.body_measurements (
  user_id uuid not null references auth.users(id) on delete cascade,
  fecha date not null,
  peso numeric,
  grasa_pct numeric,
  cintura numeric,
  cadera numeric,
  pecho numeric,
  brazo numeric,
  muslo numeric,
  created_at timestamptz not null default now(),
  primary key (user_id, fecha)
);

alter table public.body_measurements enable row level security;
drop policy if exists "own measurements" on public.body_measurements;
create policy "own measurements"
  on public.body_measurements for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
