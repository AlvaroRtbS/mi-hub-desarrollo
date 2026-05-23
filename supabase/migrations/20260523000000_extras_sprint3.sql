-- ============================================================================
-- Extras del Sprint 3:
-- - Toggle de comparador de fotos por clienta
-- - Tabla de programa pertenece-a plantilla (origen)
-- - Tabla simple para tracking de "racha" (no es estrictamente necesaria,
--   se calcula desde sesiones; pero indexamos sesiones por (clienta_id, fecha)
--   para que el cálculo sea instantáneo — ya está indexada).
-- ============================================================================

-- 1. Comparador de fotos: por defecto activo, la entrenadora lo desactiva si
--    la clienta lo prefiere (algunas no quieren verse antes/después).
alter table public.clientas
  add column if not exists comparador_fotos_activo boolean not null default true;

-- 2. Origen del programa (para distinguir los generados por IA, los importados
--    de TS y los partidos de plantilla)
alter table public.programas
  add column if not exists origen text not null default 'manual'
    check (origen in ('manual', 'plantilla', 'ia', 'trainerstudio'));

-- 3. Etiqueta opcional del programa
alter table public.programas
  add column if not exists etiquetas text[] default '{}';
