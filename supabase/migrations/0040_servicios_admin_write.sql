-- Admin catalog writes mirror filas_admin_write: the admin manages the
-- services and the barber pivot of their own empresa. Deletes are safe by
-- schema (pivot cascades, tickets keep their name snapshot with servicio_id
-- nulled); duplicate names are rejected by the unique constraint.

create policy servicios_admin_write on public.servicios for all to authenticated
  using (empresa_id = public.mi_empresa_id() and public.mi_rol() = 'admin')
  with check (empresa_id = public.mi_empresa_id() and public.mi_rol() = 'admin');

create policy barbero_servicios_admin_write on public.barbero_servicios for all to authenticated
  using (exists (
    select 1 from public.barberos as b
    where b.id = barbero_servicios.barbero_id
      and b.empresa_id = public.mi_empresa_id()
      and public.mi_rol() = 'admin'
  ))
  with check (exists (
    select 1 from public.barberos as b
    where b.id = barbero_servicios.barbero_id
      and b.empresa_id = public.mi_empresa_id()
      and public.mi_rol() = 'admin'
  ));
