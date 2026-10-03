-- Permite al administrador borrar registros y sus fotos desde la app.
-- Se ejecuta una vez en Supabase → SQL Editor (después de schema.sql).

drop policy if exists "borrar registros (admin)" on public.registros;
create policy "borrar registros (admin)" on public.registros for delete to authenticated
  using (public.es_admin());

drop policy if exists "borrar fotos (admin)" on storage.objects;
create policy "borrar fotos (admin)" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and public.es_admin());
