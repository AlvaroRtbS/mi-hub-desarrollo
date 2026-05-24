-- Bug: el trigger global touch_updated_at() asume que las tablas tienen
-- columna `actualizado_en`, pero `sesiones` la creó como `actualizada_en`
-- (feminine, por error). Cualquier UPDATE de sesiones falla con
-- "record new has no field actualizado_en".
--
-- Esto rompe el upsert del script de migración para sesiones (compliance),
-- y también cualquier actualización de sesión desde la app (marcar
-- completada, anotar registros).
--
-- Fix: reemplazar el trigger para sesiones por uno específico que use
-- el nombre correcto de la columna.

drop trigger if exists trg_sesiones_touch on public.sesiones;

create or replace function public.touch_sesiones_actualizada_en()
  returns trigger language plpgsql as $$
begin
  new.actualizada_en := now();
  return new;
end;
$$;

create trigger trg_sesiones_touch
  before update on public.sesiones
  for each row execute function public.touch_sesiones_actualizada_en();
