-- Puntos por objetivos logrados. Los registra la base (no la app) y una sola vez por objetivo:
--   · puntual (peso, carga): 150
--   · recurrente: 50 + 25 por cada semana seguida que exige
-- Base para lo que viene (mascota que evoluciona, tienda): todo se calcula del libro de puntos.

create table if not exists public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  objective_id uuid references public.objectives(id) on delete set null,
  motivo text not null default 'objetivo_logrado',
  puntos int not null check (puntos <> 0),
  created_at timestamptz not null default now(),
  unique (objective_id, motivo)
);
create index if not exists points_ledger_student_idx on public.points_ledger (student_id, created_at desc);

alter table public.points_ledger enable row level security;
drop policy if exists "student reads own points" on public.points_ledger;
create policy "student reads own points"
  on public.points_ledger for select
  using (student_id = auth.uid());
-- Sin policies de escritura: solo mark_objective_achieved (security definer) suma puntos.

create or replace function public.objective_points(p_ventana text, p_semanas int)
returns int
language sql
immutable
as $$
  select case when p_ventana = 'total' then 150 else 50 + 25 * coalesce(p_semanas, 1) end;
$$;

-- Ahora devuelve los puntos del objetivo (antes no devolvía nada).
drop function if exists public.mark_objective_achieved(uuid);
create or replace function public.mark_objective_achieved(p_objective_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_obj public.objectives%rowtype;
  v_points int;
begin
  select * into v_obj from public.objectives where id = p_objective_id and student_id = auth.uid();
  if not found then
    return 0;
  end if;
  if v_obj.estado = 'activo' then
    update public.objectives set estado = 'logrado', logrado_at = now() where id = p_objective_id;
  end if;
  v_points := public.objective_points(v_obj.ventana, v_obj.semanas_seguidas);
  insert into public.points_ledger (student_id, objective_id, motivo, puntos)
    values (auth.uid(), p_objective_id, 'objetivo_logrado', v_points)
    on conflict (objective_id, motivo) do nothing;
  return v_points;
end;
$$;

grant execute on function public.mark_objective_achieved(uuid) to authenticated;

-- Objetivos que ya estaban logrados antes de este cambio: se les acreditan los puntos una sola vez.
insert into public.points_ledger (student_id, objective_id, motivo, puntos)
  select student_id, id, 'objetivo_logrado', public.objective_points(ventana, semanas_seguidas)
  from public.objectives
  where estado = 'logrado'
on conflict (objective_id, motivo) do nothing;
