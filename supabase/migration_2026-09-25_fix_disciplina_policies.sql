-- Rol Nutricionista, fase 2a: la migración anterior (2026-09-24) generalizó
-- is_active_trainer_of(student_id, disciplina), pero se me pasaron 3
-- policies que la llaman SIN el segundo argumento -- quedan atadas al
-- default 'fuerza' para siempre, así que un Nutricionista con un Paciente
-- vinculado (disciplina='nutricion') nunca pasaría el chequeo. Se arreglan
-- acá antes de construir cualquier UI de nutrición.
--
-- Además: para disciplina='nutricion', `training_plans` ES el objeto
-- congelado (ver Contexto del plan) -- no hay fanout a `assigned_sessions`
-- como en fuerza, así que el Paciente necesita una policy de lectura directa
-- sobre `training_plans` que hoy no existe (el alumno de fuerza lo ve
-- indirecto, vía sus `assigned_sessions`).

-- ============================================================
-- 1. training_plans -- el insert/update de un Nutricionista debe chequear
--    su propia disciplina, no 'fuerza' por default.
-- ============================================================

drop policy if exists "trainer manages own training plans" on public.training_plans;
create policy "trainer manages own training plans"
  on public.training_plans for all
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid() and public.is_active_trainer_of(student_id, disciplina));

-- Nueva: el Paciente lee su Plan Nutricional publicado directamente (sin
-- assigned_sessions de por medio). No hace falta filtrar por disciplina --
-- fuerza no la necesita (ya ve todo vía assigned_sessions) pero no molesta
-- que también pueda leer aquí.
create policy "student can view own published training plans"
  on public.training_plans for select
  using (student_id = auth.uid() and status = 'publicado');

-- ============================================================
-- 2. assigned_sessions -- mismo arreglo para las dos policies del
--    entrenador (select/update) que llaman is_active_trainer_of.
-- ============================================================

drop policy if exists "trainer can view assigned sessions of linked students" on public.assigned_sessions;
create policy "trainer can view assigned sessions of linked students"
  on public.assigned_sessions for select
  using (trainer_id = auth.uid() and public.is_active_trainer_of(student_id, disciplina));

drop policy if exists "trainer can update assigned sessions of linked students" on public.assigned_sessions;
create policy "trainer can update assigned sessions of linked students"
  on public.assigned_sessions for update
  using (trainer_id = auth.uid() and public.is_active_trainer_of(student_id, disciplina));

-- ============================================================
-- 3. reports -- el insert de un Nutricionista debe chequear su propia
--    disciplina.
-- ============================================================

drop policy if exists "trainer can create reports for linked students" on public.reports;
create policy "trainer can create reports for linked students"
  on public.reports for insert
  with check (trainer_id = auth.uid() and public.is_active_trainer_of(student_id, disciplina));

-- routine_incidents y workout_executions no se tocan -- son exclusivos de
-- fuerza (sin columna disciplina), is_active_trainer_of(student_id) con el
-- default 'fuerza' sigue siendo el chequeo correcto ahí.
