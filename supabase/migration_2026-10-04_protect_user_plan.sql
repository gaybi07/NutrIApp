-- `user_settings.plan` lo decide el pago (webhook de MercadoPago, service role),
-- no el usuario. Hasta ahora la RLS "for all" dejaba a cada usuario reescribir su
-- propia fila, incluido `plan`, y app/api/data lo pisaba con lo que mandaba el
-- navegador. Este trigger deja el plan intacto para cualquier sesión de usuario
-- (rol "authenticated"/"anon"); el service role y el SQL Editor siguen pudiendo
-- cambiarlo.

create or replace function public.trg_protect_user_settings_plan()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.plan := 'basico';
    else
      new.plan := old.plan;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_user_settings_plan on public.user_settings;
create trigger protect_user_settings_plan
  before insert or update on public.user_settings
  for each row execute function public.trg_protect_user_settings_plan();
