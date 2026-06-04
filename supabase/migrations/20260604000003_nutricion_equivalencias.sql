-- ============================================================================
-- Nutrición estructurada por equivalencias (método europeo, 1 ración = 10 g macro)
-- ----------------------------------------------------------------------------
-- Dos tablas nuevas, ADITIVAS (no tocan nutricion_planes ni listas_compra):
--
--   alimentos_equivalencias       -> tabla maestra de alimentos por ración del
--                                    coach (HC / P / G / V). La clienta la lee
--                                    para intercambiar alimentos dentro de un grupo.
--   nutricion_planes_estructurados-> plan por tomas: calorías, macros, raciones
--                                    totales y reparto por toma (JSONB).
-- ============================================================================

-- 1. Tabla de alimentos por ración ------------------------------------------
create table if not exists public.alimentos_equivalencias (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  categoria text not null,            -- 'HC' | 'P' | 'G' | 'V'
  subgrupo text,                      -- p.ej. 'Cereales', 'Fruta', 'Carnes magras'
  alimento text not null,
  cantidad text not null,             -- texto mostrable: "50 g (1 rebanada)"
  cantidad_g numeric,                 -- gramos por ración (para cálculos futuros)
  notas text,
  -- Aportes secundarios de otros macros por ración, p.ej. {"p":0.6} (futuro).
  extra_macros jsonb not null default '{}'::jsonb,
  orden int not null default 0,
  creado_en timestamptz not null default now()
);

create index if not exists alimentos_equiv_coach_cat_idx
  on public.alimentos_equivalencias (coach_id, categoria, orden);

alter table public.alimentos_equivalencias enable row level security;

drop policy if exists alimentos_equiv_coach_all on public.alimentos_equivalencias;
create policy alimentos_equiv_coach_all on public.alimentos_equivalencias
  for all
  using (coach_id = public.current_coach_id())
  with check (coach_id = public.current_coach_id());

-- La clienta lee la tabla de SU coach (para los intercambios).
drop policy if exists alimentos_equiv_clienta_select on public.alimentos_equivalencias;
create policy alimentos_equiv_clienta_select on public.alimentos_equivalencias
  for select using (
    coach_id = (
      select coach_id from public.clientas where id = public.current_clienta_id()
    )
  );

-- 2. Plan estructurado por tomas --------------------------------------------
create table if not exists public.nutricion_planes_estructurados (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  clienta_id uuid references public.clientas(id) on delete cascade,  -- null = plantilla
  nombre text not null,
  calorias int,
  proteina_g numeric,
  grasa_g numeric,
  hc_g numeric,
  raciones_hc numeric,
  raciones_p numeric,
  raciones_g numeric,
  -- Reparto por toma: [{ id, nombre, hora, hc, p, g, v }]
  tomas jsonb not null default '[]'::jsonb,
  notas text,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists nutricion_estruct_coach_idx
  on public.nutricion_planes_estructurados (coach_id, clienta_id);

alter table public.nutricion_planes_estructurados enable row level security;

drop policy if exists nutricion_estruct_coach_all on public.nutricion_planes_estructurados;
create policy nutricion_estruct_coach_all on public.nutricion_planes_estructurados
  for all
  using (coach_id = public.current_coach_id())
  with check (coach_id = public.current_coach_id());

drop policy if exists nutricion_estruct_clienta_select on public.nutricion_planes_estructurados;
create policy nutricion_estruct_clienta_select on public.nutricion_planes_estructurados
  for select using (clienta_id = public.current_clienta_id());
