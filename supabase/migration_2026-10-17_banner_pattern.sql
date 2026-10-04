-- Estilo de la línea del estandarte del mes (onda, triángulos, dos líneas o cruz), elegido en el perfil.
alter table public.user_profiles add column if not exists banner_pattern text;
