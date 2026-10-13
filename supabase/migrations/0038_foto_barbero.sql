-- Worker avatar: photo column, public bucket with owner-only writes, RPC that
-- only lets a barber set their own photo, and the photo served in the guest
-- catalog. Same signatures elsewhere: existing grants stay valid.

alter table public.barberos add column if not exists foto_url text;

insert into storage.buckets (id, name, public)
values ('avatares-barberos', 'avatares-barberos', true)
on conflict (id) do nothing;

create policy avatares_public_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'avatares-barberos');

create policy avatares_owner_write on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatares-barberos'
    and exists (
      select 1 from public.barberos as b
      where b.perfil_id = auth.uid() and b.id::text = (storage.foldername(name))[1]
    )
  );

create policy avatares_owner_update on storage.objects for update to authenticated
  using (
    bucket_id = 'avatares-barberos'
    and exists (
      select 1 from public.barberos as b
      where b.perfil_id = auth.uid() and b.id::text = (storage.foldername(name))[1]
    )
  );

create or replace function public.actualizar_mi_foto_barbero(p_foto_url text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_id uuid := public.mi_barbero_actual_id();
begin
  if p_foto_url is null or btrim(p_foto_url) = '' then
    raise exception 'La foto no es válida';
  end if;
  update public.barberos set foto_url = btrim(p_foto_url) where id = v_id;
end;
$$;

grant execute on function public.actualizar_mi_foto_barbero(text) to authenticated;
revoke all on function public.actualizar_mi_foto_barbero(text) from public, anon;
grant execute on function public.actualizar_mi_foto_barbero(text) to authenticated;

-- Guests see the photo in the catalog; staff keep operating as before.
create or replace function public.catalogo_comercial(p_codigo text)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'nombre', e.nombre,
    'abierta', e.abierta,
    'servicios', coalesce((
      select jsonb_agg(jsonb_build_object(
        'servicio_id', s.id,
        'nombre', s.nombre,
        'descripcion', s.descripcion,
        'duracion_estimada_seg', s.duracion_estimada_seg,
        'duracion_medida_seg', (
          with r30 as (
            select extract(epoch from (t.fin_en - t.inicio_en))::integer as segundos
            from public.tickets as t
            where t.empresa_id = e.id and t.servicio_id = s.id
              and t.estado = 'finalizado' and t.inicio_en is not null and t.fin_en is not null
              and t.fin_en >= t.inicio_en
            order by t.fin_en desc limit 30
          ),
          med as (
            select percentile_cont(0.5) within group (order by r30.segundos) as m from r30
          )
          select case when count(*) = 0 then null else round(avg(r30.segundos))::integer end
          from r30 cross join med
          where med.m is null or med.m <= 0 or r30.segundos <= med.m * 2
        ),
        'precio_referencia_centavos', s.precio_referencia_centavos
      ) order by s.nombre)
      from public.servicios as s
      where s.empresa_id = e.id and s.activo
    ), '[]'::jsonb),
    'barberos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'barbero_id', b.id,
        'nombre', b.nombre,
        'estado', bo.estado,
        'foto_url', b.foto_url,
        'servicio_ids', (
          select coalesce(jsonb_agg(bs.servicio_id order by bs.servicio_id), '[]'::jsonb)
          from public.barbero_servicios as bs where bs.barbero_id = b.id
        )
      ) order by b.nombre)
      from public.barberos as b
      join public.barbero_operaciones as bo on bo.barbero_id = b.id
      where b.empresa_id = e.id and b.activo and bo.estado <> 'fuera_de_turno'
        and b.perfil_id is not null
        and exists (
          select 1 from public.perfiles as p
          join public.membresias_personal_empresa as m
            on m.perfil_id = p.id and m.empresa_id = b.empresa_id and m.activa
          where p.id = b.perfil_id and p.rol = 'personal'
        )
    ), '[]'::jsonb)
  )
  from public.empresas as e
  where e.codigo = upper(btrim(p_codigo));
$$;
