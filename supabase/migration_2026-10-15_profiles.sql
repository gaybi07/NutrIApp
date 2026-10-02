-- Perfiles: personal (nombre real + alias) y profesional (título, a qué se dedica, biografía, logros, WhatsApp).
-- Sin fotos por ahora (se muestran las iniciales).
--   · user_profiles: lo edita cada persona; el alias es único. Lo ven la propia persona y quien esté vinculado con ella.
--   · professional_profiles: lo edita el profesional. Lo ven sus alumnos vinculados (a través de get_professional_profile).
--   · get_professional_profile: arma el perfil con promedio de estrellas y opiniones (anónimas), solo para quien está
--     vinculado con ese profesional o para él mismo. El WhatsApp solo se entrega si el profesional lo marcó como visible.
-- Se puede correr más de una vez.

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nombre text,
  alias text,
  updated_at timestamptz not null default now()
);
create unique index if not exists user_profiles_alias_idx on public.user_profiles (lower(alias)) where alias is not null and alias <> '';

alter table public.user_profiles enable row level security;
drop policy if exists "own profile" on public.user_profiles;
create policy "own profile" on public.user_profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "linked people read profile" on public.user_profiles;
create policy "linked people read profile" on public.user_profiles for select using (
  exists (
    select 1 from public.trainer_links l
    where (l.student_id = auth.uid() and l.trainer_id = user_profiles.user_id)
       or (l.trainer_id = auth.uid() and l.student_id = user_profiles.user_id)
  )
);

create table if not exists public.professional_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  titulo text,
  dedicacion text,
  bio text,
  logros text,
  whatsapp text,
  mostrar_whatsapp boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.professional_profiles enable row level security;
drop policy if exists "own professional profile" on public.professional_profiles;
create policy "own professional profile" on public.professional_profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.get_professional_profile(p_trainer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_linked boolean;
  v_prof public.professional_profiles%rowtype;
  v_user public.user_profiles%rowtype;
  v_avg numeric;
  v_count int;
  v_opiniones jsonb;
  v_verificado boolean;
begin
  v_linked := (auth.uid() = p_trainer_id) or exists (
    select 1 from public.trainer_links l where l.student_id = auth.uid() and l.trainer_id = p_trainer_id
  );
  if not v_linked then
    return null;
  end if;

  select * into v_prof from public.professional_profiles where user_id = p_trainer_id;
  select * into v_user from public.user_profiles where user_id = p_trainer_id;
  select avg(stars)::numeric(3,2), count(*) into v_avg, v_count
    from public.link_feedback where trainer_id = p_trainer_id and author_role = 'alumno' and stars is not null;
  select coalesce(jsonb_agg(jsonb_build_object('stars', stars, 'comentario', comentario, 'fecha', created_at) order by created_at desc), '[]'::jsonb)
    into v_opiniones
    from (
      select stars, comentario, created_at from public.link_feedback
      where trainer_id = p_trainer_id and author_role = 'alumno' and comentario is not null and length(trim(comentario)) > 0
      order by created_at desc limit 20
    ) o;
  select exists (select 1 from public.trainer_applications a where a.user_id = p_trainer_id and a.status = 'aprobado') into v_verificado;

  return jsonb_build_object(
    'nombre', v_user.nombre,
    'alias', v_user.alias,
    'titulo', v_prof.titulo,
    'dedicacion', v_prof.dedicacion,
    'bio', v_prof.bio,
    'logros', v_prof.logros,
    'whatsapp', case when v_prof.mostrar_whatsapp then v_prof.whatsapp else null end,
    'promedio', v_avg,
    'cantidad', v_count,
    'opiniones', v_opiniones,
    'verificado', v_verificado
  );
end;
$$;

grant execute on function public.get_professional_profile(uuid) to authenticated;
