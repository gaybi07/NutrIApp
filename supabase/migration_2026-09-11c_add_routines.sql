-- Rutinas de entrenamiento reusables + rutina semanal + desglose de
-- ejercicios entrenados por día (components/RoutineManager.tsx,
-- components/ExerciseLogCard.tsx).
alter table public.days add column if not exists ejercicios jsonb not null default '[]'::jsonb;
alter table public.user_settings add column if not exists routines jsonb not null default '[]'::jsonb;
alter table public.user_settings add column if not exists training_schedule jsonb not null default '{}'::jsonb;
