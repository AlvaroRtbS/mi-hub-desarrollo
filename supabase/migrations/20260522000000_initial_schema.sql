-- ============================================================================
-- Esquema inicial — multi-tenant desde el día 1.
-- Cada entrenadora (coach) es un "tenant" y solo ve sus propios datos.
-- La aislación se garantiza por Row Level Security (RLS) de Supabase.
-- ============================================================================

-- Extensiones necesarias
create extension if not exists "pgcrypto";

-- ============================================================================
-- ENTRENADORAS (tenants)
-- ============================================================================
-- Cada coach está enlazada 1:1 a un usuario de auth.users (sistema de login de Supabase).
create table public.coaches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users on delete cascade,
  nombre text not null,
  email text not null,
  telefono text,
  foto_url text,
  bio text,
  -- Configuración personalizable de la marca (para cuando vendamos a otras entrenadoras)
  marca_nombre text,
  marca_color_primario text,
  marca_logo_url text,
  -- Plan de suscripción (cuando montemos cobros)
  plan text not null default 'free' check (plan in ('free', 'starter', 'pro', 'unlimited')),
  creada_en timestamptz not null default now()
);

-- Función helper: devuelve el coach_id del usuario actual.
-- Se usa en todas las políticas RLS para no repetir el subquery.
create or replace function public.current_coach_id() returns uuid
  language sql stable security definer set search_path = public, auth
as $$
  select id from public.coaches where user_id = auth.uid() limit 1;
$$;

-- ============================================================================
-- CLIENTAS
-- ============================================================================
create table public.clientas (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches on delete cascade,
  -- Si la clienta llega a tener login en la app móvil, se enlaza aquí.
  user_id uuid unique references auth.users on delete set null,
  nombre text not null,
  apellidos text,
  email text not null,
  telefono text,
  fecha_nacimiento date,
  foto_url text,
  estado text not null default 'invitada' check (estado in ('invitada', 'activa', 'archivada')),
  -- ID original en TrainerStudio para no duplicar al migrar
  trainerstudio_id text,
  notas_publicas text,
  invitada_en timestamptz,
  creada_en timestamptz not null default now()
);

create unique index clientas_email_por_coach on public.clientas (coach_id, lower(email));
create index clientas_estado on public.clientas (coach_id, estado);
create index clientas_trainerstudio_id on public.clientas (trainerstudio_id) where trainerstudio_id is not null;

-- ============================================================================
-- GRUPOS DE CLIENTAS
-- ============================================================================
create table public.grupos (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches on delete cascade,
  nombre text not null,
  color text,
  creado_en timestamptz not null default now()
);

create table public.clienta_grupos (
  clienta_id uuid not null references public.clientas on delete cascade,
  grupo_id uuid not null references public.grupos on delete cascade,
  primary key (clienta_id, grupo_id)
);

