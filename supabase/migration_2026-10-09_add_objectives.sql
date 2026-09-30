-- Objetivos medibles que fija el profesional (Nutricionista / Entrenador) para un cliente, y su seguimiento.
--   tipo:      peso | kcal | proteina | sesiones | minutos | carga | pasos | sueno | agua | custom
--   direccion: min = llegar o superar la meta · max = no pasarse de la meta
--   ventana:   dia (se mide cada día; dias_por_semana cuántos días de la semana deben cumplirse) ·
--              semana (se mide por semana) · total (un valor puntual, ej. peso objetivo)
--   semanas_seguidas: para objetivos recurrentes, cuántas semanas seguidas cumpliéndolo para darlo por logrado.
-- La app detecta el logro con lo que carga el cliente y lo registra con mark_objective_achieved(); el profesional lo ve
-- y puede dejar un mensaje de felicitación / proponer el siguiente objetivo (mensaje_logro).

create table if not exists public.objectives (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  trainer_id uuid not null references auth.users(id) on delete cascade,
  disciplina text not null check (disciplina in ('fuerza', 'nutricion')),
  tipo text not null check (tipo in ('peso', 'kcal', 'proteina', 'sesiones', 'minutos', 'carga', 'pasos', 'sueno', 'agua', 'custom')),
  nombre text not null,
  meta numeric not null,
  unidad text not null default '',
  direccion text not null default 'min' check (direccion in ('min', 'max')),
  ventana text not null default 'semana' check (ventana in ('dia', 'semana', 'total')),
  dias_por_semana int not null default 5 check (dias_por_semana between 1 and 7),
  semanas_seguidas int not null default 2 check (semanas_seguidas between 1 and 12),
  ejercicio text,
  fecha_limite date,
  estado text not null default 'activo' check (estado in ('activo', 'logrado', 'archivado')),
  logrado_at timestamptz,
  mensaje_logro text,
  created_at timestamptz not null default now()
);
create index if not exists objectives_student_idx on public.objectives (student_id, estado);
create index if not exists objectives_trainer_idx on public.objectives (trainer_id, estado);

-- Marcas del cliente para objetivos que no salen de los datos de la app (agua, hábitos propios).
create table if not exists public.objective_checks (
  id uuid primary key default gen_random_uuid(),
  objective_id uuid not null references public.objectives(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  fecha date not null,
  valor numeric,
  cumplido boolean not null default true,
  unique (objective_id, fecha)
);
create index if not exists objective_checks_objective_idx on public.objective_checks (objective_id, fecha);

alter table public.objectives enable row level security;
alter table public.objective_checks enable row level security;

drop policy if exists "trainer and student can view objectives" on public.objectives;
create policy "trainer and student can view objectives"
  on public.objectives for select
  using (trainer_id = auth.uid() or student_id = auth.uid());

drop policy if exists "trainer creates objectives for linked students" on public.objectives;
create policy "trainer creates objectives for linked students"
  on public.objectives for insert
  with check (trainer_id = auth.uid() and public.is_active_trainer_of(student_id, disciplina));

drop policy if exists "trainer updates own objectives" on public.objectives;
create policy "trainer updates own objectives"
  on public.objectives for update
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

drop policy if exists "trainer deletes own objectives" on public.objectives;
create policy "trainer deletes own objectives"
  on public.objectives for delete
  using (trainer_id = auth.uid());

drop policy if exists "student manages own checks" on public.objective_checks;
create policy "student manages own checks"
  on public.objective_checks for all
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

drop policy if exists "trainer reads checks of own objectives" on public.objective_checks;
create policy "trainer reads checks of own objectives"
  on public.objective_checks for select
  using (objective_id in (select id from public.objectives where trainer_id = auth.uid()));

-- El cliente no puede editar el objetivo, pero la app sí tiene que poder marcarlo como logrado cuando lo detecta.
create or replace function public.mark_objective_achieved(p_objective_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.objectives
    set estado = 'logrado', logrado_at = now()
    where id = p_objective_id and student_id = auth.uid() and estado = 'activo';
end;
$$;

grant execute on function public.mark_objective_achieved(uuid) to authenticated;
