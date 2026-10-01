-- Red de seguridad: historial de cada día. Cada vez que se modifica o borra un día en lo que importa (entrenamientos,
-- ejercicios, reporte del entrenamiento y comidas cargadas) la base guarda la versión ANTERIOR en days_history. Así
-- ninguna pantalla, dispositivo con datos viejos o error de la app puede hacer perder un registro: siempre se puede
-- recuperar. Se conserva 90 días.

create table if not exists public.days_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fecha date not null,
  row jsonb not null,
  replaced_at timestamptz not null default now(),
  operacion text not null default 'update'
);
create index if not exists days_history_user_fecha_idx on public.days_history (user_id, fecha, replaced_at desc);

alter table public.days_history enable row level security;
drop policy if exists "user can view own days history" on public.days_history;
create policy "user can view own days history"
  on public.days_history for select
  using (user_id = auth.uid());
-- Sin policies de escritura: solo el trigger (security definer) agrega filas.

create or replace function public.trg_days_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    insert into public.days_history (user_id, fecha, row, operacion) values (old.user_id, old.fecha, to_jsonb(old), 'delete');
    return old;
  end if;
  if old.entrenamientos is distinct from new.entrenamientos
     or old.ejercicios is distinct from new.ejercicios
     or old.entrenamiento_reporte is distinct from new.entrenamiento_reporte
     or old.entreno_minutos is distinct from new.entreno_minutos
     or old.des_items is distinct from new.des_items
     or old.alm_items is distinct from new.alm_items
     or old.mer_items is distinct from new.mer_items
     or old.cen_items is distinct from new.cen_items
     or old.col_items is distinct from new.col_items then
    insert into public.days_history (user_id, fecha, row, operacion) values (old.user_id, old.fecha, to_jsonb(old), 'update');
    delete from public.days_history where user_id = old.user_id and replaced_at < now() - interval '90 days';
  end if;
  return new;
end;
$$;

drop trigger if exists days_history_update on public.days;
create trigger days_history_update
  before update on public.days
  for each row execute function public.trg_days_history();

drop trigger if exists days_history_delete on public.days;
create trigger days_history_delete
  before delete on public.days
  for each row execute function public.trg_days_history();

-- Recuperar el entrenamiento de una versión anterior de un día (sesiones, ejercicios y reporte). Solo del propio usuario.
create or replace function public.restore_day_training(p_history_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_h public.days_history%rowtype;
begin
  select * into v_h from public.days_history where id = p_history_id and user_id = auth.uid();
  if not found then
    raise exception 'Versión no encontrada';
  end if;
  update public.days set
    entrenamientos = coalesce(v_h.row -> 'entrenamientos', '[]'::jsonb),
    ejercicios = coalesce(v_h.row -> 'ejercicios', '[]'::jsonb),
    entrenamiento_reporte = v_h.row -> 'entrenamiento_reporte',
    entreno = coalesce((v_h.row ->> 'entreno')::boolean, false),
    entreno_minutos = (v_h.row ->> 'entreno_minutos')::int,
    entreno_intensidad = v_h.row ->> 'entreno_intensidad'
  where user_id = auth.uid() and fecha = v_h.fecha;
end;
$$;

grant execute on function public.restore_day_training(uuid) to authenticated;
