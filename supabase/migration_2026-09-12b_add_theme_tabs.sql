-- Preferencias de la app: tema elegido (claro/oscuro/alto-contraste) y qué
-- solapas de arriba se muestran además de Inicio (que siempre está fija).
alter table public.user_settings add column if not exists theme text;
alter table public.user_settings add column if not exists enabled_tabs jsonb not null default '[]'::jsonb;
