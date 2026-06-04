-- ============================================================================
-- Feedback post-sesión: la clienta valora cómo se ha sentido al terminar el
-- entreno del día (esfuerzo percibido y energía, 1-5). El comentario libre
-- sigue guardándose en sesiones.notas_clienta (que ya existe y se muestra en
-- la timeline de actividad del coach).
-- ============================================================================

alter table public.sesiones add column if not exists feedback jsonb;
