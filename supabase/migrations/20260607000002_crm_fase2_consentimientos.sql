-- ============================================================================
-- CRM Fase 2 — Consentimientos / contrato de prestación de servicios (RGPD)
-- ----------------------------------------------------------------------------
-- Una fila por (clienta, tipo). El contrato "Peso a Paso" se firma vía Google
-- Form; un Apps Script avisa al endpoint /api/consentimientos/firma, que casa la
-- respuesta con la clienta por email y marca el estado.
--   * RLS por coach (mismo patrón que checkins/clientas).
--   * La clienta solo puede LEER sus propios consentimientos.
--   * El endpoint escribe con service_role (salta RLS), protegido por secreto.
-- Aditivo e idempotente.
-- ============================================================================

create table if not exists public.consentimientos (
  id             uuid primary key default gen_random_uuid(),
  coach_id       uuid not null references public.coaches(id)  on delete cascade,
  clienta_id     uuid not null references public.clientas(id) on delete cascade,
  -- contrato de servicios / datos de salud / cesión de imagen (fotos)
  tipo           text not null check (tipo in ('contrato_servicios','datos_salud','imagen_fotos')),
  estado         text not null default 'pendiente'
                   check (estado in ('pendiente','firmado','rechazado')),
  token          text unique,                 -- opcional, para casar por token (futuro)
  version        text,                        -- versión del documento firmado
  metodo         text,                        -- 'google_form' | 'manual'
  evidencia      jsonb not null default '{}'::jsonb,  -- snapshot de la respuesta
  enviado_en     timestamptz,
  firmado_en     timestamptz,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (clienta_id, tipo)
);

create index if not exists consentimientos_clienta
  on public.consentimientos (coach_id, clienta_id);
create index if not exists consentimientos_estado
  on public.consentimientos (coach_id, tipo, estado);

-- RLS -----------------------------------------------------------------------
alter table public.consentimientos enable row level security;

drop policy if exists consentimientos_coach_all on public.consentimientos;
create policy consentimientos_coach_all on public.consentimientos
  for all
  using (coach_id = public.current_coach_id())
  with check (coach_id = public.current_coach_id());

drop policy if exists consentimientos_clienta_select on public.consentimientos;
create policy consentimientos_clienta_select on public.consentimientos
  for select using (clienta_id = public.current_clienta_id());
