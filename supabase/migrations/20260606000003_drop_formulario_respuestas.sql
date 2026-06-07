-- ============================================================================
-- Eliminar la tabla del formulario inicial hardcodeado — FASE 2A (post-deploy)
-- ----------------------------------------------------------------------------
-- Una vez desplegado el código que ya NO referencia formulario_respuestas
-- (onboarding migrado a formulario_asignaciones), eliminamos la tabla.
-- Acordado con Álvaro: las clientas actuales están archivadas; al pasar a PRO
-- se re-migrarán sus datos desde TrainerStudio. No se conserva histórico aquí.
--
-- APLICAR DESPUÉS de desplegar el código de la fase 2A.
-- ============================================================================

drop table if exists public.formulario_respuestas;
