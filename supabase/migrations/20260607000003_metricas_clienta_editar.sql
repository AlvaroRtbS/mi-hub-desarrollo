-- ============================================================================
-- La clienta puede EDITAR y BORRAR sus propias métricas (antes solo crear/leer).
-- Para corregir un valor mal tecleado sin tener que pedírselo al coach.
-- RLS scoped por current_clienta_id() (igual que pasos_diarios).
-- ============================================================================

drop policy if exists metricas_clienta_update on public.metricas;
create policy metricas_clienta_update on public.metricas
  for update using (clienta_id = public.current_clienta_id())
  with check (clienta_id = public.current_clienta_id());

drop policy if exists metricas_clienta_delete on public.metricas;
create policy metricas_clienta_delete on public.metricas
  for delete using (clienta_id = public.current_clienta_id());
