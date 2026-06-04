-- ============================================================================
-- Constructor de formularios genéricos
-- ----------------------------------------------------------------------------
-- El COACH crea plantillas de formulario (con preguntas a medida) y las ASIGNA
-- a las clientas que quiera. Cada clienta rellena su asignación. A diferencia
-- del "Formulario inicial" (preguntas fijas en código), aquí las preguntas
-- viven en BD dentro de `formularios.preguntas` (JSONB).
--
--   formularios            -> plantilla (1 fila por formulario del coach)
--   formulario_asignaciones-> 1 fila por (formulario, clienta) + sus respuestas
--
-- No toca `formulario_respuestas` (formulario inicial) ni `checkins`.
-- IMPORTANTE: creamos AMBAS tablas antes de las políticas, porque la política
-- `formularios_clienta_select` referencia `formulario_asignaciones`.
-- ============================================================================

-- 1. Tablas ------------------------------------------------------------------
create table if not exists public.formularios (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  titulo text not null,
  descripcion text,
  -- Array de preguntas: [{ id, label, tipo, placeholder?, sufijo?, requerida?,
  --   opciones?: string[], etiquetaMin?, etiquetaMax? }]
  preguntas jsonb not null default '[]'::jsonb,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table if not exists public.formulario_asignaciones (
  id uuid primary key default gen_random_uuid(),
  formulario_id uuid not null references public.formularios(id) on delete cascade,
  coach_id uuid not null references public.coaches(id) on delete cascade,
  clienta_id uuid not null references public.clientas(id) on delete cascade,
  respuestas jsonb not null default '{}'::jsonb,
  completado boolean not null default false,
  completado_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (formulario_id, clienta_id)
);

-- 2. Índices -----------------------------------------------------------------
create index if not exists formularios_coach_idx
  on public.formularios (coach_id);
create index if not exists formulario_asignaciones_clienta_idx
  on public.formulario_asignaciones (clienta_id);
create index if not exists formulario_asignaciones_formulario_idx
  on public.formulario_asignaciones (formulario_id);

-- 3. RLS ---------------------------------------------------------------------
alter table public.formularios enable row level security;
alter table public.formulario_asignaciones enable row level security;

-- La entrenadora gestiona SUS plantillas.
drop policy if exists formularios_coach_all on public.formularios;
create policy formularios_coach_all on public.formularios
  for all
  using (coach_id = public.current_coach_id())
  with check (coach_id = public.current_coach_id());

-- La clienta puede LEER una plantilla solo si se la han asignado (para poder
-- renderizar las preguntas al rellenarla).
drop policy if exists formularios_clienta_select on public.formularios;
create policy formularios_clienta_select on public.formularios
  for select using (
    exists (
      select 1 from public.formulario_asignaciones a
      where a.formulario_id = formularios.id
        and a.clienta_id = public.current_clienta_id()
    )
  );

-- La entrenadora ve/gestiona las asignaciones de SUS clientas.
drop policy if exists formulario_asig_coach_all on public.formulario_asignaciones;
create policy formulario_asig_coach_all on public.formulario_asignaciones
  for all
  using (coach_id = public.current_coach_id())
  with check (coach_id = public.current_coach_id());

-- La clienta lee SUS asignaciones y actualiza SUS respuestas (no inserta:
-- la asignación la crea el coach).
drop policy if exists formulario_asig_clienta_select on public.formulario_asignaciones;
create policy formulario_asig_clienta_select on public.formulario_asignaciones
  for select using (clienta_id = public.current_clienta_id());

drop policy if exists formulario_asig_clienta_update on public.formulario_asignaciones;
create policy formulario_asig_clienta_update on public.formulario_asignaciones
  for update using (clienta_id = public.current_clienta_id())
  with check (clienta_id = public.current_clienta_id());
