-- Reporte semanal: reusa la tabla `reports` diseñada en
-- migration_2026-09-21_add_trainer_module.sql (nunca se había usado, pero a
-- diferencia de `incidents`/`workout_executions` no depende de
-- assigned_sessions -- es autosuficiente, se puede usar tal cual).
--
-- Sin IA: el "borrador" es 100% cálculo determinístico, reusando
-- get_student_metrics() (migration_2026-09-21d) + un conteo de incidencias
-- del período. El comentario manual y el envío se hacen con UPDATE directo
-- desde el cliente -- ya cubierto por la policy "trainer manages own
-- reports" que ya existía, no hace falta otra función para eso.

-- Un reporte por alumno y semana -- generar de nuevo la misma semana
-- actualiza los números en vez de acumular duplicados en el historial.
alter table public.reports
  add constraint reports_trainer_student_period_unique unique (trainer_id, student_id, period_start);

create or replace function public.generate_student_report(p_student_id uuid, p_period_start date)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_metrics jsonb;
  v_period_end date;
  v_incident_counts jsonb;
  v_incident_total int;
  v_report_id uuid;
begin
  if not public.is_active_trainer_of(p_student_id) then
    raise exception 'No autorizado';
  end if;

  v_period_end := p_period_start + 6;
  v_metrics := public.get_student_metrics(p_student_id, p_period_start);

  select count(*) into v_incident_total
    from public.routine_incidents
    where student_id = p_student_id and trainer_id = auth.uid()
      and fecha >= p_period_start and fecha <= v_period_end;

  select coalesce(jsonb_object_agg(tipo, cantidad), '{}'::jsonb) into v_incident_counts
  from (
    select tipo, count(*) as cantidad
    from public.routine_incidents
    where student_id = p_student_id and trainer_id = auth.uid()
      and fecha >= p_period_start and fecha <= v_period_end
    group by tipo
  ) t;

  v_metrics := v_metrics || jsonb_build_object(
    'incidenciasTotal', v_incident_total,
    'incidenciasPorTipo', v_incident_counts
  );

  insert into public.reports (trainer_id, student_id, period_start, period_end, status, metrics, generated_at)
    values (auth.uid(), p_student_id, p_period_start, v_period_end, 'borrador', v_metrics, now())
  on conflict (trainer_id, student_id, period_start)
    do update set metrics = excluded.metrics, generated_at = now()
  returning id into v_report_id;

  return v_report_id;
end;
$$;

grant execute on function public.generate_student_report(uuid, date) to authenticated;
