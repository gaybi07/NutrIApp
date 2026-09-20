-- Plan de comidas de la semana que viene, compartido a nivel de "hogar"
-- (households.week_plan) en vez del que ya vivía en user_settings.week_plan
-- (por usuario -- cada integrante del grupo veía solo lo que él mismo había
-- planificado, no lo que planificó el otro). Mismo shape que WeekPlan
-- (Record<fecha, Record<comida, receta>>); user_settings.week_plan se sigue
-- usando tal cual para quien todavía no tiene un grupo armado.
alter table public.households add column if not exists week_plan jsonb not null default '{}'::jsonb;
alter table public.households add column if not exists week_plan_updated_at timestamptz;

-- households solo tenía policy de SELECT -- para que cualquier miembro
-- pueda guardar el plan de la semana hace falta una de UPDATE también, con
-- la misma confianza total entre miembros que ya se usa para inventory_items.
create policy "members can update their households"
  on public.households for update
  using (id in (select * from public.my_household_ids()))
  with check (id in (select * from public.my_household_ids()));

alter publication supabase_realtime add table public.households;
