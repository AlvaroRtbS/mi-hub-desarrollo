-- ============================================================================
-- Reconciliar la tabla `formularios` con el código de la app
-- ----------------------------------------------------------------------------
-- DERIVA DE ESQUEMA: producción se creó con la columna `nombre` y sin
-- `actualizado_en`, pero TODO el código (panel/formularios) y la migración
-- 20260604000002_formularios_genericos.sql usan `titulo` + `actualizado_en`.
-- Eso deja la pantalla /formularios rota en prod (select de columnas inexistentes).
-- Esta migración alinea el esquema con el código de forma idempotente.
-- ============================================================================

-- 1. nombre -> titulo (solo si aún está como `nombre` y no existe `titulo`)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'formularios'
      and column_name = 'nombre'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'formularios'
      and column_name = 'titulo'
  ) then
    alter table public.formularios rename column nombre to titulo;
  end if;
end $$;

-- 2. Añadir actualizado_en si falta
alter table public.formularios
  add column if not exists actualizado_en timestamptz not null default now();
