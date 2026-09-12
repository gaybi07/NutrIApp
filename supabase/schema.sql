create table public.days (
  user_id uuid not null references auth.users(id) on delete cascade,
  fecha date not null,
  des_k integer not null default 0,
  des_p integer not null default 0,
  des_c integer not null default 0,
  des_g integer not null default 0,
  des_f integer not null default 0,
  alm_k integer not null default 0,
  alm_p integer not null default 0,
  alm_c integer not null default 0,
  alm_g integer not null default 0,
  alm_f integer not null default 0,
  mer_k integer not null default 0,
  mer_p integer not null default 0,
  mer_c integer not null default 0,
  mer_g integer not null default 0,
  mer_f integer not null default 0,
  cen_k integer not null default 0,
  cen_p integer not null default 0,
  cen_c integer not null default 0,
  cen_g integer not null default 0,
  cen_f integer not null default 0,
  pasos integer not null default 0,
  entreno boolean not null default false,
  peso_kg numeric,
  sueno_horas numeric,
  entreno_minutos integer,
  entreno_intensidad text,
  entrenamientos jsonb not null default '[]'::jsonb,
  ejercicios jsonb not null default '[]'::jsonb,
  alimentos jsonb not null default '[]'::jsonb,
  des_items jsonb not null default '[]'::jsonb,
  alm_items jsonb not null default '[]'::jsonb,
  mer_items jsonb not null default '[]'::jsonb,
  cen_items jsonb not null default '[]'::jsonb,
  primary key (user_id, fecha)
);

create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  goal integer not null default 2400,
  tdee_fallback integer not null default 3200,
  weekly_weights jsonb not null default '{}'::jsonb,
  calculator_profile jsonb,
  tour_done boolean not null default false,
  week_plan jsonb not null default '{}'::jsonb,
  routines jsonb not null default '[]'::jsonb,
  training_schedule jsonb not null default '{}'::jsonb,
  theme text,
  enabled_tabs jsonb not null default '[]'::jsonb,
  font_size text,
  inicio_order jsonb not null default '[]'::jsonb,
  comidas_order jsonb not null default '[]'::jsonb,
  macros_order jsonb not null default '[]'::jsonb,
  actividad_order jsonb not null default '[]'::jsonb
);

alter table public.days enable row level security;
alter table public.user_settings enable row level security;

create policy "Users can manage their own days"
  on public.days for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their own settings"
  on public.user_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
