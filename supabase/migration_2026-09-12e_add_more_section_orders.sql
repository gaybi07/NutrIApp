-- Orden personalizado de los bloques de Comidas, Macros y Entrenamientos
-- (el de Inicio ya se agregó en migration_2026-09-12d), elegido
-- arrastrándolos como los íconos de la pantalla de inicio del celular.
alter table public.user_settings add column if not exists comidas_order jsonb not null default '[]'::jsonb;
alter table public.user_settings add column if not exists macros_order jsonb not null default '[]'::jsonb;
alter table public.user_settings add column if not exists actividad_order jsonb not null default '[]'::jsonb;
