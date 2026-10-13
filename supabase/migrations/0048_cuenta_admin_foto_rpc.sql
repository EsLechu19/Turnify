-- Admin photo save mirrors actualizar_mi_foto_barbero exactly, with the role
-- check flipped to admin. The web client calls this RPC instead of writing
-- perfiles directly, so the upload path is identical to the worker one:
-- same bucket, same self-owned folder, same RPC-record pattern.

create or replace function public.actualizar_mi_foto_admin(p_foto_url text)
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
  if not exists (select 1 from public.perfiles as p where p.id = auth.uid() and p.rol = 'admin') then
    raise exception 'No tienes una cuenta de administrador activa';
  end if;
  update public.perfiles set foto_url = v_foto where id = auth.uid();
end;
$$;

grant execute on function public.actualizar_mi_foto_admin(text) to authenticated;
revoke all on function public.actualizar_mi_foto_admin(text) from public, anon;
grant execute on function public.actualizar_mi_foto_admin(text) to authenticated;
