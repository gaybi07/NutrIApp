-- Alacena compartida entre varias cuentas (pareja, amigos, "hogar") --
-- arranca pensado para 2 personas pero sin límite: cualquiera con el
-- código de invitación se puede sumar.
--
-- Las altas de miembros (crear grupo / unirse con código) pasan por
-- funciones SECURITY DEFINER en vez de policies de INSERT directas,
-- porque para poder insertar tu propia fila en household_members
-- necesitarías ya ser miembro de ese household -- círculo imposible de
-- resolver solo con RLS. Las funciones validan la autorización real
-- (dueño del nuevo grupo, código válido) y hacen el insert con
-- privilegios elevados.

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Mi hogar',
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- Código corto reutilizable (no expira, no es de un solo uso) -- se
-- comparte por fuera de la app (WhatsApp, etc.) y cualquiera que lo
-- tenga se puede sumar al grupo en cualquier momento.
create table public.household_invites (
  code text primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  quantity numeric not null default 0,
  unit text not null default 'g',
  category text,
  nutrition_per_100g jsonb,
  nutrition_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
alter table public.inventory_items enable row level security;

-- Una policy de household_members que consulta household_members adentro
-- de su propio "using" dispara "infinite recursion detected in policy" en
-- Postgres -- para romper el ciclo, la consulta de membresía se hace
-- adentro de una función SECURITY DEFINER (corre con privilegios propios,
-- sin volver a pasar por RLS) y las policies llaman a la función en vez
-- de consultar la tabla directo.
create or replace function public.my_household_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select household_id from public.household_members where user_id = auth.uid();
$$;

grant execute on function public.my_household_ids() to authenticated;

create policy "members can view their households"
  on public.households for select
  using (id in (select * from public.my_household_ids()));

create policy "members can view co-members of their households"
  on public.household_members for select
  using (household_id in (select * from public.my_household_ids()));

create policy "members can view invite codes of their households"
  on public.household_invites for select
  using (household_id in (select * from public.my_household_ids()));

create policy "members can manage their shared inventory"
  on public.inventory_items for all
  using (household_id in (select * from public.my_household_ids()))
  with check (household_id in (select * from public.my_household_ids()));

-- Crea el grupo, te suma como owner y (opcional) importa tu alacena local
-- actual como alacena inicial del grupo -- todo en un solo paso atómico.
create or replace function public.create_household(p_name text, p_import_items jsonb default '[]'::jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_item jsonb;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  insert into public.households (name, owner_id)
    values (coalesce(nullif(trim(p_name), ''), 'Mi hogar'), auth.uid())
    returning id into v_household_id;

  insert into public.household_members (household_id, user_id, role)
    values (v_household_id, auth.uid(), 'owner');

  for v_item in select * from jsonb_array_elements(p_import_items) loop
    insert into public.inventory_items (household_id, name, quantity, unit, category, nutrition_per_100g, nutrition_confirmed)
    values (
      v_household_id,
      v_item->>'name',
      coalesce((v_item->>'quantity')::numeric, 0),
      coalesce(v_item->>'unit', 'g'),
      v_item->>'category',
      v_item->'nutritionPer100g',
      coalesce((v_item->>'nutritionConfirmed')::boolean, false)
    );
  end loop;

  return v_household_id;
end;
$$;

create or replace function public.generate_invite_code(p_household_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_is_member boolean;
begin
  select exists(
    select 1 from public.household_members
    where household_id = p_household_id and user_id = auth.uid()
  ) into v_is_member;

  if not v_is_member then
    raise exception 'No pertenecés a este grupo';
  end if;

  v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  insert into public.household_invites (code, household_id, created_by) values (v_code, p_household_id, auth.uid());
  return v_code;
end;
$$;

create or replace function public.join_household(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  select household_id into v_household_id
    from public.household_invites
    where code = upper(trim(p_code));

  if v_household_id is null then
    raise exception 'Código inválido';
  end if;

  insert into public.household_members (household_id, user_id, role)
    values (v_household_id, auth.uid(), 'member')
    on conflict (household_id, user_id) do nothing;

  return v_household_id;
end;
$$;

create or replace function public.leave_household(p_household_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.household_members
    where household_id = p_household_id and user_id = auth.uid();
end;
$$;

grant execute on function public.create_household(text, jsonb) to authenticated;
grant execute on function public.generate_invite_code(uuid) to authenticated;
grant execute on function public.join_household(text) to authenticated;
grant execute on function public.leave_household(uuid) to authenticated;
