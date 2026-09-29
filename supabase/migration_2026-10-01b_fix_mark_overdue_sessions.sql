-- Bug real encontrado simulando 8 semanas de Entrenador+Nutricionista+
-- Paciente: mark_overdue_sessions() (migration_2026-09-21_add_trainer_module.sql)
-- nunca puede marcar nada como "vencida". SECURITY DEFINER cambia con qué
-- privilegios corre la función, pero NO cambia qué devuelve auth.uid() (eso
-- sigue siendo el JWT de quien la llamó) -- así que el trigger de guarda
-- (trg_guard_assigned_sessions_update), que exige auth.uid() = student_id o
-- = trainer_id de CADA fila, rechaza la primera fila que no sea del que
-- llamó, y como es un solo UPDATE, aborta la transacción entera (ninguna
-- fila queda marcada, ni siquiera la del que llamó).
--
-- Arreglo: la transición puntual "planificada/movida -> vencida" sin tocar
-- ningún otro campo es pasiva (el tiempo pasó, nadie la está "haciendo" a
-- propósito) -- no necesita el chequeo de dueño, se deja pasar siempre.

create or replace function public.trg_guard_assigned_sessions_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'vencida' and old.status in ('planificada', 'movida')
    and new.student_id = old.student_id and new.trainer_id = old.trainer_id
    and new.plan_id = old.plan_id and new.routine_id is not distinct from old.routine_id
    and new.routine_snapshot = old.routine_snapshot and new.routine_nombre = old.routine_nombre
    and new.fecha_planificada = old.fecha_planificada and new.fecha_original = old.fecha_original
  then
    new.updated_at := now();
    return new;
  end if;

  if auth.uid() = old.student_id then
    if new.trainer_id <> old.trainer_id
      or new.plan_id <> old.plan_id
      or new.student_id <> old.student_id
      or new.routine_id is distinct from old.routine_id
      or new.routine_snapshot <> old.routine_snapshot
      or new.routine_nombre <> old.routine_nombre
      or new.fecha_original <> old.fecha_original
    then
      raise exception 'El alumno no puede modificar esos campos';
    end if;
    if old.status = 'planificada' and new.status not in ('planificada', 'movida', 'en_curso') then
      raise exception 'Transición de estado no permitida';
    elsif old.status = 'movida' and new.status not in ('movida', 'en_curso') then
      raise exception 'Transición de estado no permitida';
    elsif old.status in ('completada', 'vencida', 'cancelada') then
      raise exception 'La sesión ya está cerrada';
    end if;
    if new.status = 'movida' and new.fecha_planificada <> old.fecha_planificada then
      new.moved_at := now();
    end if;
    if new.status = 'en_curso' and old.status <> 'en_curso' then
      new.started_at := now();
    end if;
    new.updated_at := now();
    return new;
  elsif auth.uid() = old.trainer_id then
    if old.status = 'completada' then
      raise exception 'No se puede modificar una sesión ya completada';
    end if;
    if new.student_id <> old.student_id or new.plan_id <> old.plan_id or new.trainer_id <> old.trainer_id then
      raise exception 'El entrenador no puede reasignar esos campos';
    end if;
    if new.status not in ('planificada', 'cancelada') then
      raise exception 'El entrenador solo puede reprogramar (vuelve a planificada) o cancelar';
    end if;
    new.updated_at := now();
    return new;
  else
    raise exception 'No autorizado';
  end if;
end;
$$;
