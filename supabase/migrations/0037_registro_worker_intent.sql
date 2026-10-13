-- Signup honors the worker intent: accounts created with
-- raw_user_meta_data.worker_intent = 'true' start as personal, everything
-- else keeps the cliente default. Profile seeding is otherwise untouched.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre, telefono, rol)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'nombre', ''),
    nullif(new.raw_user_meta_data ->> 'telefono', ''),
    case when coalesce(new.raw_user_meta_data ->> 'worker_intent', 'false') = 'true'
      then 'personal'::public.rol_usuario
      else 'cliente'::public.rol_usuario
    end
  );
  return new;
end;
$$;
