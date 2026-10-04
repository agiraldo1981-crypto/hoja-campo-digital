-- Instalaciones y técnicos comunes para todos (los edita el administrador desde la app).
-- Se ejecuta una vez en Supabase → SQL Editor → New query → pegar todo → Run.
create table if not exists public.ajustes (
  clave       text primary key,
  valor       jsonb not null,
  actualizado timestamptz not null default now()
);

alter table public.ajustes enable row level security;
drop policy if exists "ver ajustes" on public.ajustes;
create policy "ver ajustes" on public.ajustes for select to authenticated using (true);
drop policy if exists "crear ajustes (admin)" on public.ajustes;
create policy "crear ajustes (admin)" on public.ajustes for insert to authenticated with check (public.es_admin());
drop policy if exists "editar ajustes (admin)" on public.ajustes;
create policy "editar ajustes (admin)" on public.ajustes for update to authenticated using (public.es_admin()) with check (public.es_admin());
drop policy if exists "borrar ajustes (admin)" on public.ajustes;
create policy "borrar ajustes (admin)" on public.ajustes for delete to authenticated using (public.es_admin());
