-- Módulo Entrenador: planificación semanal, sesiones asignadas, ejecución,
-- incidencias, observaciones y reportes. Se apoya en lo que ya existe
-- (trainer_applications, trainer_links, trainer_routines) y sigue el mismo
-- idioma: funciones SECURITY DEFINER para las altas que necesitan validar
-- algo antes de insertar (acá: publicar un plan, cerrar una sesión), en vez
-- de policies de INSERT directas.
--
-- Fuera de alcance de esta migración (a propósito): no se toca ningún hook
-- ni componente. `useTrainerLink.leave()` sigue haciendo DELETE físico de
-- trainer_links -- la columna `status` que se agrega acá queda lista para
-- cuando se actualice esa lógica, pero mientras tanto todo sigue
-- funcionando igual (is_active_trainer_of() da false en ambos casos).

-- ============================================================
-- 1. Alters sobre tablas existentes
-- ============================================================

-- El alumno no diseña rutinas: solo se le puede asignar una rutina que el
-- entrenador ya marcó como "publicada" -- borrador/archivada quedan fuera
-- del set asignable sin tener que borrar nada.
alter table public.trainer_routines
  add column if not exists status text not null default 'publicada'
  check (status in ('borrador', 'publicada', 'archivada'));

create index if not exists trainer_routines_trainer_status_idx
  on public.trainer_routines (trainer_id, status);

-- Vínculo con estado explícito en vez de solo "existe o no existe la fila"
-- -- necesario para que un entrenador pueda seguir leyendo sus reportes ya
-- generados de un ex-alumno sin por eso recuperar acceso a sus datos en vivo.
alter table public.trainer_links
  add column if not exists status text not null default 'activo'
  check (status in ('activo', 'finalizado'));
alter table public.trainer_links
  add column if not exists ended_at timestamptz;

create index if not exists trainer_links_trainer_status_idx
  on public.trainer_links (trainer_id, status);

-- ============================================================
-- 2. Función helper -- única fuente de verdad de "¿tengo vínculo activo
--    con este alumno?", usada en todas las policies de abajo.
-- ============================================================

create or replace function public.is_active_trainer_of(p_student_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(
    select 1 from public.trainer_links
    where student_id = p_student_id
      and trainer_id = auth.uid()
      and status = 'activo'
  );
$$;

grant execute on function public.is_active_trainer_of(uuid) to authenticated;

-- ============================================================
-- 3. training_plans -- autoría del entrenador: qué rutina va cada día de
--    una semana, para un alumno puntual.
-- ============================================================

create table public.training_plans (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  -- Lunes de la semana que planifica (misma convención que isoMonday() del
  -- lado de la app) -- el check evita cargar por error cualquier otro día.
  week_start date not null check (extract(dow from week_start) = 1),
  -- Weekday -> id de trainer_routines, mismo shape que TrainingSchedule.
  days jsonb not null default '{}'::jsonb,
  status text not null default 'borrador' check (status in ('borrador', 'publicado')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trainer_id, student_id, week_start)
);

create index training_plans_student_week_idx on public.training_plans (student_id, week_start);
create index training_plans_trainer_status_idx on public.training_plans (trainer_id, status);

alter table public.training_plans enable row level security;

-- Solo el entrenador interactúa con esta tabla directamente -- el alumno la
-- lee indirectamente a través de las assigned_sessions que genera al
-- publicarse (ver más abajo).
create policy "trainer manages own training plans"
  on public.training_plans for all
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid() and public.is_active_trainer_of(student_id));

-- ============================================================
-- 4. assigned_sessions -- instancia concreta y fechada. Nace solo de
--    publish_training_plan() (ver §8); update directo permitido pero
--    acotado por trigger según quién lo hace.
-- ============================================================

