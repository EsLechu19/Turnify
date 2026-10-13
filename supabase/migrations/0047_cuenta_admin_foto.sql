-- Admin account photo: administrators reuse the shared avatar bucket with the
-- same self-owned folder pattern as workers. No worker policy is touched;
-- guests never appear here (folder must equal the authenticated uid).

create policy avatares_admin_owner_write on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatares-barberos'
    and auth.uid()::text = (storage.foldername(name))[1]
    and exists (select 1 from public.perfiles as p where p.id = auth.uid() and p.rol = 'admin')
  );

create policy avatares_admin_owner_update on storage.objects for update to authenticated
  using (
    bucket_id = 'avatares-barberos'
    and auth.uid()::text = (storage.foldername(name))[1]
    and exists (select 1 from public.perfiles as p where p.id = auth.uid() and p.rol = 'admin')
  );
