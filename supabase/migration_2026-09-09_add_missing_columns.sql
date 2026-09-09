-- Corre esto una sola vez en el SQL Editor de Supabase si tu base fue creada
-- antes de que se agregaran estas columnas al esquema. Es seguro: "if not
-- exists" no rompe nada si ya existen, y no borra datos.

alter table public.user_settings
  add column if not exists weekly_weights jsonb not null default '{}'::jsonb,
  add column if not exists calculator_profile jsonb;

alter table public.days
  add column if not exists peso_kg numeric,
  add column if not exists entreno_minutos integer,
  add column if not exists entreno_intensidad text;
