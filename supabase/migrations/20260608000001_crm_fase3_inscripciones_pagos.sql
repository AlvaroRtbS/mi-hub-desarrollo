-- ============================================================================
-- CRM Fase 3 — Inscripciones + pagos (registro manual)
-- ----------------------------------------------------------------------------
-- Capa comercial de facturación sobre `clientas`. Single-product: el coach
-- tiene un único programa 1-a-1 (397 € único / 480 € fraccionado 3×160), así
-- que NO hay catálogo de planes: el concepto/importe va en la propia inscripción.
--   * RLS por coach (mismo patrón que consentimientos/clientas).
--   * Campos stripe_* preparados para la Fase 4 (webhook) sin migración futura.
--   * Aditivo e idempotente.
-- ============================================================================

-- INSCRIPCIONES — un ciclo de contratación de una clienta -------------------
create table if not exists public.inscripciones (
  id                     uuid primary key default gen_random_uuid(),
  coach_id               uuid not null references public.coaches(id)  on delete cascade,
  clienta_id             uuid not null references public.clientas(id) on delete cascade,
  concepto               text not null default 'Programa 1-a-1',
  fecha_inicio           date not null,
  fecha_fin              date,
  importe_total          numeric(10,2),
  tipo_pago              text not null default 'unico'
                           check (tipo_pago in ('unico','fraccionado')),
  cuotas_total           int  not null default 1 check (cuotas_total >= 1),
  renovacion_fecha       date,                       -- clave para anticipar bajas
  estado                 text not null default 'activa'
                           check (estado in ('activa','finalizada','cancelada')),
  stripe_subscription_id text,                       -- Fase 4
  notas                  text,
  creada_en              timestamptz not null default now(),
  actualizada_en         timestamptz not null default now()
);
create index if not exists inscripciones_clienta
  on public.inscripciones (coach_id, clienta_id);
create index if not exists inscripciones_renovacion
  on public.inscripciones (coach_id, renovacion_fecha) where estado = 'activa';

-- PAGOS — cobros individuales (manual; multi-origen) ------------------------
create table if not exists public.pagos (
  id                       uuid primary key default gen_random_uuid(),
  coach_id                 uuid not null references public.coaches(id)       on delete cascade,
  clienta_id               uuid not null references public.clientas(id)      on delete cascade,
  inscripcion_id           uuid references public.inscripciones(id)          on delete set null,
  importe                  numeric(10,2) not null,
  moneda                   text not null default 'EUR',
  concepto                 text,
  fecha_vencimiento        date,
  pagado_en                timestamptz,
  estado                   text not null default 'pendiente'
                             check (estado in ('pendiente','pagado','fallido','reembolsado')),
  origen                   text
                             check (origen in ('stripe','sepa','bizum','transferencia','efectivo','otro')),
  numero_cuota             int,                       -- cuota X de N
  stripe_payment_intent_id text,                      -- Fase 4
  notas                    text,
  creada_en                timestamptz not null default now(),
  actualizada_en           timestamptz not null default now()
);
create index if not exists pagos_clienta     on public.pagos (coach_id, clienta_id);
create index if not exists pagos_estado      on public.pagos (coach_id, estado);
create index if not exists pagos_vencimiento on public.pagos (coach_id, fecha_vencimiento)
  where estado = 'pendiente';

-- RLS -----------------------------------------------------------------------
alter table public.inscripciones enable row level security;
drop policy if exists inscripciones_coach_all on public.inscripciones;
create policy inscripciones_coach_all on public.inscripciones
  for all
  using (coach_id = public.current_coach_id())
  with check (coach_id = public.current_coach_id());

alter table public.pagos enable row level security;
drop policy if exists pagos_coach_all on public.pagos;
create policy pagos_coach_all on public.pagos
  for all
  using (coach_id = public.current_coach_id())
  with check (coach_id = public.current_coach_id());
