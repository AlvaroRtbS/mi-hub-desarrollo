-- ============================================================================
-- Check-ins semanales: la clienta rellena un breve cuestionario cada semana
-- (adherencia, energía, sueño, peso, comentario) y el coach ve el histórico.
-- Una fila por (clienta, semana) — `semana` = lunes de esa semana.
-- ============================================================================

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  clienta_id uuid not null references public.clientas(id) on delete cascade,
  semana date not null,
  respuestas jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now(),
  unique (clienta_id, semana)
);

alter table public.checkins enable row level security;

drop policy if exists checkins_coach_all on public.checkins;
create policy checkins_coach_all on public.checkins
  for all
  using (coach_id = public.current_coach_id())
  with check (coach_id = public.current_coach_id());

drop policy if exists checkins_clienta_select on public.checkins;
create policy checkins_clienta_select on public.checkins
  for select using (clienta_id = public.current_clienta_id());

drop policy if exists checkins_clienta_insert on public.checkins;
create policy checkins_clienta_insert on public.checkins
  for insert with check (clienta_id = public.current_clienta_id());

drop policy if exists checkins_clienta_update on public.checkins;
create policy checkins_clienta_update on public.checkins
  for update using (clienta_id = public.current_clienta_id())
  with check (clienta_id = public.current_clienta_id());
