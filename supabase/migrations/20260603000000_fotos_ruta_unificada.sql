-- ============================================================================
-- Fotos de progreso: convención de ruta UNIFICADA  coach_id/clienta_id/archivo
-- ----------------------------------------------------------------------------
-- Antes: la entrenadora subía a `coach_id/...` y la clienta a `clienta_id/...`,
-- con policies disjuntas → la coach NO veía las fotos que subía la clienta y
-- viceversa (rompía el seguimiento de progreso).
--
-- Ahora ambas suben a `coach_id/clienta_id/archivo`:
--   - La COACH ya tiene acceso a todo su subárbol por la policy existente
--     (1er segmento = su coach_id) → ve también `coach_id/clienta_id/...`.
--   - La CLIENTA necesita acceso por el 2º segmento (= su clienta_id), que es
--     lo que añade esta migración.
--
-- Las policies antiguas de clienta (1er segmento = clienta_id) NO se borran,
-- para no dejar inaccesibles fotos subidas con la convención anterior.
-- ============================================================================

-- Helper: UUID del 2º segmento del path  (ej. 'coach/clienta/file' → 'clienta')
create or replace function public.storage_path_seg2_uuid(name text) returns uuid
  language sql immutable as $$
  select case
    when split_part(name, '/', 2) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(name, '/', 2)::uuid
    else null
  end;
$$;

drop policy if exists fotos_progreso_clienta_v2_select on storage.objects;
create policy fotos_progreso_clienta_v2_select on storage.objects
  for select using (
    bucket_id = 'fotos-progreso'
    and public.storage_path_seg2_uuid(name) = public.current_clienta_id()
  );

drop policy if exists fotos_progreso_clienta_v2_insert on storage.objects;
create policy fotos_progreso_clienta_v2_insert on storage.objects
  for insert with check (
    bucket_id = 'fotos-progreso'
    and public.storage_path_seg2_uuid(name) = public.current_clienta_id()
  );

drop policy if exists fotos_progreso_clienta_v2_update on storage.objects;
create policy fotos_progreso_clienta_v2_update on storage.objects
  for update using (
    bucket_id = 'fotos-progreso'
    and public.storage_path_seg2_uuid(name) = public.current_clienta_id()
  );

drop policy if exists fotos_progreso_clienta_v2_delete on storage.objects;
create policy fotos_progreso_clienta_v2_delete on storage.objects
  for delete using (
    bucket_id = 'fotos-progreso'
    and public.storage_path_seg2_uuid(name) = public.current_clienta_id()
  );
