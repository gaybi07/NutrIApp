-- Corré esto en el SQL Editor de Supabase (mismo lugar que la migración
-- anterior). Es seguro: "if not exists" no rompe nada si ya existe.

alter table public.user_settings
  add column if not exists tour_done boolean not null default false;
