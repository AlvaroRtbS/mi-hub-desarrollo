-- Constraints UNIQUE para que el script de migración desde Trainer Studio
-- pueda hacer UPSERTs idempotentes:
--   - Re-ejecutar el script no duplica filas.
--   - Si un coach migra dos veces, las filas se actualizan en lugar de insertarse de nuevo.
--
-- Los trainerstudio_id no son globalmente únicos entre coaches distintos
-- (en una hipotética instalación multi-tenant), por eso el UNIQUE es compuesto
-- (coach_id, trainerstudio_id). Se filtra con WHERE trainerstudio_id IS NOT NULL
-- para no impedir que coexistan varias filas creadas a mano (sin id de TS).
--
-- También una UNIQUE en sesiones(clienta_id, fecha): solo puede haber una
-- sesión por día y clienta. Era una assumption implícita de la app que ahora
-- explicitamos para que el script pueda upsertear sin duplicar histórico.

create unique index if not exists ejercicios_trainerstudio_unique
  on public.ejercicios (coach_id, trainerstudio_id)
  where trainerstudio_id is not null;

create unique index if not exists clientas_trainerstudio_unique
  on public.clientas (coach_id, trainerstudio_id)
  where trainerstudio_id is not null;

create unique index if not exists programas_trainerstudio_unique
  on public.programas (coach_id, trainerstudio_id)
  where trainerstudio_id is not null;

create unique index if not exists sesiones_clienta_fecha_unique
  on public.sesiones (clienta_id, fecha);