-- ============================================================================
-- BIBLIOTECA DE EJERCICIOS
-- ============================================================================
create table public.ejercicios (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches on delete cascade,
  nombre text not null,
  descripcion text,
  instrucciones text,
  video_url text,
  imagen_url text,
  grupos_musculares text[] default '{}',
  material text[] default '{}',
  -- 'creado_por_ti' o 'biblioteca_publica' (futuro)
  origen text not null default 'creado_por_ti',
  trainerstudio_id text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index ejercicios_coach on public.ejercicios (coach_id);
create index ejercicios_busqueda on public.ejercicios using gin (to_tsvector('spanish', nombre));
create index ejercicios_musculos on public.ejercicios using gin (grupos_musculares);

-- ============================================================================
-- PROGRAMAS (plantillas reutilizables)
-- ============================================================================
-- La estructura semana → día → bloque → elemento se guarda como JSONB
-- porque es jerárquica y se edita con drag & drop. Esto la hace flexible.
-- Forma del JSONB en `estructura`:
-- [
--   { "semana": 1, "dias": [
--     { "dia": 1, "titulo": "Lunes", "bloques": [
--       { "id": "uuid", "titulo": "Calentamiento", "indicaciones": "...", "elementos": [
--         { "id": "uuid", "tipo": "ejercicio", "ejercicio_id": "uuid", "series": [{ "reps": 10, "peso": 0 }, ...] },
--         { "id": "uuid", "tipo": "formulario", "formulario_id": "uuid" },
--         { "id": "uuid", "tipo": "contenido", "titulo": "Bienvenida", "markdown": "..." },
--         { "id": "uuid", "tipo": "metrica_prompt", "metrica_tipo": "peso" },
--         { "id": "uuid", "tipo": "foto_progreso_prompt" },
--         { "id": "uuid", "tipo": "pasos_prompt" },
--         { "id": "uuid", "tipo": "recordatorio", "hora": "20:00", "mensaje": "..." }
--       ] }
--     ] }
--   ] }
-- ]
create table public.programas (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches on delete cascade,
  nombre text not null,
  descripcion text,
  num_semanas int not null default 1 check (num_semanas > 0),
  estructura jsonb not null default '[]'::jsonb,
  imagen_portada_url text,
  trainerstudio_id text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index programas_coach on public.programas (coach_id);

-- ============================================================================
-- ASIGNACIONES (un programa asignado a una clienta en una fecha)
-- ============================================================================
create table public.asignaciones (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches on delete cascade,
  clienta_id uuid not null references public.clientas on delete cascade,
  programa_id uuid not null references public.programas on delete cascade,
  fecha_inicio date not null,
  fecha_fin date,
  activa boolean not null default true,
  -- Snapshot de la estructura del programa en el momento de la asignación,
  -- así si la entrenadora edita la plantilla, las clientas en curso no se ven afectadas.
  estructura_snapshot jsonb not null,
  creada_en timestamptz not null default now()
);

create index asignaciones_clienta on public.asignaciones (coach_id, clienta_id, activa);

-- ============================================================================
-- SESIONES (entreno real que la clienta hace)
-- ============================================================================
create table public.sesiones (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches on delete cascade,
  clienta_id uuid not null references public.clientas on delete cascade,
  asignacion_id uuid references public.asignaciones on delete set null,
  fecha date not null,
  semana int,
  dia int,
  completada boolean not null default false,
  porcentaje_completado int not null default 0 check (porcentaje_completado between 0 and 100),
  notas_clienta text,
  -- Registros por elemento: { elemento_id: { series_realizadas: [...], peso, reps, completado, ... } }
  registros jsonb not null default '{}'::jsonb,
  creada_en timestamptz not null default now(),
  actualizada_en timestamptz not null default now()
);

create index sesiones_clienta_fecha on public.sesiones (coach_id, clienta_id, fecha desc);

-- ============================================================================
-- MÉTRICAS CORPORALES (peso, perímetros, custom)
-- ============================================================================
create table public.metricas (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches on delete cascade,
  clienta_id uuid not null references public.clientas on delete cascade,
  -- Tipos comunes: 'peso', 'perimetro_cintura', 'perimetro_brazo', 'perimetro_cadera', 'porcentaje_grasa', 'masa_muscular'
  -- Pero es libre — la entrenadora puede crear métricas personalizadas.
  tipo text not null,
  valor numeric(8,2) not null,
  unidad text not null default 'kg',
  fecha date not null,
  notas text,
  creada_en timestamptz not null default now()
);

create index metricas_clienta on public.metricas (coach_id, clienta_id, tipo, fecha desc);

-- ============================================================================
-- PASOS DIARIOS (Apple Health / Google Fit / manual)
-- ============================================================================
-- Esto es la "mejora estrella" — la entrenadora hoy lo recibe por captura de pantalla,
-- la app móvil lo va a sincronizar automáticamente.
create table public.pasos_diarios (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches on delete cascade,
  clienta_id uuid not null references public.clientas on delete cascade,
  fecha date not null,
  pasos int not null check (pasos >= 0),
  distancia_metros int,
  calorias int,
  fuente text not null default 'manual' check (fuente in ('manual', 'apple_health', 'google_fit', 'screenshot')),
  creado_en timestamptz not null default now()
);

create unique index pasos_uno_por_dia on public.pasos_diarios (clienta_id, fecha);
create index pasos_coach_fecha on public.pasos_diarios (coach_id, fecha desc);

-- ============================================================================
-- FOTOS DE PROGRESO
-- ============================================================================
create table public.fotos_progreso (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches on delete cascade,
  clienta_id uuid not null references public.clientas on delete cascade,
  url text not null,
  tipo text check (tipo in ('frontal', 'lateral', 'trasera', 'otra')),
  fecha date not null,
  notas text,
  subida_en timestamptz not null default now()
);

create index fotos_clienta on public.fotos_progreso (coach_id, clienta_id, fecha desc);

-- ============================================================================
-- NUTRICIÓN
-- ============================================================================
create table public.nutricion_planes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches on delete cascade,
  -- Si es null, es un plan "plantilla" de la entrenadora; si tiene clienta_id, está asignado a esa clienta.
  clienta_id uuid references public.clientas on delete cascade,
  nombre text not null,
  descripcion text,
  pdf_url text,
  contenido_markdown text,
  creado_en timestamptz not null default now()
);

create index nutricion_clienta on public.nutricion_planes (coach_id, clienta_id);

-- Listas de la compra con checks (mejora respecto a TrainerStudio)
create table public.listas_compra (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches on delete cascade,
  clienta_id uuid not null references public.clientas on delete cascade,
  nombre text not null,
  -- items: [{ id, nombre, cantidad, categoria, comprado: bool }]
  items jsonb not null default '[]'::jsonb,
  creada_en timestamptz not null default now(),
  actualizada_en timestamptz not null default now()
);

-- ============================================================================
-- NOTAS INTERNAS (de la entrenadora sobre una clienta)
-- ============================================================================
create table public.notas (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches on delete cascade,
  clienta_id uuid not null references public.clientas on delete cascade,
  contenido text not null,
  creada_en timestamptz not null default now()
);

create index notas_clienta on public.notas (coach_id, clienta_id, creada_en desc);

-- ============================================================================
-- MENSAJES (chat entrenadora ↔ clienta)
-- ============================================================================
create table public.mensajes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches on delete cascade,
  clienta_id uuid not null references public.clientas on delete cascade,
  remitente text not null check (remitente in ('coach', 'clienta')),
  contenido text not null,
  adjuntos jsonb default '[]'::jsonb,
  leido boolean not null default false,
  enviado_en timestamptz not null default now()
);

