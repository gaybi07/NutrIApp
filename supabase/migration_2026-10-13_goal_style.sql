-- Meta diaria: "variable" (se ajusta con pasos y entrenamiento del día) o "constante" (la misma kcal todos los días).
alter table public.user_settings add column if not exists goal_style text;
