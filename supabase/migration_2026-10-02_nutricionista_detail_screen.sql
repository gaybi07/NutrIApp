-- La pantalla de detalle de alumno (get_student_metrics/get_student_week_
-- detail/get_student_weight_history, migration_2026-09-21d/e) y el insert
-- de trainer_comments quedaron con is_active_trainer_of(student_id) SIN
-- el segundo argumento -- default 'fuerza' para siempre. Un Nutricionista
-- (vínculo disciplina='nutricion') nunca pasa ese chequeo, así que hoy no
-- puede tener una pantalla de detalle de paciente en absoluto. Se agrega
-- p_disciplina (default 'fuerza' => nada de lo ya construido para
-- Entrenador cambia de comportamiento) a las tres funciones, y la policy
-- de comentarios pasa a aceptar cualquiera de las dos disciplinas (un
-- comentario no se distingue por disciplina, así que no hace falta una
-- columna nueva).

-- create or replace NO alcanza para cambiar la firma (agrega un overload
-- nuevo en vez de reemplazar) -- se borra la vieja de 2 argumentos primero.
drop function if exists public.get_student_metrics(uuid, date);

create or replace function public.get_student_metrics(p_student_id uuid, p_week_start date, p_disciplina text default 'fuerza')
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
  if not public.is_active_trainer_of(p_student_id, p_disciplina) then
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

    if (v_day.des_k + v_day.alm_k + v_day.mer_k + v_day.cen_k + coalesce(v_day.col_k, 0)) > 0 then
      v_proteina_total := v_proteina_total + v_day.des_p + v_day.alm_p + v_day.mer_p + v_day.cen_p + coalesce(v_day.col_p, 0);
      v_proteina_dias := v_proteina_dias + 1;
    end if;

    if v_day.pasos > 0 then
      v_pasos_total := v_pasos_total + v_day.pasos;
      v_pasos_dias := v_pasos_dias + 1;
    end if;

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

grant execute on function public.get_student_metrics(uuid, date, text) to authenticated;

drop function if exists public.get_student_week_detail(uuid, date);

create or replace function public.get_student_week_detail(p_student_id uuid, p_week_start date, p_disciplina text default 'fuerza')
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_day record;
  v_exercise jsonb;
  v_set jsonb;
  v_ex_volume numeric;
  v_peso numeric;
  v_day_volume numeric;
  v_dias jsonb := '[]'::jsonb;
  v_intensidad text;
begin
  if not public.is_active_trainer_of(p_student_id, p_disciplina) then
    raise exception 'No autorizado';
  end if;

  for v_day in
    select * from public.days
    where user_id = p_student_id and fecha >= p_week_start and fecha < p_week_start + 7
    order by fecha
  loop
    v_day_volume := 0;
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
        v_day_volume := v_day_volume + v_ex_volume;
      end loop;
    end if;

    v_intensidad := null;
    if v_day.entrenamientos is not null and jsonb_array_length(v_day.entrenamientos) > 0 then
      v_intensidad := v_day.entrenamientos->0->>'intensidad';
    elsif v_day.entreno_intensidad is not null then
      v_intensidad := v_day.entreno_intensidad;
    end if;

    v_dias := v_dias || jsonb_build_object(
      'fecha', v_day.fecha,
      'kcal', v_day.des_k + v_day.alm_k + v_day.mer_k + v_day.cen_k + coalesce(v_day.col_k, 0),
      'proteina', v_day.des_p + v_day.alm_p + v_day.mer_p + v_day.cen_p + coalesce(v_day.col_p, 0),
      'carbohidratos', coalesce(v_day.des_c, 0) + coalesce(v_day.alm_c, 0) + coalesce(v_day.mer_c, 0) + coalesce(v_day.cen_c, 0) + coalesce(v_day.col_c, 0),
      'grasas', coalesce(v_day.des_g, 0) + coalesce(v_day.alm_g, 0) + coalesce(v_day.mer_g, 0) + coalesce(v_day.cen_g, 0) + coalesce(v_day.col_g, 0),
      'pasos', v_day.pasos,
      'entreno', v_day.entreno or jsonb_array_length(coalesce(v_day.entrenamientos, '[]'::jsonb)) > 0,
      'entrenoIntensidad', v_intensidad,
      'volumen', v_day_volume
    );
  end loop;

  return v_dias;
end;
$$;

grant execute on function public.get_student_week_detail(uuid, date, text) to authenticated;

drop function if exists public.get_student_weight_history(uuid, int);

create or replace function public.get_student_weight_history(p_student_id uuid, p_weeks int default 8, p_disciplina text default 'fuerza')
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_weekly_weights jsonb;
  v_result jsonb;
  v_min_week date;
