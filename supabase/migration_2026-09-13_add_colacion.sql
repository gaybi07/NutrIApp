-- Quinta comida "Colación" (aperitivos/snacks que no entran en desayuno,
-- almuerzo, merienda o cena) — mismos campos que las otras 4.
alter table public.days add column if not exists col_k integer not null default 0;
alter table public.days add column if not exists col_p integer not null default 0;
alter table public.days add column if not exists col_c integer not null default 0;
alter table public.days add column if not exists col_g integer not null default 0;
alter table public.days add column if not exists col_f integer not null default 0;
alter table public.days add column if not exists col_items jsonb not null default '[]'::jsonb;
