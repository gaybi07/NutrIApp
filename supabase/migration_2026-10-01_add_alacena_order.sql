-- La solapa "Comidas" se separó en dos: "Alacena" (stock + sugerencias) y
-- "Comidas" (planificación semanal), que hasta ahora convivían en una sola.
-- comidas_order/comidas_hidden ya existían -- se agregan sus equivalentes
-- para la nueva solapa Alacena, mismo patrón.

alter table public.user_settings
  add column if not exists alacena_order jsonb not null default '[]'::jsonb;
alter table public.user_settings
  add column if not exists alacena_hidden jsonb not null default '[]'::jsonb;
