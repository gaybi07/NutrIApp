-- Sistema de incidencias para rutinas asignadas, ejecutadas desde
-- LiveWorkout.tsx. Reemplaza la tabla `incidents` de
-- migration_2026-09-21_add_trainer_module.sql (nunca se usó -- esa
-- dependía de workout_executions/assigned_sessions, que a su vez nunca se
-- cablearon: LiveWorkout sigue escribiendo directo en `days`, no en esas
-- tablas). routine_incidents es autosuficiente: no depende de esa
-- maquinaria sin terminar, solo de trainer_links (ya real y en uso).
drop trigger if exists incidents_update_guard on public.incidents;
drop function if exists public.trg_guard_incidents_update();
drop table if exists public.incidents;

create table public.routine_incidents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  trainer_id uuid not null references auth.users(id) on delete cascade,
  fecha date not null,
  -- Routine.id local (el string que ya genera newId() del lado del cliente
  -- para identificar la rutina dentro de Settings.routines del alumno) --
  -- no es un uuid de una tabla propia, por eso es texto libre.
  routine_id text not null,
  routine_nombre text not null default '',
  -- La TrainerRoutine de origen, si se puede resolver -- sobrevive aunque
  -- el alumno borre después su copia local adoptada.
  trainer_routine_id uuid references public.trainer_routines(id) on delete set null,
  tipo text not null check (
    tipo in ('omitido', 'reemplazado', 'comentario', 'comentario_final', 'serie_adicional', 'ejercicio_fuera_de_plan')
  ),
  -- Null solo en comentario_final (no apunta a un ejercicio puntual).
  ejercicio_nombre text,
  detalle text,
  visto_por_entrenador boolean not null default false,
  created_at timestamptz not null default now()
);

create index routine_incidents_student_fecha_idx on public.routine_incidents (student_id, fecha);
create index routine_incidents_trainer_visto_idx on public.routine_incidents (trainer_id, visto_por_entrenador);
create index routine_incidents_trainer_student_created_idx on public.routine_incidents (trainer_id, student_id, created_at desc);

alter table public.routine_incidents enable row level security;

-- El alumno solo puede reportar incidencias contra SU entrenador activo --
-- evita que alguien fabrique trainer_id de una cuenta a la que no está
-- vinculado y le llene la bandeja de incidencias falsas.
create policy "student can create own incidents"
  on public.routine_incidents for insert
  with check (
    student_id = auth.uid()
    and trainer_id in (
      select trainer_id from public.trainer_links
      where student_id = auth.uid() and status = 'activo'
    )
  );

create policy "student can view own incidents"
  on public.routine_incidents for select
  using (student_id = auth.uid());

create policy "trainer can view incidents of linked students"
  on public.routine_incidents for select
  using (trainer_id = auth.uid() and public.is_active_trainer_of(student_id));

create policy "trainer can mark incidents as seen"
  on public.routine_incidents for update
  using (trainer_id = auth.uid() and public.is_active_trainer_of(student_id));

-- RLS decide si el entrenador puede tocar la FILA; este trigger decide qué
-- CAMPO -- sin esto, la policy de update de arriba dejaría reescribir tipo/
-- detalle/etc., no solo marcarla como vista.
create or replace function public.trg_guard_routine_incidents_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() <> old.trainer_id then
    raise exception 'No autorizado';
  end if;
  if new.tipo <> old.tipo
    or new.detalle is distinct from old.detalle
    or new.ejercicio_nombre is distinct from old.ejercicio_nombre
    or new.student_id <> old.student_id
    or new.trainer_id <> old.trainer_id
    or new.fecha <> old.fecha
    or new.routine_id <> old.routine_id
    or new.routine_nombre <> old.routine_nombre
  then
    raise exception 'El entrenador solo puede marcar la incidencia como vista';
  end if;
  return new;
end;
$$;

create trigger routine_incidents_update_guard
  before update on public.routine_incidents
  for each row execute function public.trg_guard_routine_incidents_update();
