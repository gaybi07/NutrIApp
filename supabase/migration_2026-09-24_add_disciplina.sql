-- Rol Nutricionista, fase 0: agrega `disciplina` ('fuerza' | 'nutricion') a
-- todo el esqueleto de Entrenador/Alumno ya construido, en vez de crear
-- tablas nuevas (decisión de los tickets 01/02 del mapa apk-completa).
--
-- Regla de esta migración: TODO default queda en 'fuerza', así que ninguna
-- fila ni llamada existente cambia de comportamiento -- el flujo Profe↔Alumno
-- de hoy sigue funcionando byte a byte igual. Esta migración solo ABRE la
-- puerta a que 'nutricion' exista en paralelo; no construye ninguna pantalla
-- ni RPC de Plan Nutricional todavía (eso es una fase aparte).

-- ============================================================
-- 1. trainer_applications -- una persona puede postularse como Profe Y
--    como Nutricionista, cada una su propia fila/revisión.
-- ============================================================

alter table public.trainer_applications
  add column if not exists disciplina text not null default 'fuerza'
  check (disciplina in ('fuerza', 'nutricion'));

alter table public.trainer_applications
  drop constraint if exists trainer_applications_user_id_key;
alter table public.trainer_applications
  add constraint trainer_applications_user_id_disciplina_key unique (user_id, disciplina);

-- ============================================================
-- 2. trainer_invites -- el código ya sabe para qué disciplina es (se fija
--    al generarlo, no lo elige quien lo usa) -- así request_trainer_link no
--    necesita confiar en un parámetro del cliente para decidir la disciplina.
-- ============================================================

alter table public.trainer_invites
  add column if not exists disciplina text not null default 'fuerza'
  check (disciplina in ('fuerza', 'nutricion'));

create or replace function public.generate_trainer_invite_code(p_disciplina text default 'fuerza')
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_trainer boolean;
  v_code text;
begin
  if p_disciplina not in ('fuerza', 'nutricion') then
    raise exception 'Disciplina inválida';
  end if;

  select exists(
    select 1 from public.trainer_applications
    where user_id = auth.uid() and disciplina = p_disciplina and status = 'aprobado'
  ) into v_is_trainer;

  if not v_is_trainer then
    raise exception 'Todavía no sos un % aprobado', case when p_disciplina = 'nutricion' then 'nutricionista' else 'entrenador' end;
  end if;

  v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  insert into public.trainer_invites (code, trainer_id, created_by, disciplina)
    values (v_code, auth.uid(), auth.uid(), p_disciplina);
  return v_code;
end;
$$;

grant execute on function public.generate_trainer_invite_code(text) to authenticated;

-- ============================================================
-- 3. trainer_links -- la PK era `student_id` solo (un vínculo por alumno,
--    total); pasa a (student_id, disciplina) para permitir Profe Y
--    Nutricionista a la vez. Todo `on conflict(student_id)` de las RPCs de
--    abajo pasa a `on conflict(student_id, disciplina)`.
-- ============================================================

alter table public.trainer_links
  add column if not exists disciplina text not null default 'fuerza'
  check (disciplina in ('fuerza', 'nutricion'));

alter table public.trainer_links drop constraint trainer_links_pkey;
alter table public.trainer_links add primary key (student_id, disciplina);

-- my_trainer_id() es exclusiva de fuerza (solo trainer_routines la usa, y
-- esa tabla es fuerza-only por diseño) -- se fija a 'fuerza' explícitamente
-- para no cambiar su comportamiento aunque la PK ya no sea de una sola columna.
create or replace function public.my_trainer_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select trainer_id from public.trainer_links where student_id = auth.uid() and disciplina = 'fuerza';
$$;

-- ============================================================
-- 4. trainer_link_requests -- el índice "una solicitud pendiente por
--    alumno" pasa a ser por (alumno, disciplina), para poder tener una
--    solicitud pendiente a un Profe y otra a un Nutricionista a la vez.
-- ============================================================

alter table public.trainer_link_requests
  add column if not exists disciplina text not null default 'fuerza'
  check (disciplina in ('fuerza', 'nutricion'));

drop index if exists trainer_link_requests_student_pending_idx;
create unique index trainer_link_requests_student_pending_idx
  on public.trainer_link_requests (student_id, disciplina)
  where status = 'pendiente';

-- ============================================================
-- 5. is_active_trainer_of -- único gate de lectura del profesional sobre
--    los datos de un alumno. Default 'fuerza' => cero policies existentes
--    necesitan tocarse (siguen llamándola con un solo argumento).
-- ============================================================

