-- Ciclo de vida del vínculo profesional <-> cliente:
--  1. trainer_link_history: cada vínculo que termina (quién lo terminó), base del bloqueo y de las calificaciones.
--  2. student_link_locks + triggers sobre trainer_links: si el cliente CAMBIA de profesional, no puede volver a
--     cambiar durante 14 días (mismo tipo) o 28 días (otro tipo). Los planes con más cupos (Premium+) quedan exentos.
--     El primer vínculo no bloquea, y si lo termina el profesional tampoco.
--  3. link_feedback: calificaciones en los dos sentidos. Cliente -> profesional: estrellas + comentario (el profesional
--     las ve). Profesional -> cliente: bueno / regular / malo + comentario, PRIVADA del profesional (el cliente no la ve).

-- ============================================================
-- 1. Historial
-- ============================================================
create table if not exists public.trainer_link_history (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  trainer_id uuid not null references auth.users(id) on delete cascade,
  disciplina text not null check (disciplina in ('fuerza', 'nutricion')),
  started_at timestamptz,
  ended_at timestamptz not null default now(),
  ended_by text not null check (ended_by in ('alumno', 'profesional', 'sistema'))
);
create index if not exists trainer_link_history_student_idx on public.trainer_link_history (student_id, ended_at desc);

alter table public.trainer_link_history enable row level security;
drop policy if exists "student and trainer can view their link history" on public.trainer_link_history;
create policy "student and trainer can view their link history"
  on public.trainer_link_history for select
  using (student_id = auth.uid() or trainer_id = auth.uid());

-- ============================================================
-- 2. Bloqueo por cambio de profesional
-- ============================================================
create table if not exists public.student_link_locks (
  student_id uuid primary key references auth.users(id) on delete cascade,
  locked_until timestamptz not null,
  reason text,
  updated_at timestamptz not null default now()
);
alter table public.student_link_locks enable row level security;
drop policy if exists "student can view own link lock" on public.student_link_locks;
create policy "student can view own link lock"
  on public.student_link_locks for select
  using (student_id = auth.uid());
-- Sin policies de escritura: solo se crea desde respond_trainer_link_request (security definer).

create or replace function public.trg_guard_trainer_link_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lock timestamptz;
  v_plan text;
begin
  if auth.uid() = old.student_id then
    select plan into v_plan from public.user_settings where user_id = old.student_id;
    select locked_until into v_lock from public.student_link_locks where student_id = old.student_id;
    if v_lock is not null and v_lock > now() and coalesce(v_plan, 'basico') <> 'premium_plus' then
      raise exception 'Cambiaste de profesional hace poco: vas a poder volver a cambiar el %',
        to_char(v_lock at time zone 'America/Argentina/Buenos_Aires', 'DD/MM');
    end if;
  end if;
  return old;
end;
$$;

drop trigger if exists guard_trainer_link_delete on public.trainer_links;
create trigger guard_trainer_link_delete
  before delete on public.trainer_links
  for each row execute function public.trg_guard_trainer_link_delete();

create or replace function public.trg_log_trainer_link_end()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.trainer_link_history (student_id, trainer_id, disciplina, started_at, ended_by)
    values (
      old.student_id, old.trainer_id, old.disciplina, old.created_at,
      case when auth.uid() = old.student_id then 'alumno' when auth.uid() = old.trainer_id then 'profesional' else 'sistema' end
    );
  return old;
end;
$$;

drop trigger if exists log_trainer_link_end on public.trainer_links;
create trigger log_trainer_link_end
  after delete on public.trainer_links
  for each row execute function public.trg_log_trainer_link_end();

-- Aceptar una solicitud: si fue un CAMBIO de profesional, arranca el bloqueo.
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
  v_prev record;
  v_lock_days int;
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

    -- Cambio de profesional: si el alumno se había ido de otro por su cuenta hace poco, este vínculo nuevo cuenta
    -- como un "cambio" y arranca el bloqueo para volver a cambiar: 14 días si el nuevo es del mismo tipo que el
    -- anterior (nutricionista a nutricionista, entrenador a entrenador), 28 si es de otro tipo. El primer vínculo
    -- (sin historial) no bloquea.
    select * into v_prev from public.trainer_link_history
      where student_id = v_request.student_id and ended_by = 'alumno'
      order by ended_at desc limit 1;
    if found and v_prev.ended_at > now() - interval '90 days' then
      v_lock_days := case when v_prev.disciplina = v_request.disciplina then 14 else 28 end;
      insert into public.student_link_locks (student_id, locked_until, reason, updated_at)
        values (v_request.student_id, now() + make_interval(days => v_lock_days), v_prev.disciplina || ' -> ' || v_request.disciplina, now())
      on conflict (student_id) do update
        set locked_until = excluded.locked_until, reason = excluded.reason, updated_at = now();
    end if;
  end if;
end;
$$;

grant execute on function public.respond_trainer_link_request(uuid, text, text) to authenticated;

-- ============================================================
-- 3. Calificaciones
-- ============================================================
create table if not exists public.link_feedback (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  trainer_id uuid not null references auth.users(id) on delete cascade,
  disciplina text not null check (disciplina in ('fuerza', 'nutricion')),
  author_role text not null check (author_role in ('alumno', 'profesional')),
  stars int check (stars between 1 and 5),
  rating text check (rating in ('bueno', 'regular', 'malo')),
  comentario text,
  momento text not null check (momento in ('mensual', 'desvinculacion')),
  created_at timestamptz not null default now()
);
create index if not exists link_feedback_student_idx on public.link_feedback (student_id, created_at desc);
create index if not exists link_feedback_trainer_idx on public.link_feedback (trainer_id, created_at desc);

alter table public.link_feedback enable row level security;

drop policy if exists "student writes own feedback about a professional" on public.link_feedback;
create policy "student writes own feedback about a professional"
  on public.link_feedback for insert
  with check (author_role = 'alumno' and student_id = auth.uid() and stars is not null);

drop policy if exists "student reads own feedback" on public.link_feedback;
create policy "student reads own feedback"
  on public.link_feedback for select
  using (author_role = 'alumno' and student_id = auth.uid());

drop policy if exists "professional writes private rating of a student" on public.link_feedback;
create policy "professional writes private rating of a student"
  on public.link_feedback for insert
  with check (author_role = 'profesional' and trainer_id = auth.uid() and rating is not null);

-- El profesional ve lo que recibió (estrellas del cliente) y lo que él mismo calificó. El cliente NO ve la calificación del profesional.
drop policy if exists "professional reads feedback about and from them" on public.link_feedback;
create policy "professional reads feedback about and from them"
  on public.link_feedback for select
  using (trainer_id = auth.uid());
