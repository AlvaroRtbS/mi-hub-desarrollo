-- Apartado "Proyecto" por clienta: fichas estructuradas + to-dos del coach.
--
-- 1) `fichas_clienta`: bloques de texto largos por categoría (anamnesis, lesiones,
--    preferencias alimentarias, historial deportivo, disponibilidad horaria).
--    Un único registro por (clienta, tipo). Si el coach no ha rellenado uno,
--    no existe la fila — la UI muestra el bloque vacío con CTA "rellenar".
--
-- 2) `todos_clienta`: lista de tareas que el coach se apunta sobre una clienta
--    ("Llamar el lunes", "Cambiar volumen en 4 semanas", "Pedir fotos de control").
--    Solo visibles para el coach, no para la clienta.

-- ============================================================================
-- fichas_clienta
-- ============================================================================
create type public.ficha_tipo as enum (
  'anamnesis',
  'lesiones',
  'preferencias_alimentarias',
  'historial_deportivo',
  'disponibilidad'
);

create table if not exists public.fichas_clienta (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches on delete cascade,
  clienta_id uuid not null references public.clientas on delete cascade,
  tipo public.ficha_tipo not null,
  contenido text not null default '',
  creada_en timestamptz not null default now(),
  actualizada_en timestamptz not null default now(),
  unique (clienta_id, tipo)
);

create index if not exists fichas_clienta_coach
  on public.fichas_clienta (coach_id, clienta_id);

alter table public.fichas_clienta enable row level security;

create policy fichas_clienta_select on public.fichas_clienta
  for select using (coach_id = public.current_coach_id());
create policy fichas_clienta_insert on public.fichas_clienta
  for insert with check (coach_id = public.current_coach_id());
create policy fichas_clienta_update on public.fichas_clienta
  for update using (coach_id = public.current_coach_id());
create policy fichas_clienta_delete on public.fichas_clienta
  for delete using (coach_id = public.current_coach_id());

-- Trigger para actualizar `actualizada_en` automáticamente en UPDATE
create or replace function public.tg_fichas_clienta_touch() returns trigger
  language plpgsql as $$
begin
  new.actualizada_en = now();
  return new;
end;
$$;

create trigger fichas_clienta_touch
  before update on public.fichas_clienta
  for each row execute function public.tg_fichas_clienta_touch();

-- ============================================================================
-- todos_clienta
-- ============================================================================
create table if not exists public.todos_clienta (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches on delete cascade,
  clienta_id uuid not null references public.clientas on delete cascade,
  titulo text not null,
  completado boolean not null default false,
  fecha_limite date,
  creado_en timestamptz not null default now(),
  completado_en timestamptz
);

create index if not exists todos_clienta_coach
  on public.todos_clienta (coach_id, clienta_id, completado, creado_en desc);

alter table public.todos_clienta enable row level security;

create policy todos_clienta_select on public.todos_clienta
  for select using (coach_id = public.current_coach_id());
create policy todos_clienta_insert on public.todos_clienta
  for insert with check (coach_id = public.current_coach_id());
create policy todos_clienta_update on public.todos_clienta
  for update using (coach_id = public.current_coach_id());
create policy todos_clienta_delete on public.todos_clienta
  for delete using (coach_id = public.current_coach_id());
