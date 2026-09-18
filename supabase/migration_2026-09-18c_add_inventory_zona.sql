-- Zona de la Alacena para la vista "Cocina Virtual" (alacena flotante, sobre
-- la mesada, bajo mesada, heladera) -- solo organizativo, no toca nutrición
-- ni stock. Ver components/CocinaView.tsx.
alter table public.inventory_items add column if not exists zona text;