create table public.assigned_sessions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.training_plans(id) on delete cascade,
  -- Denormalizado a propósito (no cambia nunca tras crearse la fila): evita
  -- un join a training_plans en cada policy de esta tabla.
  trainer_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  routine_id uuid references public.trainer_routines(id) on delete set null,
  -- Ejercicios congelados al momento de asignar (ExerciseEntry[]) -- si el
  -- entrenador edita la rutina después, esta sesión no cambia retroactivamente.
  routine_snapshot jsonb not null default '[]'::jsonb,
  routine_nombre text not null default '',
  fecha_planificada date not null,
  -- No cambia al moverse -- guarda con qué fecha nació la sesión.
  fecha_original date not null,
  status text not null default 'planificada'
    check (status in ('planificada', 'movida', 'en_curso', 'completada', 'vencida', 'cancelada')),
  moved_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assigned_sessions_student_fecha_idx on public.assigned_sessions (student_id, fecha_planificada);
create index assigned_sessions_trainer_student_idx on public.assigned_sessions (trainer_id, student_id);
create index assigned_sessions_plan_idx on public.assigned_sessions (plan_id);

-- Un alumno no puede tener dos sesiones activas el mismo día -- se ignoran
-- las canceladas (esas no "ocupan" la fecha).
create unique index assigned_sessions_student_fecha_active_idx
  on public.assigned_sessions (student_id, fecha_planificada)
  where status <> 'cancelada';

alter table public.assigned_sessions enable row level security;

create policy "student can view own assigned sessions"
  on public.assigned_sessions for select
  using (student_id = auth.uid());

create policy "trainer can view assigned sessions of linked students"
  on public.assigned_sessions for select
  using (trainer_id = auth.uid() and public.is_active_trainer_of(student_id));

-- Sin policy de INSERT: toda fila nace de publish_training_plan() (SECURITY
-- DEFINER), que ya valida que la rutina esté publicada y no pisa sesiones
-- en curso. Esto evita que alguien inserte una sesión "a mano" sin pasar
-- por esas reglas.

create policy "student can update own assigned sessions"
  on public.assigned_sessions for update
  using (student_id = auth.uid());

create policy "trainer can update assigned sessions of linked students"
  on public.assigned_sessions for update
  using (trainer_id = auth.uid() and public.is_active_trainer_of(student_id));

-- ============================================================
-- 5. workout_executions -- lo que realmente pasó. 0..1 respecto a la
--    sesión; nace solo de complete_assigned_session() (ver §8).
-- ============================================================

create table public.workout_executions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.assigned_sessions(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  trainer_id uuid not null references auth.users(id) on delete cascade,
  -- ExerciseEntry[] real, con sets (repeticiones/peso/intensidad = esfuerzo).
  ejercicios jsonb not null default '[]'::jsonb,
  duracion_minutos integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workout_executions_student_idx on public.workout_executions (student_id);
create index workout_executions_trainer_idx on public.workout_executions (trainer_id);

alter table public.workout_executions enable row level security;

create policy "student can view own workout executions"
  on public.workout_executions for select
  using (student_id = auth.uid());

create policy "trainer can view workout executions of linked students"
  on public.workout_executions for select
  using (trainer_id = auth.uid() and public.is_active_trainer_of(student_id));

-- Sin policy de INSERT/UPDATE: solo complete_assigned_session() escribe acá,
-- de forma atómica junto con el cierre de la sesión.

-- ============================================================
-- 6. incidents -- omitido / reemplazado / serie adicional / comentario
--    libre. Registro inmutable del lado del alumno una vez creado.
-- ============================================================

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid not null references public.workout_executions(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  trainer_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('omitido', 'reemplazado', 'serie_adicional', 'comentario_libre')),
  -- Null en comentario_libre general (no apunta a un ejercicio puntual).
  ejercicio_nombre text,
  detalle text,
  visto_por_entrenador boolean not null default false,
  created_at timestamptz not null default now()
);

create index incidents_execution_idx on public.incidents (execution_id);
create index incidents_student_created_idx on public.incidents (student_id, created_at desc);
create index incidents_trainer_visto_idx on public.incidents (trainer_id, visto_por_entrenador);

alter table public.incidents enable row level security;

create policy "student can create own incidents"
  on public.incidents for insert
  with check (
    student_id = auth.uid()
    and exists (
      select 1 from public.workout_executions e
      where e.id = execution_id and e.student_id = auth.uid()
    )
  );