create or replace function public.is_active_trainer_of(p_student_id uuid, p_disciplina text default 'fuerza')
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
      and disciplina = p_disciplina
  );
$$;

grant execute on function public.is_active_trainer_of(uuid, text) to authenticated;

-- ============================================================
-- 6. request_trainer_link / respond_trainer_link_request -- la disciplina
--    la fija el invite code usado, no un parámetro que el cliente podría
--    manipular. Se agrega además la regla de plan: Premium cubre UN
--    vínculo (cualquier disciplina), Premium+ cubre los dos a la vez.
-- ============================================================

create or replace function public.request_trainer_link(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trainer_id uuid;
  v_disciplina text;
  v_trainer_email text;
  v_student_email text;
  v_student_plan text;
  v_request_id uuid;
  v_already_linked boolean;
  v_other_discipline_linked boolean;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  select plan into v_student_plan from public.user_settings where user_id = auth.uid();
  if coalesce(v_student_plan, 'basico') = 'basico' then
    raise exception 'Necesitás un plan pago para vincularte a un entrenador o nutricionista';
  end if;

  select trainer_id, disciplina into v_trainer_id, v_disciplina
    from public.trainer_invites
    where code = upper(trim(p_code));
  if v_trainer_id is null then
    raise exception 'Código inválido';
  end if;
  if v_trainer_id = auth.uid() then
    raise exception 'No podés vincularte a vos mismo';
  end if;

  select exists(
    select 1 from public.trainer_links
    where student_id = auth.uid() and disciplina = v_disciplina and status = 'activo'
  ) into v_already_linked;
  if v_already_linked then
    raise exception 'Ya estás vinculado a un % activo', case when v_disciplina = 'nutricion' then 'nutricionista' else 'entrenador' end;
  end if;

  -- Premium (no Premium+) cubre un solo vínculo total, sea de la disciplina
  -- que sea -- si ya tiene uno activo en la OTRA disciplina, necesita Premium+.
  if v_student_plan = 'premium' then
    select exists(
      select 1 from public.trainer_links
      where student_id = auth.uid() and disciplina <> v_disciplina and status = 'activo'
    ) into v_other_discipline_linked;
    if v_other_discipline_linked then
      raise exception 'Tu plan Premium permite un solo vínculo -- necesitás Premium+ para tener Profe y Nutricionista a la vez';
    end if;
  end if;

  select email into v_trainer_email from auth.users where id = v_trainer_id;
  v_student_email := auth.jwt() ->> 'email';

  update public.trainer_link_requests
    set trainer_id = v_trainer_id,
        trainer_email = coalesce(v_trainer_email, ''),
        student_email = coalesce(v_student_email, ''),
        created_at = now()
    where student_id = auth.uid() and disciplina = v_disciplina and status = 'pendiente'
    returning id into v_request_id;

  if v_request_id is null then
    insert into public.trainer_link_requests (trainer_id, student_id, trainer_email, student_email, disciplina)
      values (v_trainer_id, auth.uid(), coalesce(v_trainer_email, ''), coalesce(v_student_email, ''), v_disciplina)
      returning id into v_request_id;
  end if;

  return v_request_id;
end;
$$;

create or replace function public.respond_trainer_link_request(
  p_request_id uuid,
  p_decision text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.trainer_link_requests%rowtype;
  v_max_students int;
  v_active_count int;
begin
  if p_decision not in ('aceptada', 'rechazada') then
    raise exception 'Decisión inválida';
  end if;

  select * into v_request from public.trainer_link_requests where id = p_request_id;
  if not found then
    raise exception 'Solicitud no encontrada';
  end if;
  if v_request.trainer_id <> auth.uid() then
    raise exception 'No autorizado';
  end if;
  if v_request.status <> 'pendiente' then
    raise exception 'Esta solicitud ya fue respondida';
  end if;

  if p_decision = 'aceptada' then
    select max_students into v_max_students
      from public.trainer_applications
      where user_id = auth.uid() and disciplina = v_request.disciplina;
    select count(*) into v_active_count
      from public.trainer_links
      where trainer_id = auth.uid() and disciplina = v_request.disciplina and status = 'activo';
    if v_active_count >= coalesce(v_max_students, 1) then
      raise exception 'Llegaste al límite de alumnos de tu plan';
    end if;
  end if;

  update public.trainer_link_requests
    set status = p_decision, responded_at = now(), response_note = p_note
    where id = p_request_id;

  if p_decision = 'aceptada' then
    insert into public.trainer_links (student_id, trainer_id, trainer_email, student_email, status, disciplina)
      values (v_request.student_id, v_request.trainer_id, v_request.trainer_email, v_request.student_email, 'activo', v_request.disciplina)
      on conflict (student_id, disciplina) do update set
        trainer_id = excluded.trainer_id,
        trainer_email = excluded.trainer_email,
        student_email = excluded.student_email,
        status = 'activo',
        ended_at = null,
        created_at = now();
  end if;
end;
$$;

-- ============================================================
-- 7. training_plans / assigned_sessions / reports -- disciplina agregada a
--    cada constraint único. `days`/`routine_snapshot`/`metrics` ya son
--    jsonb -- sin cambio de tipo, listos para guardar Meal Options el día
--    que se construya el planificador de Nutricionista.
-- ============================================================

alter table public.training_plans
  add column if not exists disciplina text not null default 'fuerza'
  check (disciplina in ('fuerza', 'nutricion'));
alter table public.training_plans drop constraint if exists training_plans_trainer_id_student_id_week_start_key;
alter table public.training_plans
  add constraint training_plans_trainer_student_week_disciplina_key
  unique (trainer_id, student_id, week_start, disciplina);

alter table public.assigned_sessions
  add column if not exists disciplina text not null default 'fuerza'
  check (disciplina in ('fuerza', 'nutricion'));
drop index if exists assigned_sessions_student_fecha_active_idx;
create unique index assigned_sessions_student_fecha_active_idx
  on public.assigned_sessions (student_id, fecha_planificada, disciplina)
  where status <> 'cancelada';

alter table public.reports
  add column if not exists disciplina text not null default 'fuerza'
  check (disciplina in ('fuerza', 'nutricion'));
alter table public.reports drop constraint if exists reports_trainer_student_period_unique;
alter table public.reports
  add constraint reports_trainer_student_period_disciplina_unique
  unique (trainer_id, student_id, period_start, disciplina);

-- publish_training_plan: sin cambio de firma -- la disciplina del plan ya
-- viaja en la fila (`v_plan.disciplina`), así que la sesión que genera hereda
-- la misma sin necesitar un parámetro nuevo.
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
      continue;
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
      where student_id = v_plan.student_id and fecha_planificada = v_fecha
        and disciplina = v_plan.disciplina and status <> 'cancelada';

    if not found then
      insert into public.assigned_sessions (
        plan_id, trainer_id, student_id, routine_id, routine_snapshot, routine_nombre,
        fecha_planificada, fecha_original, status, disciplina
      ) values (
        p_plan_id, auth.uid(), v_plan.student_id, v_routine.id, v_routine.ejercicios, v_routine.nombre,
        v_fecha, v_fecha, 'planificada', v_plan.disciplina
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
  end loop;

  update public.training_plans
    set status = 'publicado', published_at = now(), updated_at = now()
    where id = p_plan_id;
end;
$$;

-- generate_student_report: agrega p_disciplina (default 'fuerza' => llamados
-- existentes sin cambios) -- el conteo de routine_incidents queda intacto a
-- propósito (es exclusivo de fuerza, ticket 02); un reporte de nutrición
-- simplemente no va a tener incidencias hasta que se construya esa fase.
create or replace function public.generate_student_report(p_student_id uuid, p_period_start date, p_disciplina text default 'fuerza')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_metrics jsonb;
  v_period_end date;
  v_incident_counts jsonb;
  v_incident_total int;
  v_report_id uuid;
begin
  if not public.is_active_trainer_of(p_student_id, p_disciplina) then
    raise exception 'No autorizado';
  end if;

  v_period_end := p_period_start + 6;
  v_metrics := public.get_student_metrics(p_student_id, p_period_start);

  select count(*) into v_incident_total
    from public.routine_incidents
    where student_id = p_student_id and trainer_id = auth.uid()
      and fecha >= p_period_start and fecha <= v_period_end;

  select coalesce(jsonb_object_agg(tipo, cantidad), '{}'::jsonb) into v_incident_counts
  from (
    select tipo, count(*) as cantidad
    from public.routine_incidents
    where student_id = p_student_id and trainer_id = auth.uid()
      and fecha >= p_period_start and fecha <= v_period_end
    group by tipo
  ) t;

  v_metrics := v_metrics || jsonb_build_object(
    'incidenciasTotal', v_incident_total,
    'incidenciasPorTipo', v_incident_counts
  );

  insert into public.reports (trainer_id, student_id, period_start, period_end, status, metrics, generated_at, disciplina)
    values (auth.uid(), p_student_id, p_period_start, v_period_end, 'borrador', v_metrics, now(), p_disciplina)
  on conflict (trainer_id, student_id, period_start, disciplina)
    do update set metrics = excluded.metrics, generated_at = now()
  returning id into v_report_id;

  return v_report_id;
end;
$$;
