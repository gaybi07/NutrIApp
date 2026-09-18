-- Certificación de entrenador: cualquier usuario puede postularse subiendo
-- un comprobante (PDF o foto) de su curso/título. Vos (el único admin,
-- identificado por email) revisás y aprobás/rechazás a mano -- no hay
-- validación automática de autenticidad, la revisión la hacés vos.
--
-- Una sola fila por usuario (unique user_id): volver a postularse
-- (por ej. después de un rechazo) actualiza la misma fila en vez de
-- crear una nueva.

create table public.trainer_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null,
  certificate_path text not null, -- ruta dentro del bucket "trainer-certificates"
  status text not null default 'pendiente', -- pendiente | aprobado | rechazado
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  review_note text,
  unique (user_id)
);

alter table public.trainer_applications enable row level security;

create policy "users can view their own trainer application"
  on public.trainer_applications for select
  using (auth.uid() = user_id or auth.jwt() ->> 'email' = 'jgabrielrosa8@gmail.com');

create policy "users can create their own trainer application"
  on public.trainer_applications for insert
  with check (auth.uid() = user_id);

-- Podés reeditar tu propia postulación mientras esté pendiente o rechazada
-- (para volver a mandarla), pero el resultado del update siempre te deja en
-- "pendiente" de nuevo -- no podés autoaprobarte cambiando el status vos
-- mismo.
create policy "users can resubmit their own application"
  on public.trainer_applications for update
  using (auth.uid() = user_id and status in ('pendiente', 'rechazado'))
  with check (auth.uid() = user_id and status = 'pendiente');

create policy "admin can review trainer applications"
  on public.trainer_applications for update
  using (auth.jwt() ->> 'email' = 'jgabrielrosa8@gmail.com')
  with check (auth.jwt() ->> 'email' = 'jgabrielrosa8@gmail.com');

-- Bucket privado (no público): el comprobante solo lo puede ver su dueño y
-- el admin, vía signed URL.
insert into storage.buckets (id, name, public)
values ('trainer-certificates', 'trainer-certificates', false)
on conflict (id) do nothing;

create policy "trainer can upload own certificate"
  on storage.objects for insert
  with check (
    bucket_id = 'trainer-certificates'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "trainer can replace own certificate"
  on storage.objects for update
  using (
    bucket_id = 'trainer-certificates'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "trainer can view own certificate, admin can view all"
  on storage.objects for select
  using (
    bucket_id = 'trainer-certificates'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or auth.jwt() ->> 'email' = 'jgabrielrosa8@gmail.com'
    )
  );
