-- Selección del paciente sobre el plan semanal de la Nutricionista: qué opción eligió en cada comida de la
-- semana que viene, por qué la eligió y qué cambio sugiere. La Nutricionista la ve en la ficha del paciente.
--   selections: { "2026-10-05": { "des": "Nombre de la opción", "alm": "..." }, ... }
--   feedback:   { "2026-10-05": { "des": { "motivo": "...", "sugerencia": "..." } }, ... }

create table if not exists public.plan_selections (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  disciplina text not null default 'nutricion' check (disciplina in ('fuerza', 'nutricion')),
  selections jsonb not null default '{}'::jsonb,
  feedback jsonb not null default '{}'::jsonb,
  comentario text,
  status text not null default 'enviado' check (status in ('borrador', 'enviado')),
  sent_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (student_id, week_start, disciplina)
);

create index if not exists plan_selections_student_idx on public.plan_selections (student_id, week_start);

alter table public.plan_selections enable row level security;

drop policy if exists "student manages own plan selections" on public.plan_selections;
create policy "student manages own plan selections"
  on public.plan_selections for all
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

drop policy if exists "nutricionista can view linked student plan selections" on public.plan_selections;
create policy "nutricionista can view linked student plan selections"
  on public.plan_selections for select
  using (public.is_active_trainer_of(student_id, disciplina));