create index mensajes_conversacion on public.mensajes (coach_id, clienta_id, enviado_en desc);

-- ============================================================================
-- FORMULARIOS (cuestionarios reutilizables: valoración inicial, follow-up, etc.)
-- ============================================================================
create table public.formularios (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches on delete cascade,
  nombre text not null,
  descripcion text,
  -- preguntas: [{ id, tipo: 'texto'|'numero'|'opcion_unica'|'opcion_multiple'|'escala', texto, opciones?, requerido }]
  preguntas jsonb not null default '[]'::jsonb,
  creado_en timestamptz not null default now()
);

create table public.formulario_respuestas (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches on delete cascade,
  clienta_id uuid not null references public.clientas on delete cascade,
  formulario_id uuid not null references public.formularios on delete cascade,
  respuestas jsonb not null default '{}'::jsonb,
  enviada_en timestamptz not null default now()
);

create index formulario_respuestas_clienta on public.formulario_respuestas (coach_id, clienta_id, enviada_en desc);

-- ============================================================================
-- ROW LEVEL SECURITY (aislación entre entrenadoras)
-- ============================================================================
alter table public.coaches enable row level security;
alter table public.clientas enable row level security;
alter table public.grupos enable row level security;
alter table public.clienta_grupos enable row level security;
alter table public.ejercicios enable row level security;
alter table public.programas enable row level security;
alter table public.asignaciones enable row level security;
alter table public.sesiones enable row level security;
alter table public.metricas enable row level security;
alter table public.pasos_diarios enable row level security;
alter table public.fotos_progreso enable row level security;
alter table public.nutricion_planes enable row level security;
alter table public.listas_compra enable row level security;
alter table public.notas enable row level security;
alter table public.mensajes enable row level security;
alter table public.formularios enable row level security;
alter table public.formulario_respuestas enable row level security;

-- Coaches: cada coach solo ve/edita su propia fila
create policy coaches_select_self on public.coaches for select using (user_id = auth.uid());
create policy coaches_update_self on public.coaches for update using (user_id = auth.uid());
create policy coaches_insert_self on public.coaches for insert with check (user_id = auth.uid());

-- Tablas con coach_id: la coach solo ve sus datos.
-- (Cuando la clienta tenga login propio en la app, añadiremos políticas adicionales
-- para que ella vea solo lo suyo. Lo dejamos preparado pero comentado.)
do $$
declare
  t text;
  coach_scoped_tables text[] := array[
    'clientas','grupos','ejercicios','programas','asignaciones','sesiones',
    'metricas','pasos_diarios','fotos_progreso','nutricion_planes',
    'listas_compra','notas','mensajes','formularios','formulario_respuestas'
  ];
begin
  foreach t in array coach_scoped_tables loop
    execute format(
      'create policy %I_coach_all on public.%I for all using (coach_id = public.current_coach_id()) with check (coach_id = public.current_coach_id())',
      t, t
    );
  end loop;
end $$;

-- clienta_grupos no tiene coach_id directo; se valida vía el grupo
create policy clienta_grupos_coach_all on public.clienta_grupos
  for all
  using (exists (select 1 from public.grupos g where g.id = grupo_id and g.coach_id = public.current_coach_id()))
  with check (exists (select 1 from public.grupos g where g.id = grupo_id and g.coach_id = public.current_coach_id()));

-- ============================================================================
-- TRIGGER: actualizar `actualizado_en` automáticamente
-- ============================================================================
create or replace function public.touch_updated_at() returns trigger
  language plpgsql as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

create trigger trg_ejercicios_touch before update on public.ejercicios for each row execute function public.touch_updated_at();
create trigger trg_programas_touch before update on public.programas for each row execute function public.touch_updated_at();
create trigger trg_sesiones_touch before update on public.sesiones for each row execute function public.touch_updated_at();
create trigger trg_listas_compra_touch before update on public.listas_compra for each row execute function public.touch_updated_at();

-- ============================================================================
-- AUTO-CREAR FILA DE COACH AL REGISTRAR UN USUARIO NUEVO
-- ============================================================================
-- Cuando alguien se registra (auth.users), creamos su fila en public.coaches.
-- El nombre se saca de raw_user_meta_data.nombre si existe, si no del email.
create or replace function public.crear_coach_al_registrarse() returns trigger
  language plpgsql security definer set search_path = public, auth
as $$
begin
  insert into public.coaches (user_id, email, nombre)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1))
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.crear_coach_al_registrarse();
