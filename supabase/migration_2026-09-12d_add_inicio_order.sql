-- Orden personalizado de los bloques de Inicio (Hoy / Editar comidas / Semana),
-- elegido arrastrándolos como los íconos de la pantalla de inicio del celular.
alter table public.user_settings add column if not exists inicio_order jsonb not null default '[]'::jsonb;
