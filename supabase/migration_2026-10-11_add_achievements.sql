-- Logros diarios, semanales y mensuales + avance de los objetivos propios (el de la calculadora).
-- La app detecta el logro con lo que carga la persona y lo "reclama" con claim_achievement(tipo, clave); los puntos
-- NO los elige la app: los decide la base según el tipo (achievement_points) y se acreditan una sola vez por
-- (tipo, clave). Por ahora el cumplimiento lo detecta el cliente; antes de poder gastar puntos hay que verificarlo
-- del lado del servidor.
--   DIARIOS:    dia_objetivo 5 (clave: fecha|objetivo) · dia_perfecto 10 (fecha) · dia_comidas 5 (fecha)
--   SEMANALES:  sem_objetivo 25 (lunes|objetivo) · sem_registro 20 (lunes) · sem_peso 10 (lunes)
--   MENSUALES:  mes_constancia 75 (AAAA-MM) · mes_peso 50 (AAAA-MM)
--   PROPIOS:    propio_25 / propio_50 / propio_75 20 (meta|modo|hito) · propio_logrado 150 (meta|modo)

alter table public.points_ledger add column if not exists kind text;
alter table public.points_ledger add column if not exists clave text;
create unique index if not exists points_ledger_kind_clave_idx
  on public.points_ledger (student_id, kind, clave)
  where kind is not null;

create or replace function public.achievement_points(p_kind text)
returns int
language sql
immutable
as $$
  select case p_kind
    when 'dia_objetivo' then 5
    when 'dia_perfecto' then 10
    when 'dia_comidas' then 5
    when 'sem_objetivo' then 25
    when 'sem_registro' then 20
    when 'sem_peso' then 10
    when 'mes_constancia' then 75
    when 'mes_peso' then 50
    when 'propio_25' then 20
    when 'propio_50' then 20
    when 'propio_75' then 20
    when 'propio_logrado' then 150
    else 0
  end;
$$;

create or replace function public.claim_achievement(p_kind text, p_clave text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points int;
  v_inserted int;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  v_points := public.achievement_points(p_kind);
  if v_points <= 0 then
    raise exception 'Logro desconocido';
  end if;
  if p_clave is null or length(trim(p_clave)) = 0 or length(p_clave) > 200 then
    raise exception 'Clave inválida';
  end if;
  insert into public.points_ledger (student_id, motivo, puntos, kind, clave)
    values (auth.uid(), p_kind, v_points, p_kind, p_clave)
  on conflict (student_id, kind, clave) where kind is not null do nothing;
  get diagnostics v_inserted = row_count;
  return case when v_inserted > 0 then v_points else 0 end;
end;
$$;

grant execute on function public.claim_achievement(text, text) to authenticated;