begin
  if not public.is_active_trainer_of(p_student_id, p_disciplina) then
    raise exception 'No autorizado';
  end if;

  select weekly_weights into v_weekly_weights from public.user_settings where user_id = p_student_id;
  if v_weekly_weights is null then
    return '[]'::jsonb;
  end if;

  v_min_week := date_trunc('week', current_date)::date - (greatest(p_weeks, 1) * 7);

  select coalesce(jsonb_agg(jsonb_build_object('weekStart', key, 'peso', value::numeric) order by key), '[]'::jsonb)
    into v_result
  from jsonb_each_text(v_weekly_weights) as t(key, value)
  where key::date >= v_min_week;

  return v_result;
end;
$$;

grant execute on function public.get_student_weight_history(uuid, int, text) to authenticated;

-- Un comentario no distingue disciplina (no hay columna para eso) -- alcanza
-- con permitir el insert si hay CUALQUIERA de los dos vínculos activos.
drop policy if exists "trainer can create comments for linked students" on public.trainer_comments;
create policy "trainer can create comments for linked students"
  on public.trainer_comments for insert
  with check (
    trainer_id = auth.uid()
    and (public.is_active_trainer_of(student_id, 'fuerza') or public.is_active_trainer_of(student_id, 'nutricion'))
  );

-- ============================================================
-- Adherencia al plan nutricional -- cuánto se parece lo que el paciente
-- cargó de verdad a lo que el Nutricionista publicó esa semana. Se compara
-- kcal reales del día contra la suma de la opción A de cada comida
-- planificada ese weekday (mismo criterio que "Importar plan nutricional a
-- la semana" en WeekPlanner: la primera opción es la que cuenta como
-- objetivo por default).
-- ============================================================
create or replace function public.get_patient_nutrition_adherence(p_student_id uuid, p_week_start date)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_plan record;
  v_day record;
  v_weekday text;
  v_day_options jsonb;
  v_meal jsonb;
  v_planned_kcal numeric;
  v_planned_protein numeric;
  v_actual_kcal numeric;
  v_actual_protein numeric;
  v_dias jsonb := '[]'::jsonb;
  v_sum_pct numeric := 0;
  v_pct_count int := 0;
  v_offset int;
begin
  if not public.is_active_trainer_of(p_student_id, 'nutricion') then
    raise exception 'No autorizado';
  end if;

  select * into v_plan from public.training_plans
    where student_id = p_student_id and disciplina = 'nutricion'
      and week_start = p_week_start and status = 'publicado';

  for v_offset in 0..6 loop
    v_weekday := (array['domingo','lunes','martes','miercoles','jueves','viernes','sabado'])[extract(dow from p_week_start + v_offset)::int + 1];
    v_day_options := coalesce(v_plan.days -> v_weekday, '{}'::jsonb);

    v_planned_kcal := 0;
    v_planned_protein := 0;
    for v_meal in select value from jsonb_each(v_day_options) loop
      if jsonb_array_length(v_meal) > 0 then
        v_planned_kcal := v_planned_kcal + coalesce((v_meal->0->>'kcal')::numeric, 0);
        v_planned_protein := v_planned_protein + coalesce((v_meal->0->>'protein')::numeric, 0);
      end if;
    end loop;

    select
      des_k + alm_k + mer_k + cen_k + coalesce(col_k, 0),
      des_p + alm_p + mer_p + cen_p + coalesce(col_p, 0)
      into v_actual_kcal, v_actual_protein
      from public.days where user_id = p_student_id and fecha = p_week_start + v_offset;
    v_actual_kcal := coalesce(v_actual_kcal, 0);
    v_actual_protein := coalesce(v_actual_protein, 0);

    v_dias := v_dias || jsonb_build_object(
      'fecha', p_week_start + v_offset,
      'plannedKcal', v_planned_kcal,
      'plannedProtein', v_planned_protein,
      'actualKcal', v_actual_kcal,
      'actualProtein', v_actual_protein,
      'pctSimilitud', case when v_planned_kcal > 0 and v_actual_kcal > 0
        then greatest(0, round(100 - (abs(v_actual_kcal - v_planned_kcal) / v_planned_kcal * 100)))
        else null end
    );

    if v_planned_kcal > 0 and v_actual_kcal > 0 then
      v_sum_pct := v_sum_pct + greatest(0, 100 - (abs(v_actual_kcal - v_planned_kcal) / v_planned_kcal * 100));
      v_pct_count := v_pct_count + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'weekStart', p_week_start,
    'hasPlan', v_plan.id is not null,
    'adherenciaPromedio', case when v_pct_count > 0 then round(v_sum_pct / v_pct_count) else null end,
    'dias', v_dias
  );
end;
$$;

grant execute on function public.get_patient_nutrition_adherence(uuid, date) to authenticated;
