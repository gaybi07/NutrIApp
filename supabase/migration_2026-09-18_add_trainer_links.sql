-- Vínculo entrenador <-> alumno: un entrenador aprobado (ver
-- migration_2026-09-17_add_trainer_applications.sql) genera un código de
-- invitación, el alumno lo usa para vincularse (a lo sumo a un entrenador
-- por vez, igual que el "hogar" de la alacena) y a partir de ahí ve las
-- rutinas que ese entrenador armó y las puede adoptar a su propia
-- planificación semanal.
--
-- Igual que household: los inserts que requieren validar algo (código
-- válido, sos entrenador aprobado) pasan por funciones SECURITY DEFINER en
-- vez de policies de INSERT directas.
--
-- El email de cada lado se guarda ya resuelto en la fila (en vez de tener
-- que consultar auth.users, que el cliente no puede leer directo) -- se
-- completa una sola vez, adentro de join_trainer(), que sí corre con
-- privilegios para leer auth.users.

create table public.trainer_links (
  student_id uuid primary key references auth.users(id) on delete cascade,
  trainer_id uuid not null references auth.users(id) on delete cascade,
  trainer_email text not null default '',
  student_email text not null default '',
  created_at timestamptz not null default now()
);

create table public.trainer_invites (
  code text primary key,
  trainer_id uuid not null references auth.users(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.trainer_routines (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  ejercicios jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trainer_links enable row level security;
alter table public.trainer_invites enable row level security;
alter table public.trainer_routines enable row level security;

-- Resuelve el entrenador vinculado al usuario actual (o null) -- corre con
-- privilegios propios así las policies de trainer_routines no vuelven a
-- pasar por la RLS de trainer_links (mismo patrón que my_household_ids()).
create or replace function public.my_trainer_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select trainer_id from public.trainer_links where student_id = auth.uid();
$$;

grant execute on function public.my_trainer_id() to authenticated;

create policy "trainer and student can view their link"
  on public.trainer_links for select
  using (trainer_id = auth.uid() or student_id = auth.uid());

create policy "student can unlink"
  on public.trainer_links for delete
  using (student_id = auth.uid());

create policy "trainer can remove a student"
  on public.trainer_links for delete
  using (trainer_id = auth.uid());

create policy "trainer can view own invite codes"
  on public.trainer_invites for select
  using (trainer_id = auth.uid());

create policy "trainer manages own routines"
  on public.trainer_routines for all
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

create policy "linked student can view trainer's routines"
  on public.trainer_routines for select
  using (trainer_id = public.my_trainer_id());

create or replace function public.generate_trainer_invite_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_trainer boolean;
  v_code text;
begin
  select exists(
    select 1 from public.trainer_applications
    where user_id = auth.uid() and status = 'aprobado'
  ) into v_is_trainer;

  if not v_is_trainer then
    raise exception 'Todavía no sos un entrenador aprobado';
  end if;

  v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  insert into public.trainer_invites (code, trainer_id, created_by) values (v_code, auth.uid(), auth.uid());
  return v_code;
end;
$$;

create or replace function public.join_trainer(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trainer_id uuid;
  v_trainer_email text;
  v_student_email text;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
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

  insert into public.trainer_links (student_id, trainer_id, trainer_email, student_email)
    values (auth.uid(), v_trainer_id, coalesce(v_trainer_email, ''), coalesce(v_student_email, ''))
    on conflict (student_id) do update set
      trainer_id = excluded.trainer_id,
      trainer_email = excluded.trainer_email,
      student_email = excluded.student_email,
      created_at = now();

  return v_trainer_id;
end;
$$;

grant execute on function public.generate_trainer_invite_code() to authenticated;
grant execute on function public.join_trainer(text) to authenticated;
