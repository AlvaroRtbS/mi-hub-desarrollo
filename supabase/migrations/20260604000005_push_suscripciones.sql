-- ============================================================================
-- Suscripciones de notificaciones push (Web Push / PWA)
-- ----------------------------------------------------------------------------
-- Guarda la suscripción del navegador de cada clienta para enviarle push
-- (nuevo mensaje del entrenador, etc.). Una fila por endpoint del navegador.
-- ============================================================================

create table if not exists public.push_suscripciones (
  id uuid primary key default gen_random_uuid(),
  clienta_id uuid not null references public.clientas(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  creado_en timestamptz not null default now()
);

create index if not exists push_suscripciones_clienta_idx
  on public.push_suscripciones (clienta_id);

alter table public.push_suscripciones enable row level security;

-- La clienta gestiona SUS suscripciones (activar/desactivar desde su móvil).
drop policy if exists push_clienta_all on public.push_suscripciones;
create policy push_clienta_all on public.push_suscripciones
  for all
  using (clienta_id = public.current_clienta_id())
  with check (clienta_id = public.current_clienta_id());

-- El coach puede leer/limpiar las suscripciones de SUS clientas (para enviar
-- push y borrar las que caduquen).
drop policy if exists push_coach_all on public.push_suscripciones;
create policy push_coach_all on public.push_suscripciones
  for all
  using (
    clienta_id in (select id from public.clientas where coach_id = public.current_coach_id())
  )
  with check (
    clienta_id in (select id from public.clientas where coach_id = public.current_coach_id())
  );