create policy "student can view own incidents"
  on public.incidents for select
  using (student_id = auth.uid());

create policy "trainer can view incidents of linked students"
  on public.incidents for select
  using (trainer_id = auth.uid() and public.is_active_trainer_of(student_id));

create policy "trainer can update incidents of linked students"
  on public.incidents for update
  using (trainer_id = auth.uid() and public.is_active_trainer_of(student_id));

-- ============================================================
-- 7. observations -- mensaje del entrenador al alumno (una sola vía).
-- ============================================================

create table public.observations (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  scope text not null default 'general' check (scope in ('session', 'week', 'general')),
  session_id uuid references public.assigned_sessions(id) on delete set null,
  week_start date,
  texto text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (scope = 'session' and session_id is not null and week_start is null)
    or (scope = 'week' and week_start is not null and session_id is null)
    or (scope = 'general' and session_id is null and week_start is null)
  )
);

create index observations_student_read_idx on public.observations (student_id, read_at);
create index observations_trainer_student_idx on public.observations (trainer_id, student_id, created_at desc);

alter table public.observations enable row level security;

create policy "trainer can create observations for linked students"
  on public.observations for insert
  with check (trainer_id = auth.uid() and public.is_active_trainer_of(student_id));

create policy "trainer can view own observations"
  on public.observations for select
  using (trainer_id = auth.uid());

create policy "student can view own observations"
  on public.observations for select
  using (student_id = auth.uid());

create policy "student can mark own observations as read"
  on public.observations for update
  using (student_id = auth.uid());

-- ============================================================
-- 8. reports -- snapshot de métricas de un período. Sobrevive a que el
--    vínculo se finalice (a diferencia de assigned_sessions/incidents, que
--    dejan de ser legibles para el entrenador al desvincularse).
-- ============================================================

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  period_end date not null check (period_end >= period_start),
  status text not null default 'borrador' check (status in ('borrador', 'generado', 'enviado')),
  -- Snapshot calculado (adherencia, volumen, incidencias, etc.) -- ver
  -- sección de métricas del diseño del módulo.
  metrics jsonb not null default '{}'::jsonb,
  trainer_comment text,
  generated_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index reports_student_status_idx on public.reports (student_id, status);
create index reports_trainer_student_idx on public.reports (trainer_id, student_id);

alter table public.reports enable row level security;

-- El entrenador conserva lectura/edición de sus propios reportes ya
-- generados aunque el vínculo se haya finalizado -- solo crear uno NUEVO
-- requiere vínculo activo (no se puede fabricar un reporte de datos a los
-- que ya no se tiene acceso).
create policy "trainer can create reports for linked students"
  on public.reports for insert
  with check (trainer_id = auth.uid() and public.is_active_trainer_of(student_id));

create policy "trainer manages own reports"
  on public.reports for update
  using (trainer_id = auth.uid());

create policy "trainer can view own reports"
  on public.reports for select
  using (trainer_id = auth.uid());

-- El alumno solo ve reportes ya enviados -- los borradores son superficie
-- de trabajo del entrenador.
create policy "student can view sent reports"
  on public.reports for select
  using (student_id = auth.uid() and status = 'enviado');

-- ============================================================
-- 9. Triggers de guarda -- RLS decide si se puede tocar la FILA; estos
--    triggers deciden qué CAMPOS puede tocar cada rol dentro de esa fila,
--    algo que una policy sola no puede expresar.
-- ============================================================

