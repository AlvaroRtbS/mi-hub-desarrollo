-- ============================================================================
-- Agenda del coach — lista de tareas global (no por-clienta)
-- ----------------------------------------------------------------------------
-- mi-hub ya tiene "todos" por clienta; esto es la agenda PERSONAL del coach
-- (lo que hay que hacer hoy, no atado a una clienta concreta, aunque puede
-- enlazarse a una opcionalmente). RLS por coach. Aditivo e idempotente.
-- ============================================================================
create table if not exists public.tareas_coach (
  id            uuid primary key default gen_random_uuid(),
  coach_id      uuid not null references public.coaches(id)  on delete cascade,
  texto         text not null,
  hecha         boolean not null default false,
  vence         date,
  clienta_id    uuid references public.clientas(id) on delete set null,
  creada_en     timestamptz not null default now(),
  completada_en timestamptz
);
create index if not exists tareas_coach_coach
  on public.tareas_coach (coach_id, hecha, vence);

alter table public.tareas_coach enable row level security;
drop policy if exists tareas_coach_coach_all on public.tareas_coach;
create policy tareas_coach_coach_all on public.tareas_coach
  for all
  using (coach_id = public.current_coach_id())
  with check (coach_id = public.current_coach_id());
