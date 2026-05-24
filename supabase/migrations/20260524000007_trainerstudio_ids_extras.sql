-- Permitir migración idempotente desde Trainer Studio para entidades que
-- inicialmente no tenían trainerstudio_id (notas, métricas, fotos de progreso).
--
-- Sin esto, re-ejecutar el script de migración duplicaba notas/métricas/fotos
-- en lugar de actualizarlas.

alter table public.notas
  add column if not exists trainerstudio_id text;

create unique index if not exists notas_trainerstudio_unique
  on public.notas (coach_id, trainerstudio_id)
  where trainerstudio_id is not null;

alter table public.metricas
  add column if not exists trainerstudio_id text;

create unique index if not exists metricas_trainerstudio_unique
  on public.metricas (coach_id, trainerstudio_id)
  where trainerstudio_id is not null;

alter table public.fotos_progreso
  add column if not exists trainerstudio_id text;

create unique index if not exists fotos_progreso_trainerstudio_unique
  on public.fotos_progreso (coach_id, trainerstudio_id)
  where trainerstudio_id is not null;
