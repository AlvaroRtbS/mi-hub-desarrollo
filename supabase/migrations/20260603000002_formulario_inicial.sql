-- ============================================================================
-- Formulario inicial rellenable por la clienta
-- ----------------------------------------------------------------------------
-- Guarda las respuestas del cuestionario de onboarding que rellena la CLIENTA
-- dentro de la app. Las preguntas viven en el código (lib/formulario-inicial.ts);
-- aquí solo guardamos las respuestas (JSONB keyed por id de pregunta).
-- Una fila por (clienta, tipo). De momento solo tipo = 'inicial'.
-- ============================================================================

create table if not exists public.formulario_respuestas (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  clienta_id uuid not null references public.clientas(id) on delete cascade,
  tipo text not null default 'inicial',
  respuestas jsonb not null default '{}'::jsonb,
  completado boolean not null default false,
  completado_en timestamptz,
  actualizado_en timestamptz not null default now(),
  unique (clienta_id, tipo)
);

alter table public.formulario_respuestas enable row level security;

-- La entrenadora ve/gestiona las respuestas de SUS clientas.
drop policy if exists formulario_coach_all on public.formulario_respuestas;
create policy formulario_coach_all on public.formulario_respuestas
  for all
  using (coach_id = public.current_coach_id())
  with check (coach_id = public.current_coach_id());

-- La clienta lee y rellena SU propio formulario.
drop policy if exists formulario_clienta_select on public.formulario_respuestas;
create policy formulario_clienta_select on public.formulario_respuestas
  for select using (clienta_id = public.current_clienta_id());

drop policy if exists formulario_clienta_insert on public.formulario_respuestas;
create policy formulario_clienta_insert on public.formulario_respuestas
  for insert with check (clienta_id = public.current_clienta_id());

drop policy if exists formulario_clienta_update on public.formulario_respuestas;
create policy formulario_clienta_update on public.formulario_respuestas
  for update using (clienta_id = public.current_clienta_id())
  with check (clienta_id = public.current_clienta_id());
