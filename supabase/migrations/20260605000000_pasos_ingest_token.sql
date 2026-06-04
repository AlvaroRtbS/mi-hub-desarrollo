-- ============================================================================
-- Token de ingesta de pasos por clienta (webhook para Apple Shortcuts).
-- Permite que un atajo del iPhone suba los pasos del día a /api/pasos/ingest
-- sin sesión, identificándose con un token secreto por clienta.
-- ============================================================================

alter table public.clientas
  add column if not exists pasos_ingest_token text;

-- Backfill para clientas existentes.
update public.clientas
  set pasos_ingest_token =
    replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
  where pasos_ingest_token is null;

-- Default para clientas nuevas.
alter table public.clientas
  alter column pasos_ingest_token set default
    replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

create unique index if not exists clientas_pasos_ingest_token_key
  on public.clientas (pasos_ingest_token);

-- La clienta ya puede leer su propia fila (política clientas_clienta_select),
-- así que puede ver su token para configurar el atajo. El webhook escribe en
-- pasos_diarios con service_role (salta RLS); el registro manual usa las
-- políticas pasos_clienta_* ya existentes.
