-- Pantalla de detalle de alumno (la pantalla principal de trabajo del
-- entrenador): agrega lo que le falta a get_student_metrics
-- (migration_2026-09-21d) para las secciones Entrenamientos/Nutrición/
-- Evolución de peso, más comentarios del entrenador al alumno.
--
-- Mismo criterio de privacidad que el resto del módulo: nada de esto le da
-- al entrenador SELECT crudo sobre `days`/`user_settings` -- son funciones
-- que calculan y devuelven solo lo necesario para estas secciones.

-- Detalle día por día de la semana (Entrenamientos + Nutrición comparten
-- esta misma llamada -- una sola consulta al abrir la pantalla en vez de
-- una por sección, para que sea rápida de abrir).
create or replace function public.get_student_week_detail(p_student_id uuid, p_week_start date)
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
  if not public.is_active_trainer_of(p_student_id) then
    raise exception 'No autorizado';
  end if;

  for v_day in
    select * from public.days
    where user_id = p_student_id and fecha >= p_week_start and fecha < p_week_start + 7
    order by fecha
  loop
    -- Misma fórmula que exerciseVolume() del cliente (ver
    -- migration_2026-09-21d para la explicación del peso ausente/0 -> 1).
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

grant execute on function public.get_student_week_detail(uuid, date) to authenticated;

-- Evolución de peso: últimas N semanas con peso cargado (weekly_weights),
-- para el gráfico de tendencia.
create or replace function public.get_student_weight_history(p_student_id uuid, p_weeks int default 8)
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
  if not public.is_active_trainer_of(p_student_id) then
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

grant execute on function public.get_student_weight_history(uuid, int) to authenticated;

-- Comentarios del entrenador al alumno -- de una sola vía (igual que las
-- observaciones que se habían diseñado para el módulo grande, pero sin la
-- dependencia a session_id/assigned_sessions, que nunca se cablearon).
create table public.trainer_comments (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  texto text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index trainer_comments_student_idx on public.trainer_comments (student_id, created_at desc);
create index trainer_comments_trainer_student_idx on public.trainer_comments (trainer_id, student_id, created_at desc);

alter table public.trainer_comments enable row level security;

create policy "trainer can create comments for linked students"
  on public.trainer_comments for insert
  with check (trainer_id = auth.uid() and public.is_active_trainer_of(student_id));

create policy "trainer can view own comments"
  on public.trainer_comments for select
  using (trainer_id = auth.uid());

create policy "student can view own comments"
  on public.trainer_comments for select
  using (student_id = auth.uid());

create policy "student can mark comments as read"
  on public.trainer_comments for update
  using (student_id = auth.uid());

create or replace function public.trg_guard_trainer_comments_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() <> old.student_id then
    raise exception 'No autorizado';
  end if;
  if new.texto <> old.texto or new.trainer_id <> old.trainer_id or new.student_id <> old.student_id then
    raise exception 'El alumno solo puede marcar el comentario como leído';
  end if;
  return new;
end;
$$;

create trigger trainer_comments_update_guard
  before update on public.trainer_comments
  for each row execute function public.trg_guard_trainer_comments_update();
