-- Estilos del estandarte del mes, elegidos en el perfil: {"default": "onda", "months": {"2026-09": "cruz"}}.
-- Un estilo guardado para un mes (o para todos) no se vuelve a cambiar; eso lo controla la app.
alter table public.user_profiles add column if not exists banner_styles jsonb;
