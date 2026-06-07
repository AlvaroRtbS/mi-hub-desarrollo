-- ============================================================================
-- Formulario de onboarding genérico (jubilar el inicial hardcodeado) — FASE 2A
-- ----------------------------------------------------------------------------
-- En vez del "Formulario inicial" fijo en código (lib/formulario-inicial.ts +
-- tabla formulario_respuestas), usamos una PLANTILLA genérica marcada como
-- onboarding. Se auto-asigna a cada clienta nueva (y backfill a las actuales),
-- de modo que aparece sola en /c/formularios y /c/hoy sin caso especial.
--
-- Aplicar ANTES de desplegar el código nuevo (es aditivo, no rompe el actual).
-- El DROP de formulario_respuestas va en la migración siguiente (post-deploy).
-- ============================================================================

-- 1. Flag de onboarding en las plantillas
alter table public.formularios
  add column if not exists es_onboarding boolean not null default false;

-- Solo UNA plantilla de onboarding por coach
create unique index if not exists formularios_onboarding_unico
  on public.formularios (coach_id) where es_onboarding;

-- 2. Marcar la "Valoración inicial" importada como onboarding
update public.formularios
  set es_onboarding = true
  where titulo = 'Valoración inicial (¡Quiero conocerte mejor!)';

-- 3. Backfill: asignar el onboarding a todas las clientas NO archivadas del coach
insert into public.formulario_asignaciones (formulario_id, coach_id, clienta_id)
select f.id, f.coach_id, c.id
from public.formularios f
join public.clientas c
  on c.coach_id = f.coach_id and c.estado <> 'archivada'
where f.es_onboarding
on conflict (formulario_id, clienta_id) do nothing;
