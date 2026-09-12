-- Tamaño de letra (chico/mediano/grande), elegido en el onboarding o desde
-- Preferencias, para gente a la que le cuesta leer la letra chica por defecto.
alter table public.user_settings add column if not exists font_size text;
