-- Fibra por comida + lista de alimentos comidos por día (diversidad de
-- grupos alimenticios en la pestaña Macros).
alter table public.days add column if not exists des_f integer not null default 0;
alter table public.days add column if not exists alm_f integer not null default 0;
alter table public.days add column if not exists mer_f integer not null default 0;
alter table public.days add column if not exists cen_f integer not null default 0;
alter table public.days add column if not exists alimentos jsonb not null default '[]'::jsonb;
