-- Canonical address selected by the admin from Nominatim.
-- Nullable and additive so existing companies and coordinate-only updates remain valid.
alter table public.empresas add column if not exists direccion text;

comment on column public.empresas.direccion is
  'Canonical shop address selected by the admin; null until an address is selected.';
