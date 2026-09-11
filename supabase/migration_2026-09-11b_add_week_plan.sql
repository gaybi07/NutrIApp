-- Planificador de comidas de la semana que viene (components/WeekPlanner.tsx).
alter table public.user_settings add column if not exists week_plan jsonb not null default '{}'::jsonb;
