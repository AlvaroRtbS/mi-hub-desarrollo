-- ============================================================================
-- Objetivos por clienta
-- ----------------------------------------------------------------------------
-- Cada clienta puede tener uno o más objetivos. Un objetivo es una meta
-- concreta con un tipo de métrica, valor objetivo y fecha límite opcional.
-- La coach puede crear/editar/marcar como conseguido.
-- ============================================================================

create table if not exists public.objetivos (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches on delete cascade,
  clienta_id uuid not null references public.clientas on delete cascade,
  titulo text not null,
  descripcion text,
  -- 'peso', 'perimetro_cintura', 'perimetro_cadera', 'porcentaje_grasa',
  -- 'sesiones_completadas', 'racha', 'libre' (sin métrica numérica)
  tipo text not null default 'libre',
  valor_inicial numeric(8,2),
  valor_objetivo numeric(8,2),
  unidad text,
  fecha_inicio date not null default current_date,
  fecha_limite date,
  estado text not null default 'activo' check (estado in ('activo', 'conseguido', 'archivado')),
  conseguido_en timestamptz,
  creado_en timestamptz not null default now()
);

create index if not exists objetivos_clienta on public.objetivos (clienta_id, estado);
create index if not exists objetivos_coach on public.objetivos (coach_id);

alter table public.objetivos enable row level security;

drop policy if exists objetivos_coach_all on public.objetivos;
create policy objetivos_coach_all on public.objetivos
  for all using (coach_id = public.current_coach_id())
  with check (coach_id = public.current_coach_id());
