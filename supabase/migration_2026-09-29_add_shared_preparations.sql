-- Memoria global de preparaciones, solo para evitar duplicados -- cuando
-- alguien guarda una preparación (ver lib/useMealPreparations.ts) parecida
-- a una que ya guardó otro usuario (nombre normalizado + ingredientes
-- principales, ver lib/useSharedPreparations.ts), se reusa esta fila en vez
-- de crear una nueva. Nadie ve estas filas directamente -- no es un
-- catálogo explorable, solo referencia interna. La lista PERSONAL de cada
-- usuario (localStorage, sin cambios) sigue siendo la única que se muestra.

create table public.shared_preparations (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  nombre_key text not null, -- foodKey(nombre) del lado cliente, para buscar candidatos rápido
  categoria text not null,
  ingredientes jsonb not null, -- PreparationIngredient[] de referencia (de quien la creó)
  veces_usada integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shared_preparations_nombre_key_idx on public.shared_preparations (nombre_key);

alter table public.shared_preparations enable row level security;

create policy "cualquier autenticado puede leer shared_preparations"
  on public.shared_preparations for select
  using (true);

create policy "cualquier autenticado puede crear shared_preparations"
  on public.shared_preparations for insert
  with check (auth.uid() is not null);

-- Sin policy de UPDATE para el usuario: el contador de uso (creado por
-- cualquiera, reusado por cualquiera) se incrementa vía esta función
-- SECURITY DEFINER, mismo patrón que join_trainer()/generate_trainer_invite_code().
create or replace function public.bump_shared_preparation_usage(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.shared_preparations
    set veces_usada = veces_usada + 1, updated_at = now()
    where id = p_id;
$$;

grant execute on function public.bump_shared_preparation_usage(uuid) to authenticated;
