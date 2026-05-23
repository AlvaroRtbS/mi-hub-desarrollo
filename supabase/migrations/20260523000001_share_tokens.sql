-- ============================================================================
-- Tokens de compartición para asignaciones de programas
-- ----------------------------------------------------------------------------
-- Permite generar un link único (sin login) que la clienta puede abrir desde
-- WhatsApp/email para ver su programa. La coach puede revocar el token en
-- cualquier momento.
-- ============================================================================

create table if not exists public.asignacion_share_tokens (
  token text primary key default encode(gen_random_bytes(16), 'hex'),
  asignacion_id uuid not null references public.asignaciones on delete cascade,
  coach_id uuid not null references public.coaches on delete cascade,
  creado_en timestamptz not null default now(),
  expira_en timestamptz,
  ultima_visita timestamptz,
  visitas int not null default 0
);

create index if not exists asignacion_share_tokens_asignacion
  on public.asignacion_share_tokens (asignacion_id);

create index if not exists asignacion_share_tokens_coach
  on public.asignacion_share_tokens (coach_id);

-- RLS: cada coach gestiona solo sus tokens
alter table public.asignacion_share_tokens enable row level security;

drop policy if exists tokens_coach_all on public.asignacion_share_tokens;
create policy tokens_coach_all on public.asignacion_share_tokens
  for all using (coach_id = public.current_coach_id())
  with check (coach_id = public.current_coach_id());

-- Función pública: resolver token → datos necesarios para mostrar el programa.
-- No requiere autenticación (es la única forma de que la clienta vea su plan
-- sin instalar nada). Devuelve también clienta_id, programa_id por si
-- queremos personalizar la página.
create or replace function public.programa_por_token(t text)
  returns table (
    asignacion_id uuid,
    fecha_inicio date,
    fecha_fin date,
    estructura jsonb,
    clienta_nombre text,
    clienta_apellidos text,
    programa_nombre text,
    coach_nombre text,
    coach_marca_nombre text
  )
  language sql
  security definer
  set search_path = public
as $$
  with tk as (
    select * from public.asignacion_share_tokens
    where token = t
      and (expira_en is null or expira_en > now())
  )
  select
    a.id,
    a.fecha_inicio,
    a.fecha_fin,
    a.estructura_snapshot,
    cl.nombre,
    cl.apellidos,
    p.nombre,
    co.nombre,
    co.marca_nombre
  from tk
  join public.asignaciones a on a.id = tk.asignacion_id
  join public.clientas cl on cl.id = a.clienta_id
  join public.programas p on p.id = a.programa_id
  join public.coaches co on co.id = a.coach_id
  limit 1;
$$;

grant execute on function public.programa_por_token(text) to anon, authenticated;

-- Función para registrar la visita (incrementa contador + ultima_visita).
create or replace function public.registrar_visita_token(t text)
  returns void
  language sql
  security definer
  set search_path = public
as $$
  update public.asignacion_share_tokens
  set visitas = visitas + 1,
      ultima_visita = now()
  where token = t
    and (expira_en is null or expira_en > now());
$$;

grant execute on function public.registrar_visita_token(text) to anon, authenticated;
