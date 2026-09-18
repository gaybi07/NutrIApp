-- Reporte planificado-vs-real del entrenamiento en vivo de cada día, para
-- poder volver a abrirlo más tarde (ver components/LiveWorkout.tsx) en vez
-- de que se pierda apenas se cierra el modal la primera vez.
alter table public.days add column if not exists entrenamiento_reporte jsonb;
