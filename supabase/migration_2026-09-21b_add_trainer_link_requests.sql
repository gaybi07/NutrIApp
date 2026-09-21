-- Vinculación Entrenador <-> Alumno con solicitud + aceptar/rechazar, en vez
-- del "usar el código y quedás vinculado al instante" que hacía
-- join_trainer() hasta ahora. Reutiliza tal cual trainer_invites y
-- generate_trainer_invite_code() (migration_2026-09-18) -- lo único que
-- cambia es qué pasa cuando el alumno usa el código: ya no crea el vínculo
-- directo, crea una solicitud que el entrenador tiene que resolver.

-- join_trainer() queda reemplazada por request_trainer_link() +
-- respond_trainer_link_request() -- se elimina para que no quede un segundo
-- camino de vinculación (sin aprobación) compitiendo con el nuevo.
drop function if exists public.join_trainer(text);

create table public.trainer_link_requests (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  trainer_email text not null default '',
  student_email text not null default '',
  status text not null default 'pendiente' check (status in ('pendiente', 'aceptada', 'rechazada')),
  responded_at timestamptz,
  response_note text,
  created_at timestamptz not null default now()
);

-- Un alumno solo puede tener una solicitud pendiente a la vez -- si usa otro
-- código mientras espera respuesta, request_trainer_link() actualiza esta
-- misma fila en vez de crear una segunda.
create unique index trainer_link_requests_student_pending_idx
  on public.trainer_link_requests (student_id)
  where status = 'pendiente';

create index trainer_link_requests_trainer_status_idx
  on public.trainer_link_requests (trainer_id, status);

create index trainer_link_requests_student_created_idx
  on public.trainer_link_requests (student_id, created_at desc);

alter table public.trainer_link_requests enable row level security;

-- Sin policies de insert/update: toda escritura pasa por las dos funciones
-- de abajo, que validan el código, evitan auto-vincularse y crean el
-- vínculo de forma atómica junto con resolver la solicitud.
create policy "student can view own link requests"
  on public.trainer_link_requests for select
  using (student_id = auth.uid());

create policy "trainer can view incoming link requests"
  on public.trainer_link_requests for select
  using (trainer_id = auth.uid());

-- Lado ALUMNO: usa un código y queda "pendiente" hasta que el entrenador
-- responda -- ya no crea el vínculo directo.
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
  v_request_id uuid;
  v_already_linked boolean;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
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

grant execute on function public.request_trainer_link(text) to authenticated;

-- Lado ENTRENADOR: acepta (crea/reactiva el vínculo) o rechaza (la
-- solicitud queda "rechazada", nunca se crea el vínculo) -- las dos cosas
-- en una sola transacción para que no quede una solicitud "aceptada" sin
-- vínculo si algo fallara a mitad de camino.
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

grant execute on function public.respond_trainer_link_request(uuid, text, text) to authenticated;
