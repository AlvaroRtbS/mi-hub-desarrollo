-- ============================================================================
-- Feedback del coach por sesión (#13): un mensaje personal que el coach deja
-- sobre una sesión concreta de la clienta, y que ella ve en su app.
-- (Distinto de sesiones.feedback, que es lo que reporta la clienta.)
-- RLS: el coach actualiza sus sesiones (política sesiones_coach_all) y la
-- clienta lee las suyas (política de clienta) → no hace falta política nueva.
-- ============================================================================

alter table public.sesiones add column if not exists comentario_coach text;
