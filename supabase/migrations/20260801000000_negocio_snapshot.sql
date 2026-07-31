-- =============================================================
-- NEGOCIO_SNAPSHOT — agregado de pagos/Stripe/KPIs para el panel
-- =============================================================
-- Singleton como cockpit_snapshot: el worker (job sync_negocio) lo
-- upserta desde cerebro.db + kpi.json. Solo lo ve Álvaro (is_owner).
-- Idempotente.

create table if not exists public.negocio_snapshot (
  id          text primary key default 'current',
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

insert into public.negocio_snapshot (id, data) values ('current', '{}'::jsonb)
  on conflict (id) do nothing;

alter table public.negocio_snapshot enable row level security;

drop policy if exists "owner_all" on public.negocio_snapshot;
create policy "owner_all" on public.negocio_snapshot
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());
