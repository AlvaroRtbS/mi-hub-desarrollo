-- ============================================================================
-- Storage RLS para clientas
-- ----------------------------------------------------------------------------
-- Las políticas actuales en storage.objects validan que el path empiece por
-- el coach_id del usuario. Eso impide que una clienta logueada suba sus
-- propias fotos. Aquí añadimos políticas adicionales que permiten:
--   - SELECT: la clienta lee fotos cuyo primer segmento del path sea su
--     propio clienta_id
--   - INSERT: la clienta sube fotos al bucket 'fotos-progreso' siempre que
--     el path empiece por su clienta_id
--   - UPDATE/DELETE: la clienta gestiona solo sus fotos
-- ============================================================================

drop policy if exists fotos_progreso_clienta_select on storage.objects;
create policy fotos_progreso_clienta_select on storage.objects
  for select using (
    bucket_id = 'fotos-progreso'
    and public.storage_path_coach_id(name) = public.current_clienta_id()
  );

drop policy if exists fotos_progreso_clienta_insert on storage.objects;
create policy fotos_progreso_clienta_insert on storage.objects
  for insert with check (
    bucket_id = 'fotos-progreso'
    and public.storage_path_coach_id(name) = public.current_clienta_id()
  );

drop policy if exists fotos_progreso_clienta_update on storage.objects;
create policy fotos_progreso_clienta_update on storage.objects
  for update using (
    bucket_id = 'fotos-progreso'
    and public.storage_path_coach_id(name) = public.current_clienta_id()
  );

drop policy if exists fotos_progreso_clienta_delete on storage.objects;
create policy fotos_progreso_clienta_delete on storage.objects
  for delete using (
    bucket_id = 'fotos-progreso'
    and public.storage_path_coach_id(name) = public.current_clienta_id()
  );
