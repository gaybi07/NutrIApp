-- Métricas mínimas para que el entrenador vea a un alumno puntual: en vez
-- de darle SELECT directo sobre `days`/`user_settings` (expondría TODO el
-- diario del alumno -- comidas, calculadora de objetivo, etc., mucho más de
-- lo que pidió esto), una función que calcula los 8 números del lado del
-- servidor y devuelve solo eso. El entrenador nunca ve filas crudas de
-- `days` ni `user_settings` del alumno.
--
-- "Entrenos planificados" cuenta días de `training_schedule` cuya rutina
-- asignada es de ESTE entrenador (origen "asignada" + trainerId propio,
-- ambos ya viven en Routine desde migration de "personal vs asignada") --
-- no cuenta rutinas personales del alumno en otros días. "Entrenos
-- realizados" es aproximado: cuenta días con `entreno`/`entrenamientos`
-- cargado en esa semana, sin poder verificar que haya sido justo la rutina
-- asignada (DayEntry no guarda qué rutina se ejecutó) -- limitación real
-- del modelo de datos actual, no de esta función.
create or replace function public.get_student_metrics(p_student_id uuid, p_week_start date)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_settings public.user_settings%rowtype;
  v_prev_week_start date;
  v_day record;
  v_exercise jsonb;
  v_set jsonb;
  v_ex_volume numeric;
  v_peso numeric;
  v_entrenos_realizados int := 0;
  v_entrenos_planificados int := 0;
  v_peso_actual numeric;
  v_peso_anterior numeric;
  v_proteina_total numeric := 0;
  v_proteina_dias int := 0;
  v_pasos_total numeric := 0;
  v_pasos_dias int := 0;
  v_volumen numeric := 0;
begin
  if not public.is_active_trainer_of(p_student_id) then
    raise exception 'No autorizado';
  end if;

  v_prev_week_start := p_week_start - 7;

  select * into v_settings from public.user_settings where user_id = p_student_id;

  if v_settings.training_schedule is not null then
    select count(*) into v_entrenos_planificados
    from jsonb_each_text(v_settings.training_schedule) as sched(weekday, routine_id)
    where exists (
      select 1 from jsonb_array_elements(coalesce(v_settings.routines, '[]'::jsonb)) as r
      where r->>'id' = sched.routine_id
        and r->>'origen' = 'asignada'
        and r->>'trainerId' = auth.uid()::text
    );
  end if;

  if v_settings.weekly_weights is not null then
    v_peso_actual := (v_settings.weekly_weights->>p_week_start::text)::numeric;
    v_peso_anterior := (v_settings.weekly_weights->>v_prev_week_start::text)::numeric;
  end if;

  for v_day in
    select * from public.days
    where user_id = p_student_id and fecha >= p_week_start and fecha < p_week_start + 7
  loop
    if v_day.entreno or jsonb_array_length(coalesce(v_day.entrenamientos, '[]'::jsonb)) > 0 then
      v_entrenos_realizados := v_entrenos_realizados + 1;
    end if;

    -- Proteína promedio: solo sobre días con algo cargado (kcal > 0), para
    -- no diluir el promedio con días sin registrar nada.
    if (v_day.des_k + v_day.alm_k + v_day.mer_k + v_day.cen_k + coalesce(v_day.col_k, 0)) > 0 then
      v_proteina_total := v_proteina_total + v_day.des_p + v_day.alm_p + v_day.mer_p + v_day.cen_p + coalesce(v_day.col_p, 0);
      v_proteina_dias := v_proteina_dias + 1;
    end if;

    if v_day.pasos > 0 then
      v_pasos_total := v_pasos_total + v_day.pasos;
      v_pasos_dias := v_pasos_dias + 1;
    end if;

    -- Volumen: misma fórmula que exerciseVolume() en lib/calculations.ts --
    -- si el ejercicio tiene `sets` (detalle real serie por serie), se usa
    -- eso; si no, series×repeticiones×peso. Peso ausente o 0 cuenta como 1
    -- (ej. ejercicios con el propio cuerpo), igual que del lado cliente.
    if v_day.ejercicios is not null then
      for v_exercise in select * from jsonb_array_elements(v_day.ejercicios) loop
        if jsonb_array_length(coalesce(v_exercise->'sets', '[]'::jsonb)) > 0 then
          v_ex_volume := 0;
          for v_set in select * from jsonb_array_elements(v_exercise->'sets') loop
            v_peso := (v_set->>'peso')::numeric;
            if v_peso is null or v_peso = 0 then v_peso := 1; end if;
            v_ex_volume := v_ex_volume + coalesce((v_set->>'repeticiones')::numeric, 0) * v_peso;
          end loop;
        else
          v_peso := (v_exercise->>'peso')::numeric;
          if v_peso is null or v_peso = 0 then v_peso := 1; end if;
          v_ex_volume := coalesce((v_exercise->>'series')::numeric, 0) * coalesce((v_exercise->>'repeticiones')::numeric, 0) * v_peso;
        end if;
        v_volumen := v_volumen + v_ex_volume;
      end loop;
    end if;
  end loop;

  return jsonb_build_object(
    'weekStart', p_week_start,
    'adherenciaSemanal', case when v_entrenos_planificados > 0
      then round((v_entrenos_realizados::numeric / v_entrenos_planificados) * 100)
      else null end,
    'entrenosRealizados', v_entrenos_realizados,
    'entrenosPlanificados', v_entrenos_planificados,
    'pesoActual', v_peso_actual,
    'cambioPeso', case when v_peso_actual is not null and v_peso_anterior is not null
      then v_peso_actual - v_peso_anterior else null end,
    'proteinaPromedio', case when v_proteina_dias > 0 then round(v_proteina_total / v_proteina_dias) else null end,
    'pasosPromedio', case when v_pasos_dias > 0 then round(v_pasos_total / v_pasos_dias) else null end,
    'volumenSemanal', v_volumen
  );
end;
$$;

grant execute on function public.get_student_metrics(uuid, date) to authenticated;
