-- Historial de compras (marca, precio, fecha) del grupo compartido --
-- separado de inventory_items porque ese es STOCK actual (se pisa), esto
-- es una bitácora que crece con cada ticket leído. Reusa la función
-- my_household_ids() de migration_2026-09-14b para la policy, por la
-- misma razón (evitar recursión infinita de RLS sobre household_members).

create table public.purchase_history (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  fecha date not null default current_date,
  name text not null,
  quantity numeric not null default 0,
  unit text not null default 'g',
  brand text,
  price numeric,
  category text,
  created_at timestamptz not null default now()
);

alter table public.purchase_history enable row level security;

create policy "members can manage their shared purchase history"
  on public.purchase_history for all
  using (household_id in (select * from public.my_household_ids()))
  with check (household_id in (select * from public.my_household_ids()));
