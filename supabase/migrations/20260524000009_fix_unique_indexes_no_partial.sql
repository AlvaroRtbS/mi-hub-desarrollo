-- El script de migración hace upsert con ON CONFLICT (coach_id, trainerstudio_id).
-- Los índices unique partial (WHERE trainerstudio_id IS NOT NULL) introducidos en
-- 20260524000006 y 20260524000007 NO funcionan como conflict target del cliente
-- Supabase JS, que falla con "no unique or exclusion constraint matching the ON
-- CONFLICT specification".
--
-- Solución: convertirlos en índices unique NO partial. Postgres trata NULL como
-- distinto en índices unique, así que filas sin trainerstudio_id (las creadas
-- manualmente desde la app) siguen pudiendo coexistir sin colisión.

drop index if exists public.ejercicios_trainerstudio_unique;
create unique index ejercicios_trainerstudio_unique
  on public.ejercicios (coach_id, trainerstudio_id);

drop index if exists public.clientas_trainerstudio_unique;
create unique index clientas_trainerstudio_unique
  on public.clientas (coach_id, trainerstudio_id);

drop index if exists public.programas_trainerstudio_unique;
create unique index programas_trainerstudio_unique
  on public.programas (coach_id, trainerstudio_id);

drop index if exists public.notas_trainerstudio_unique;
create unique index notas_trainerstudio_unique
  on public.notas (coach_id, trainerstudio_id);

drop index if exists public.metricas_trainerstudio_unique;
create unique index metricas_trainerstudio_unique
  on public.metricas (coach_id, trainerstudio_id);

drop index if exists public.fotos_progreso_trainerstudio_unique;
create unique index fotos_progreso_trainerstudio_unique
  on public.fotos_progreso (coach_id, trainerstudio_id);
