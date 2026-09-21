-- Modelo de planes: Básico (gratis) / Premium / Premium+ para el cliente,
-- Gratis/Pago (por cupo de alumnos) para el entrenador. Sin cobro real
-- todavía -- son banderas manuales, mismo patrón que ya se usa para
-- aprobar entrenadores. El front decide qué tabs/bloques mostrar según
-- `user_settings.plan`; acá solo se agregan los campos y se hace cumplir
-- la regla dura: básico no se puede vincular, y un entrenador no puede
-- superar su cupo de alumnos.

alter table public.user_settings
  add column if not exists plan text not null default 'basico'
  check (plan in ('basico', 'premium', 'premium_plus'));

alter table public.trainer_applications
  add column if not exists trainer_plan text not null default 'gratis'
  check (trainer_plan in ('gratis', 'pago'));
alter table public.trainer_applications
  add column if not exists max_students int not null default 1;

-- Alumno: además de código válido y no auto-vincularse, ahora hace falta
-- no estar en básico (0 cupos de vínculo).
create or replace function public.request_trainer_link(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trainer_id uuid;
  v_trainer_email text;
  v_student_email text;
  v_student_plan text;
  v_request_id uuid;
  v_already_linked boolean;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  select plan into v_student_plan from public.user_settings where user_id = auth.uid();
  if coalesce(v_student_plan, 'basico') = 'basico' then
    raise exception 'Necesitás un plan pago para vincularte a un entrenador';
  end if;

  select exists(
    select 1 from public.trainer_links
    where student_id = auth.uid() and status = 'activo'
  ) into v_already_linked;
  if v_already_linked then
    raise exception 'Ya estás vinculado a un entrenador';
  end if;

  select trainer_id into v_trainer_id
    from public.trainer_invites
    where code = upper(trim(p_code));
  if v_trainer_id is null then
    raise exception 'Código inválido';
  end if;
  if v_trainer_id = auth.uid() then
    raise exception 'No podés vincularte a vos mismo';
  end if;

  select email into v_trainer_email from auth.users where id = v_trainer_id;
  v_student_email := auth.jwt() ->> 'email';

  update public.trainer_link_requests
    set trainer_id = v_trainer_id,
        trainer_email = coalesce(v_trainer_email, ''),
        student_email = coalesce(v_student_email, ''),
        created_at = now()
    where student_id = auth.uid() and status = 'pendiente'
    returning id into v_request_id;

  if v_request_id is null then
    insert into public.trainer_link_requests (trainer_id, student_id, trainer_email, student_email)
      values (v_trainer_id, auth.uid(), coalesce(v_trainer_email, ''), coalesce(v_student_email, ''))
      returning id into v_request_id;
  end if;

  return v_request_id;
end;
$$;

-- Entrenador: además de que la solicitud siga pendiente y sea suya, ahora
-- no puede aceptar si ya llegó al cupo de alumnos de su plan.
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
    select max_students into v_max_students from public.trainer_applications where user_id = auth.uid();
    select count(*) into v_active_count from public.trainer_links where trainer_id = auth.uid() and status = 'activo';
    if v_active_count >= coalesce(v_max_students, 1) then
      raise exception 'Llegaste al límite de alumnos de tu plan';
    end if;
  end if;

  update public.trainer_link_requests
    set status = p_decision, responded_at = now(), response_note = p_note
    where id = p_request_id;

  if p_decision = 'aceptada' then
    insert into public.trainer_links (student_id, trainer_id, trainer_email, student_email, status)
      values (v_request.student_id, v_request.trainer_id, v_request.trainer_email, v_request.student_email, 'activo')
      on conflict (student_id) do update set
        trainer_id = excluded.trainer_id,
        trainer_email = excluded.trainer_email,
        student_email = excluded.student_email,
        status = 'activo',
        ended_at = null,
        created_at = now();
  end if;
end;
$$;
