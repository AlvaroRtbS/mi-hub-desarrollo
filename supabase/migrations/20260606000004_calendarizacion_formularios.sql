-- ============================================================================
-- Calendarización de formularios + enlace con perfil dietético — FASE 2B
-- ----------------------------------------------------------------------------
-- 1) `disponible_desde`: el coach puede programar CUÁNDO una asignación queda
--    disponible para la clienta. NULL = disponible ya (comportamiento actual).
-- 2) `vuelca_a_dieta`: marca la plantilla cuya respuesta de alergias/intolerancias
--    alimenta el generador de menús (sugerir-menu la lee al cuadrar el plan).
-- ============================================================================

-- 1. Programación de la asignación
alter table public.formulario_asignaciones
  add column if not exists disponible_desde date;

-- 2. Plantilla que alimenta el perfil dietético
alter table public.formularios
  add column if not exists vuelca_a_dieta boolean not null default false;

update public.formularios
  set vuelca_a_dieta = true
  where titulo = 'Valoración inicial ALIMENTACIÓN';
