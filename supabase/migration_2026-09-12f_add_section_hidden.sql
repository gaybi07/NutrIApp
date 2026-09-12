-- Secciones apagadas con el foquito (💡) en cada bloque, por solapa.
-- Desaparecen de la pantalla; se vuelven a prender en Preferencias > Secciones.
alter table public.user_settings add column if not exists inicio_hidden jsonb not null default '[]'::jsonb;
alter table public.user_settings add column if not exists comidas_hidden jsonb not null default '[]'::jsonb;
alter table public.user_settings add column if not exists macros_hidden jsonb not null default '[]'::jsonb;
alter table public.user_settings add column if not exists actividad_hidden jsonb not null default '[]'::jsonb;
