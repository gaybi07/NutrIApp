-- Tabla compartida de alimentos base: macros por 100 g (o por unidad, ver
-- gramos_por_unidad) de ingredientes simples -- huevo, banana, pollo, arroz.
-- A diferencia de ai_cache (que solo evita repetir una consulta IDÉNTICA,
-- "2 huevos" y "3 huevos" no se cruzan), esto guarda el ALIMENTO, así
-- cualquier cantidad de cualquier comida futura ya no necesita a la IA.
-- Es GLOBAL como ai_cache: no tiene datos personales, y lo que aprende un
-- usuario le sirve a todos.
create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  -- Nombre normalizado (minúscula, sin tildes, singular) -- misma
  -- normalización que inventoryKey()/foodKey() en lib/foodText.ts, así
  -- "Huevos" de una comida y "huevo" de la alacena caen en la misma fila.
  nombre_key text not null unique,
  kcal numeric not null,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fat numeric not null default 0,
  fiber numeric not null default 0,
  -- Peso aproximado de UNA unidad natural (1 huevo ≈ 55 g, 1 banana ≈ 120 g).
  -- null para lo que no tiene unidad natural (arroz, harina, aceite).
  gramos_por_unidad numeric,
  origen text not null default 'aprendido_ia'
    check (origen in ('seed_curado', 'aprendido_ia', 'off')),
  verificado boolean not null default false,
  veces_usado integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists foods_nombre_key_idx on public.foods (nombre_key);

alter table public.foods enable row level security;

create policy "foods_select" on public.foods for select using (true);
create policy "foods_insert" on public.foods for insert with check (true);
-- OJO: a diferencia de ai_cache, el update NO es "using (true)" -- acá sí hay
-- algo que proteger: las filas curadas/verificadas son la fuente de verdad y
-- no las puede pisar una estimación nueva de la IA.
create policy "foods_update" on public.foods for update
  using (origen = 'aprendido_ia' and verificado = false);

-- Semilla curada: alimentos base comunes, revisados a mano, para que el
-- desglose y la resolución sin IA sirvan desde el día uno. El resto de los
-- ~500 alimentos queda como tarea de curación aparte.
insert into public.foods (nombre, nombre_key, kcal, protein, carbs, fat, fiber, gramos_por_unidad, origen, verificado) values
  ('Huevo', 'huevo', 143, 13, 1, 10, 0, 55, 'seed_curado', true),
  ('Banana', 'banana', 89, 1, 23, 0, 3, 120, 'seed_curado', true),
  ('Manzana', 'manzana', 52, 0, 14, 0, 2, 180, 'seed_curado', true),
  ('Palta', 'palta', 160, 2, 9, 15, 7, 200, 'seed_curado', true),
  ('Tomate', 'tomate', 18, 1, 4, 0, 1, 120, 'seed_curado', true),
  ('Pollo pechuga', 'pollo pechuga', 165, 31, 0, 4, 0, null, 'seed_curado', true),
  ('Carne vacuna', 'carne vacuna', 250, 26, 0, 17, 0, null, 'seed_curado', true),
  ('Milanesa de pollo', 'milanesa de pollo', 266, 24, 12, 14, 1, 150, 'seed_curado', true),
  ('Arroz cocido', 'arroz cocido', 130, 2, 28, 0, 0, null, 'seed_curado', true),
  ('Fideos cocidos', 'fideo cocido', 158, 6, 31, 1, 2, null, 'seed_curado', true),
  ('Papa', 'papa', 77, 2, 17, 0, 2, 150, 'seed_curado', true),
  ('Pan', 'pan', 265, 9, 49, 3, 3, 30, 'seed_curado', true),
  ('Tostada', 'tostada', 313, 10, 60, 4, 4, 25, 'seed_curado', true),
  ('Queso cremoso', 'queso cremoso', 300, 20, 2, 24, 0, null, 'seed_curado', true),
  ('Yogur natural', 'yogur natural', 61, 3, 5, 3, 0, 180, 'seed_curado', true),
  ('Leche', 'leche', 61, 3, 5, 3, 0, null, 'seed_curado', true),
  ('Avena', 'avena', 389, 17, 66, 7, 10, null, 'seed_curado', true),
  ('Lechuga', 'lechuga', 15, 1, 3, 0, 1, null, 'seed_curado', true),
  ('Cebolla', 'cebolla', 40, 1, 9, 0, 2, 110, 'seed_curado', true),
  ('Zanahoria', 'zanahoria', 41, 1, 10, 0, 3, 60, 'seed_curado', true),
  ('Naranja', 'naranja', 47, 1, 12, 0, 2, 150, 'seed_curado', true),
  ('Mandarina', 'mandarina', 53, 1, 13, 0, 2, 90, 'seed_curado', true),
  ('Pera', 'pera', 57, 0, 15, 0, 3, 180, 'seed_curado', true),
  ('Durazno', 'durazno', 39, 1, 10, 0, 2, 150, 'seed_curado', true),
  ('Kiwi', 'kiwi', 61, 1, 15, 1, 3, 75, 'seed_curado', true),
  ('Pan rallado', 'pan rallado', 395, 13, 72, 5, 4, null, 'seed_curado', true),
  ('Harina', 'harina', 364, 10, 76, 1, 3, null, 'seed_curado', true),
  ('Aceite', 'aceite', 884, 0, 0, 100, 0, null, 'seed_curado', true),
  ('Atún al natural', 'atun al natural', 116, 26, 0, 1, 0, null, 'seed_curado', true),
  ('Jamón cocido', 'jamon cocido', 145, 18, 1, 7, 0, null, 'seed_curado', true),
  ('Alfajor', 'alfajor', 440, 5, 60, 20, 1, 45, 'seed_curado', true),
  ('Medialuna', 'medialuna', 410, 8, 45, 22, 2, 50, 'seed_curado', true),
  ('Empanada', 'empanada', 250, 8, 25, 13, 1, 100, 'seed_curado', true),
  ('Yogur bebible', 'yogur bebible', 70, 2, 12, 1, 0, 200, 'seed_curado', true)
on conflict (nombre_key) do nothing;