create or replace function public.trg_guard_assigned_sessions_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() = old.student_id then
    if new.trainer_id <> old.trainer_id
      or new.plan_id <> old.plan_id
      or new.student_id <> old.student_id
      or new.routine_id is distinct from old.routine_id
      or new.routine_snapshot <> old.routine_snapshot
      or new.routine_nombre <> old.routine_nombre
      or new.fecha_original <> old.fecha_original
    then
      raise exception 'El alumno no puede modificar esos campos';
    end if;
    if old.status = 'planificada' and new.status not in ('planificada', 'movida', 'en_curso') then
      raise exception 'Transición de estado no permitida';
    elsif old.status = 'movida' and new.status not in ('movida', 'en_curso') then
      raise exception 'Transición de estado no permitida';
    elsif old.status in ('completada', 'vencida', 'cancelada') then
      raise exception 'La sesión ya está cerrada';
    end if;
    if new.status = 'movida' and new.fecha_planificada <> old.fecha_planificada then
      new.moved_at := now();
    end if;
    if new.status = 'en_curso' and old.status <> 'en_curso' then
      new.started_at := now();
    end if;
    new.updated_at := now();
    return new;
  elsif auth.uid() = old.trainer_id then
    if old.status = 'completada' then
      raise exception 'No se puede modificar una sesión ya completada';
    end if;
    if new.student_id <> old.student_id or new.plan_id <> old.plan_id or new.trainer_id <> old.trainer_id then
      raise exception 'El entrenador no puede reasignar esos campos';
    end if;
    if new.status not in ('planificada', 'cancelada') then
      raise exception 'El entrenador solo puede reprogramar (vuelve a planificada) o cancelar';
    end if;
    new.updated_at := now();
    return new;
  else
    raise exception 'No autorizado';
  end if;
end;
$$;

create trigger assigned_sessions_update_guard
  before update on public.assigned_sessions
  for each row execute function public.trg_guard_assigned_sessions_update();

create or replace function public.trg_guard_observations_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() <> old.student_id then
    raise exception 'No autorizado';
  end if;
  if new.texto <> old.texto
    or new.scope <> old.scope
    or new.trainer_id <> old.trainer_id
    or new.student_id <> old.student_id
    or new.session_id is distinct from old.session_id
    or new.week_start is distinct from old.week_start
  then
    raise exception 'El alumno solo puede marcar la observación como leída';
  end if;
  if old.read_at is not null then
    raise exception 'La observación ya estaba marcada como leída';
  end if;
  new.read_at := now();
  return new;
end;
$$;

create trigger observations_update_guard
  before update on public.observations
  for each row execute function public.trg_guard_observations_update();

create or replace function public.trg_guard_incidents_update()
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
    or new.execution_id <> old.execution_id
    or new.student_id <> old.student_id
    or new.trainer_id <> old.trainer_id
  then
    raise exception 'El entrenador solo puede marcar la incidencia como vista';
  end if;
  return new;
end;
$$;

create trigger incidents_update_guard
  before update on public.incidents
  for each row execute function public.trg_guard_incidents_update();

-- ============================================================
-- 10. RPCs de negocio -- únicos puntos de entrada para crear
--     assigned_sessions y workout_executions (ver §4 y §5).
-- ============================================================

