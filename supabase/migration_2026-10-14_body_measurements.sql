-- Mediciones corporales para objetivos medibles de recomposición, déficit y volumen. Una fila por día y persona.
-- Se puede correr más de una vez (agrega solo lo que falta).
create table if not exists public.body_measurements (
  user_id uuid not null references auth.users(id) on delete cascade,
  fecha date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, fecha)
);
alter table public.body_measurements add column if not exists peso numeric;
alter table public.body_measurements add column if not exists altura numeric;
alter table public.body_measurements add column if not exists grasa_pct numeric;
alter table public.body_measurements add column if not exists cintura numeric;
alter table public.body_measurements add column if not exists cadera numeric;
alter table public.body_measurements add column if not exists gluteos numeric;
alter table public.body_measurements add column if not exists pecho numeric;
alter table public.body_measurements add column if not exists hombros numeric;
alter table public.body_measurements add column if not exists brazo numeric;
alter table public.body_measurements add column if not exists cuello numeric;
alter table public.body_measurements add column if not exists muneca numeric;
alter table public.body_measurements add column if not exists muslo numeric;
alter table public.body_measurements add column if not exists cuadriceps numeric;
alter table public.body_measurements add column if not exists gemelos numeric;
alter table public.body_measurements add column if not exists tobillos numeric;

alter table public.body_measurements enable row level security;
drop policy if exists "own measurements" on public.body_measurements;
create policy "own measurements"
  on public.body_measurements for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
