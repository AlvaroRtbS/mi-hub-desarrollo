-- =============================================================
-- RECETAS — catálogo de recetas del coach visible para clientas
-- =============================================================
-- El maestro sigue siendo Recetario-RTBS local (con su bandeja de
-- validación); esta tabla es la vista publicada en la web. El worker
-- la sincroniza bajo demanda (job sync_recetario).
-- Idempotente: se puede ejecutar varias veces.

create table if not exists public.recetas (
  id              text primary key,          -- 'rec_<slug>' del recetario local
  coach_id        uuid not null references public.coaches(id) on delete cascade,
  nombre          text not null,
  categoria       text,
  descripcion     text,
  foto_url        text,                      -- URL absoluta o path futuro
  racion_g        numeric,
  raciones_receta numeric,
  por_racion      jsonb not null default '{}'::jsonb,  -- {kcal, hc, prot, gra}
  sabor           text,
  momentos        text[] not null default '{}',
  alergenos       text[] not null default '{}',
  icono           text,
  tiempo_min      numeric,
  dificultad      text,
  ingredientes    jsonb not null default '[]'::jsonb,  -- [{cantidad, item}]
  pasos           text[] not null default '{}',
  consejos        text,
  tags            text[] not null default '{}',
  fuente          text,
  publicada       boolean not null default true,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

create index if not exists recetas_coach_idx on public.recetas (coach_id, publicada);

alter table public.recetas enable row level security;

-- El coach gestiona sus recetas.
drop policy if exists "recetas_coach_all" on public.recetas;
create policy "recetas_coach_all" on public.recetas
  for all to authenticated
  using (
    coach_id in (select id from public.coaches where user_id = auth.uid())
  )
  with check (
    coach_id in (select id from public.coaches where user_id = auth.uid())
  );

-- Las clientas ven las recetas publicadas de SU coach.
drop policy if exists "recetas_clienta_select" on public.recetas;
create policy "recetas_clienta_select" on public.recetas
  for select to authenticated
  using (
    publicada
    and coach_id in (select coach_id from public.clientas where user_id = auth.uid())
  );
