-- Hoja de Campo Digital: base de datos en Supabase.
-- Se ejecuta una sola vez en Supabase → SQL Editor → New query → pegar todo → Run.
--
-- Qué crea:
--   perfiles   un perfil por usuario (nombre y si es administrador).
--   registros  una fila por caracterización; el registro completo va en «data» (jsonb).
--   fotos      bucket de Storage para las fotos de evidencia.
-- Seguridad: cada técnico ve y edita solo sus registros; el administrador lo ve todo.
-- El PRIMER usuario que se dé de alta queda como administrador automáticamente.

-- ---------- perfiles ----------
create table if not exists public.perfiles (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  nombre    text not null,
  es_admin  boolean not null default false,
  creado    timestamptz not null default now()
);

create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select es_admin from public.perfiles where user_id = auth.uid()), false)
$$;

-- Crea el perfil al dar de alta un usuario (Authentication → Add user).
create or replace function public.crear_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (user_id, nombre, es_admin)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'nombre', ''), split_part(new.email, '@', 1)),
    not exists (select 1 from public.perfiles)
  );
  return new;
end $$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario after insert on auth.users
  for each row execute function public.crear_perfil();

alter table public.perfiles enable row level security;
drop policy if exists "ver perfiles" on public.perfiles;
create policy "ver perfiles" on public.perfiles for select to authenticated
  using (user_id = auth.uid() or public.es_admin());
drop policy if exists "editar mi nombre" on public.perfiles;
create policy "editar mi nombre" on public.perfiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Cada usuario solo puede cambiar su nombre, nunca hacerse administrador.
revoke update on public.perfiles from authenticated, anon;
grant update (nombre) on public.perfiles to authenticated;

-- ---------- registros ----------
create table if not exists public.registros (
  id          text primary key,
  user_id     uuid not null default auth.uid() references auth.users(id),
  data        jsonb not null,
  creado      timestamptz not null default now(),
  actualizado timestamptz not null default now()
);

create or replace function public.tocar_actualizado() returns trigger
language plpgsql as $$
begin
  new.actualizado = now();
  new.user_id = old.user_id; -- el autor de un registro no cambia
  return new;
end $$;

drop trigger if exists registros_actualizado on public.registros;
create trigger registros_actualizado before update on public.registros
  for each row execute function public.tocar_actualizado();

alter table public.registros enable row level security;
drop policy if exists "ver registros" on public.registros;
create policy "ver registros" on public.registros for select to authenticated
  using (user_id = auth.uid() or public.es_admin());
drop policy if exists "crear registros" on public.registros;
create policy "crear registros" on public.registros for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists "editar registros" on public.registros;
create policy "editar registros" on public.registros for update to authenticated
  using (user_id = auth.uid() or public.es_admin());
-- Solo el administrador puede borrar registros.
drop policy if exists "borrar registros (admin)" on public.registros;
create policy "borrar registros (admin)" on public.registros for delete to authenticated
  using (public.es_admin());

-- ---------- fotos ----------
-- Bucket público con nombres aleatorios: la foto solo se ve teniendo su enlace exacto.
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do nothing;

drop policy if exists "subir mis fotos" on storage.objects;
create policy "subir mis fotos" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "borrar fotos (admin)" on storage.objects;
create policy "borrar fotos (admin)" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and public.es_admin());
