-- ============================================================================
-- CRM — endurecer la protección de columnas comerciales
-- ----------------------------------------------------------------------------
-- La Fase 1 ya congelaba etapa/lead_source/es_avatar_objetivo/stripe_customer_id/
-- notas_contexto frente a la auto-edición de la clienta. Pero whatsapp_phone,
-- objetivo_principal, ciudad, condiciones_medicas, lesiones_limitaciones y
-- material quedaban editables vía API directa con el login de la clienta.
-- Como esos campos los gobierna SOLO el coach desde el panel (la clienta nunca
-- los edita en su portal), los congelamos también. Defensa en profundidad sobre
-- la RLS. Idempotente (create or replace).
-- ============================================================================
create or replace function public.clientas_proteger_columnas()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if auth.uid() is not null and auth.uid() = old.user_id then
    -- Identidad / operativa (ya protegidos antes)
    new.coach_id              := old.coach_id;
    new.estado                := old.estado;
    new.email                 := old.email;
    new.user_id               := old.user_id;
    new.trainerstudio_id      := old.trainerstudio_id;
    -- Comerciales (gobernados solo por el coach)
    new.etapa                 := old.etapa;
    new.lead_source           := old.lead_source;
    new.es_avatar_objetivo    := old.es_avatar_objetivo;
    new.stripe_customer_id    := old.stripe_customer_id;
    new.notas_contexto        := old.notas_contexto;
    new.whatsapp_phone        := old.whatsapp_phone;
    new.objetivo_principal    := old.objetivo_principal;
    new.ciudad                := old.ciudad;
    new.condiciones_medicas   := old.condiciones_medicas;
    new.lesiones_limitaciones := old.lesiones_limitaciones;
    new.material              := old.material;
  end if;
  return new;
end;
$$;
