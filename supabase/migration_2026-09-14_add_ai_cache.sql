-- Cache compartido de respuestas de IA (parse-meal, parse-shopping,
-- review-inventory, parse-nutrition-label) -- clave = hash del prompt
-- (system + input normalizado), valor = la respuesta ya calculada. Es
-- GLOBAL (no por usuario): si dos personas piden lo mismo (ej. "2 huevos y
-- una tostada"), la segunda no gasta cuota de la IA. No tiene datos
-- personales, solo texto de comida/productos y su cálculo nutricional.
create table if not exists public.ai_cache (
  cache_key text primary key,
  response jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.ai_cache enable row level security;

-- Cache no-sensible y compartido a propósito: cualquiera con la key
-- pública (anon) puede leer y escribir, igual que ya pasa con la key
-- expuesta en el cliente para todo lo demás de este proyecto.
create policy "ai_cache_select" on public.ai_cache for select using (true);
create policy "ai_cache_insert" on public.ai_cache for insert with check (true);
create policy "ai_cache_update" on public.ai_cache for update using (true);
