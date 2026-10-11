-- Global worker photo: perfiles.foto_url is the single source of truth, visible
-- identically in every barbershop. Forward-only: barberos.foto_url stays as a
-- per-shop fallback, existing grants and signatures stay valid.

alter table public.perfiles add column if not exists foto_url text;

-- The profile owner can write their own global photo (nombre/telefono grant stays).
grant update (foto_url) on public.perfiles to authenticated;

-- Backfill the global photo from the newest per-shop photo, without overwriting it.
update public.perfiles as p
set foto_url = src.foto_url
from (
  select distinct on (b.perfil_id) b.perfil_id, b.foto_url
  from public.barberos as b
  where b.perfil_id is not null and b.foto_url is not null and btrim(b.foto_url) <> ''
  order by b.perfil_id
) as src
where p.id = src.perfil_id and (p.foto_url is null or btrim(p.foto_url) = '');

-- Global storage slot owned by the profile itself (per-shop barbero slots stay valid).
insert into storage.buckets (id, name, public)
values ('avatares-barberos', 'avatares-barberos', true)
on conflict (id) do nothing;

create policy avatares_perfil_owner_write on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatares-barberos'
    and auth.uid()::text = (storage.foldername(name))[1]
    and exists (select 1 from public.perfiles as p where p.id = auth.uid() and p.rol = 'personal')
  );

create policy avatares_perfil_owner_update on storage.objects for update to authenticated
  using (
    bucket_id = 'avatares-barberos'
    and auth.uid()::text = (storage.foldername(name))[1]
    and exists (select 1 from public.perfiles as p where p.id = auth.uid() and p.rol = 'personal')
  );

-- Same signature: the worker writes once, every shop reads the same photo.
-- Mirrors into their per-shop rows so older clients keep working.
create or replace function public.actualizar_mi_foto_barbero(p_foto_url text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_foto text := btrim(p_foto_url);
begin
  if v_foto is null or v_foto = '' then
    raise exception 'La foto no es válida';
  end if;
  if not exists (select 1 from public.perfiles as p where p.id = auth.uid() and p.rol = 'personal') then
    raise exception 'No tienes un perfil de personal activo';
  end if;
  update public.perfiles set foto_url = v_foto where id = auth.uid();
  update public.barberos set foto_url = v_foto where perfil_id = auth.uid();
end;
$$;

grant execute on function public.actualizar_mi_foto_barbero(text) to authenticated;
revoke all on function public.actualizar_mi_foto_barbero(text) from public, anon;
grant execute on function public.actualizar_mi_foto_barbero(text) to authenticated;

-- Guests see the global photo in the catalog, falling back to the per-shop value.
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
        'foto_url', coalesce(p.foto_url, b.foto_url),
        'servicio_ids', (
          select coalesce(jsonb_agg(bs.servicio_id order by bs.servicio_id), '[]'::jsonb)
          from public.barbero_servicios as bs where bs.barbero_id = b.id
        )
      ) order by b.nombre)
      from public.barberos as b
      join public.barbero_operaciones as bo on bo.barbero_id = b.id
      left join public.perfiles as p on p.id = b.perfil_id
      where b.empresa_id = e.id and b.activo and bo.estado <> 'fuera_de_turno'
        and b.perfil_id is not null
        and exists (
          select 1 from public.perfiles as p2
          join public.membresias_personal_empresa as m
            on m.perfil_id = p2.id and m.empresa_id = b.empresa_id and m.activa
          where p2.id = b.perfil_id and p2.rol = 'personal'
        )
    ), '[]'::jsonb)
  )
  from public.empresas as e
  where e.codigo = upper(btrim(p_codigo));
$$;
