-- Omisiones: alimentos del plan que el paciente no comió, con el motivo (alergia, no le gusta, otro).
-- Las ve la Nutricionista en la pestaña Adherencia del paciente, al lado de la diferencia planificado vs. real.
-- Forma de cada elemento: { comida: "des|alm|mer|cen|col", alimento: text, motivo: "alergia|no_le_gusta|otro", nota?: text }

alter table public.days
  add column if not exists omisiones jsonb not null default '[]'::jsonb;

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
  v_omisiones jsonb;
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
    select coalesce(omisiones, '[]'::jsonb) into v_omisiones
      from public.days where user_id = p_student_id and fecha = p_week_start + v_offset;
    v_omisiones := coalesce(v_omisiones, '[]'::jsonb);
    v_actual_protein := coalesce(v_actual_protein, 0);

    v_dias := v_dias || jsonb_build_object(
      'fecha', p_week_start + v_offset,
      'plannedKcal', v_planned_kcal,
      'plannedProtein', v_planned_protein,
      'actualKcal', v_actual_kcal,
      'actualProtein', v_actual_protein,
      'omisiones', v_omisiones,
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