-- Genera/actualiza las assigned_sessions de una semana a partir de
-- training_plans.days. No pisa sesiones que el alumno ya movió, empezó o
-- completó -- solo crea las que faltan o actualiza las que siguen en
-- "planificada" tal cual las dejó el entrenador la vez anterior.
create or replace function public.publish_training_plan(p_plan_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan public.training_plans%rowtype;
  v_routine public.trainer_routines%rowtype;
  v_weekday text;
  v_routine_id_text text;
  v_routine_id uuid;
  v_offset int;
  v_fecha date;
  v_existing_id uuid;
  v_existing_status text;
begin
  select * into v_plan from public.training_plans where id = p_plan_id;
  if not found then
    raise exception 'Plan no encontrado';
  end if;
  if v_plan.trainer_id <> auth.uid() then
    raise exception 'No autorizado';
  end if;

  for v_weekday, v_routine_id_text in
    select key, value from jsonb_each_text(v_plan.days)
  loop
    v_offset := case v_weekday
      when 'lunes' then 0 when 'martes' then 1 when 'miercoles' then 2
      when 'jueves' then 3 when 'viernes' then 4 when 'sabado' then 5
      when 'domingo' then 6 else null
    end;
    if v_offset is null or v_routine_id_text is null or v_routine_id_text = '' then
      continue; -- clave inesperada o día sin rutina asignada
    end if;
    v_routine_id := v_routine_id_text::uuid;
    v_fecha := v_plan.week_start + v_offset;

    select * into v_routine from public.trainer_routines
      where id = v_routine_id and trainer_id = auth.uid();
    if not found or v_routine.status <> 'publicada' then
      raise exception 'Rutina % no disponible para asignar', v_routine_id;
    end if;

    select id, status into v_existing_id, v_existing_status
      from public.assigned_sessions
      where student_id = v_plan.student_id and fecha_planificada = v_fecha and status <> 'cancelada';

    if not found then
      insert into public.assigned_sessions (
        plan_id, trainer_id, student_id, routine_id, routine_snapshot, routine_nombre,
        fecha_planificada, fecha_original, status
      ) values (
        p_plan_id, auth.uid(), v_plan.student_id, v_routine.id, v_routine.ejercicios, v_routine.nombre,
        v_fecha, v_fecha, 'planificada'
      );
    elsif v_existing_status = 'planificada' then
      update public.assigned_sessions
        set routine_id = v_routine.id,
            routine_snapshot = v_routine.ejercicios,
            routine_nombre = v_routine.nombre,
            plan_id = p_plan_id,
            updated_at = now()
        where id = v_existing_id;
    end if;
    -- si ya está movida/en_curso/completada/vencida, se deja como está --
    -- no se pisa trabajo que el alumno ya empezó.
  end loop;

  update public.training_plans
    set status = 'publicado', published_at = now(), updated_at = now()
    where id = p_plan_id;
end;
$$;

grant execute on function public.publish_training_plan(uuid) to authenticated;

-- Cierra una sesión: crea (o reemplaza) su workout_execution y la marca
-- completada, en una sola transacción -- evita el estado inconsistente de
-- "en_curso pero sin ejecución" si el segundo paso fallara por separado.
create or replace function public.complete_assigned_session(
  p_session_id uuid,
  p_ejercicios jsonb,
  p_duracion_minutos int default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.assigned_sessions%rowtype;
  v_execution_id uuid;
begin
  select * into v_session from public.assigned_sessions where id = p_session_id;
  if not found then
    raise exception 'Sesión no encontrada';
  end if;
  if v_session.student_id <> auth.uid() then
    raise exception 'No autorizado';
  end if;
  if v_session.status not in ('planificada', 'movida', 'en_curso') then
    raise exception 'La sesión no se puede cerrar desde el estado %', v_session.status;
  end if;

  insert into public.workout_executions (session_id, student_id, trainer_id, ejercicios, duracion_minutos)
    values (p_session_id, v_session.student_id, v_session.trainer_id, p_ejercicios, p_duracion_minutos)
    on conflict (session_id) do update set
      ejercicios = excluded.ejercicios,
      duracion_minutos = excluded.duracion_minutos,
      updated_at = now()
    returning id into v_execution_id;

  update public.assigned_sessions
    set status = 'completada',
        started_at = coalesce(started_at, now()),
        completed_at = now(),
        updated_at = now()
    where id = p_session_id;

  return v_execution_id;
end;
$$;

grant execute on function public.complete_assigned_session(uuid, jsonb, int) to authenticated;

-- Mantenimiento: pasa a "vencida" las sesiones cuya fecha ya pasó y que el
-- alumno nunca abrió ni movió. Idempotente y sin efectos secundarios entre
-- usuarios -- se puede llamar desde pg_cron (si la extensión está
-- habilitada en el proyecto) o disparar de forma oportunista desde la app.
create or replace function public.mark_overdue_sessions()
returns void
language sql
security definer
set search_path = public
as $$
  update public.assigned_sessions
    set status = 'vencida', updated_at = now()
    where status in ('planificada', 'movida')
      and fecha_planificada < current_date;
$$;

grant execute on function public.mark_overdue_sessions() to authenticated;

-- ============================================================
-- 11. Realtime -- mismo patrón que households: el alumno ve su semana
--     publicada y las observaciones nuevas sin tener que refrescar.
-- ============================================================

alter publication supabase_realtime add table public.assigned_sessions;
alter publication supabase_realtime add table public.observations;
