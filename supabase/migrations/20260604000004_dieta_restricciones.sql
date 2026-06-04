-- ============================================================================
-- Perfil dietético de la clienta (restricciones)
-- ----------------------------------------------------------------------------
-- Guarda las restricciones alimentarias de la clienta para que el generador de
-- menús las respete siempre: checks típicos (vegetariana, sin lactosa…) + una
-- nota libre para lo atípico. Estructura JSONB: { flags: string[], notas: string }
-- Se rellena una vez y vale para todos sus planes.
-- ============================================================================

alter table public.clientas
  add column if not exists dieta_restricciones jsonb not null default '{}'::jsonb;
