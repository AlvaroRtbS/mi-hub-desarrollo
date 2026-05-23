-- ============================================================================
-- Gamificación: logros (badges) + toggle por clienta
-- ============================================================================

-- Toggle: cada coach puede desactivar la gamificación por clienta si no encaja
-- (igual que el comparador de fotos)
alter table public.clientas
  add column if not exists gamificacion_activa boolean not null default true;

-- Tabla de logros desbloqueados
create table if not exists public.logros (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches on delete cascade,
  clienta_id uuid not null references public.clientas on delete cascade,
  tipo text not null,
  -- Datos extra opcionales (valor del progreso, contexto)
  metadata jsonb not null default '{}'::jsonb,
  conseguido_en timestamptz not null default now()
);

-- Un mismo logro solo se desbloquea una vez por clienta (idempotente)
create unique index if not exists logros_unicos
  on public.logros (clienta_id, tipo);

create index if not exists logros_coach
  on public.logros (coach_id, conseguido_en desc);

-- RLS: cada coach ve solo los logros de sus clientas
alter table public.logros enable row level security;

drop policy if exists logros_coach_all on public.logros;
create policy logros_coach_all on public.logros
  for all using (coach_id = public.current_coach_id())
  with check (coach_id = public.current_coach_id());

-- Función pública: leer logros + XP por token compartido (para la página /p/[token])
-- Devuelve los logros conseguidos por la clienta asociada a la asignación.
create or replace function public.logros_por_token(t text)
  returns table (
    tipo text,
    metadata jsonb,
    conseguido_en timestamptz
  )
  language sql
  security definer
  set search_path = public
as $$
  with tk as (
    select asignacion_id from public.asignacion_share_tokens
    where token = t
      and (expira_en is null or expira_en > now())
  ),
  asign as (
    select clienta_id from public.asignaciones
    where id = (select asignacion_id from tk)
  )
  select l.tipo, l.metadata, l.conseguido_en
  from public.logros l
  where l.clienta_id = (select clienta_id from asign)
  order by l.conseguido_en desc;
$$;

grant execute on function public.logros_por_token(text) to anon, authenticated;
