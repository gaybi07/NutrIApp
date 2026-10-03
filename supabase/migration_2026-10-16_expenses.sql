-- Gastos e ingresos de la casa: un solo lugar para lo compartido (grupo) y lo personal de cada uno.
--   · tipo 'gasto' / 'ingreso' / 'saldo' (un pago entre integrantes para saldar cuentas).
--   · compartido = gasto de la casa: lo ven todos los integrantes del grupo. Lo personal lo ve solo quien lo cargó.
--   · reparto: {user_id: porcentaje} para un gasto compartido; null = partes iguales entre los integrantes.
--   · Solo edita o borra quien lo cargó. Un ingreso marcado "aporte a la casa" entra al pozo común.
-- Se puede correr más de una vez.

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  fecha date not null,
  tipo text not null check (tipo in ('gasto', 'ingreso', 'saldo')),
  monto numeric not null check (monto > 0),
  categoria text not null default 'otros',
  descripcion text,
  compartido boolean not null default false,
  reparto jsonb,
  para_user_id uuid references auth.users(id) on delete set null,
  aporte_casa boolean not null default false,
  origen text,
  created_at timestamptz not null default now()
);
create unique index if not exists expenses_origen_idx on public.expenses (household_id, origen) where origen is not null;
create index if not exists expenses_household_idx on public.expenses (household_id, fecha desc);
create index if not exists expenses_user_idx on public.expenses (user_id, fecha desc);

alter table public.expenses enable row level security;

drop policy if exists "read own and shared expenses" on public.expenses;
create policy "read own and shared expenses" on public.expenses for select using (
  user_id = auth.uid()
  or (household_id is not null and (compartido or tipo = 'saldo' or aporte_casa) and household_id in (select public.my_household_ids()))
);

drop policy if exists "insert own expenses" on public.expenses;
create policy "insert own expenses" on public.expenses for insert with check (
  user_id = auth.uid()
  and (household_id is null or household_id in (select public.my_household_ids()))
);

drop policy if exists "update own expenses" on public.expenses;
create policy "update own expenses" on public.expenses for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "delete own expenses" on public.expenses;
create policy "delete own expenses" on public.expenses for delete using (user_id = auth.uid());

-- Integrantes del grupo con un nombre para mostrar (nombre real o alias del perfil; si no, el email sin el dominio).
create or replace function public.get_household_members(p_household_id uuid)
returns table (user_id uuid, nombre text)
language sql
security definer
set search_path = public
as $$
  select m.user_id,
         coalesce(nullif(p.nombre, ''), nullif(p.alias, ''), split_part(u.email, '@', 1)) as nombre
  from public.household_members m
  join auth.users u on u.id = m.user_id
  left join public.user_profiles p on p.user_id = m.user_id
  where m.household_id = p_household_id
    and p_household_id in (select public.my_household_ids());
$$;

grant execute on function public.get_household_members(uuid) to authenticated;
