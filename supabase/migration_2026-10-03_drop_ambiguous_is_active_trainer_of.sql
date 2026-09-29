-- Bug: la migración 2026-09-24 creó is_active_trainer_of(uuid, text default 'fuerza')
-- SIN borrar la versión vieja is_active_trainer_of(uuid). Con las dos vivas, toda
-- llamada de un solo argumento (get_student_metrics, get_student_week_detail,
-- get_student_weight_history, generate_student_report...) falla con
-- "function public.is_active_trainer_of(uuid) is not unique" -- por eso los
-- Reportes salían vacíos. La versión de 2 argumentos ya cubre las llamadas de uno
-- (default 'fuerza'), así que la vieja sobra.
-- Sin CASCADE a propósito: si alguna policy vieja todavía depende de ella,
-- Postgres lo avisa en vez de borrarla en silencio.
drop function if exists public.is_active_trainer_of(uuid);
