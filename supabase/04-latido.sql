-- Latido diario para que Supabase no pause el proyecto por inactividad.
-- Una tabla de una sola fila que el aviso automático de GitHub actualiza cada día.
-- Ejecutar una vez en Supabase → SQL Editor.

create table if not exists public.latido (
  id     int primary key default 1 check (id = 1),
  ultimo timestamptz not null default now(),
  veces  bigint not null default 0
);
alter table public.latido enable row level security;
revoke all on public.latido from anon, authenticated;

-- Solo esta función puede tocar la tabla; no expone ningún dato de la app.
create or replace function public.latido()
returns timestamptz
language sql
security definer
set search_path = public
as $$
  insert into public.latido (id, ultimo, veces) values (1, now(), 1)
  on conflict (id) do update set ultimo = now(), veces = public.latido.veces + 1
  returning ultimo;
$$;
revoke all on function public.latido() from public;
grant execute on function public.latido() to anon, authenticated;
