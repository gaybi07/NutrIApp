-- Corré esto en el SQL Editor de Supabase (mismo lugar de siempre). Es seguro:
-- "if not exists" no rompe nada si ya existe, y no borra datos.

alter table public.days
  add column if not exists entrenamientos jsonb not null default '[]'::jsonb;
