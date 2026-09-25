-- Suplementos del día (ver components/SupplementsPanel.tsx) -- se armó la
-- UI y el campo en DayEntry, pero se olvidó agregar la columna real y el
-- mapeo en app/api/data/route.ts, así que nunca se guardaba: quedaba solo
-- en el estado de React hasta el próximo refresh.
alter table public.days
  add column if not exists suplementos jsonb not null default '[]'::jsonb;
