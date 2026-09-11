-- Agrega carbohidratos/grasas por comida y horas de sueño por día
-- (pestañas nuevas "Macros" y "Actividad").
alter table public.days add column if not exists des_c integer not null default 0;
alter table public.days add column if not exists des_g integer not null default 0;
alter table public.days add column if not exists alm_c integer not null default 0;
alter table public.days add column if not exists alm_g integer not null default 0;
alter table public.days add column if not exists mer_c integer not null default 0;
alter table public.days add column if not exists mer_g integer not null default 0;
alter table public.days add column if not exists cen_c integer not null default 0;
alter table public.days add column if not exists cen_g integer not null default 0;
alter table public.days add column if not exists sueno_horas numeric;
