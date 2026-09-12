-- Desglose editable de cada comida en sus alimentos/platos individuales
-- (ej. "Puré de papas", "Ensalada", "Milanesa" adentro de la Cena), en vez
-- de un único total opaco por comida. La suma de estos items es la que
-- alimenta des_k/des_p/des_c/des_g/des_f (y equivalentes alm/mer/cen).
alter table public.days add column if not exists des_items jsonb not null default '[]'::jsonb;
alter table public.days add column if not exists alm_items jsonb not null default '[]'::jsonb;
alter table public.days add column if not exists mer_items jsonb not null default '[]'::jsonb;
alter table public.days add column if not exists cen_items jsonb not null default '[]'::jsonb;
