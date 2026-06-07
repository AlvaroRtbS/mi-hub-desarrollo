-- ============================================================================
-- CRM Fase 1 — Capa comercial sobre `clientas`
-- ----------------------------------------------------------------------------
-- Añade campos de funnel/ventas a la ficha de clienta SIN tocar la lógica
-- operativa existente:
--   * NO se toca `clientas.estado` (invitada/activa/archivada) — gobierna el
--     portal /c. El funnel comercial vive en una columna NUEVA `etapa`.
--   * Todo es aditivo y nullable  ->  cero pérdida de datos, 100% idempotente.
--   * Las columnas comerciales sensibles se añaden al trigger
--     `clientas_proteger_columnas()` para que la clienta NO pueda auto-editarlas
--     llamando a la API directamente (misma defensa que coach_id/estado/email).
-- ============================================================================

-- 1) Columnas nuevas (aditivas, nullable) -----------------------------------
alter table public.clientas
  add column if not exists etapa                 text,    -- funnel comercial
  add column if not exists lead_source           text,    -- reel/anuncio/referido/keyword
  add column if not exists whatsapp_phone        text,    -- E.164, para wa.me
  add column if not exists es_avatar_objetivo    boolean, -- ¿encaja con avatar "Sara"?
  add column if not exists objetivo_principal    text,
  add column if not exists ciudad                text,
  add column if not exists condiciones_medicas   text,
  add column if not exists lesiones_limitaciones text,
  add column if not exists material              text,
  add column if not exists notas_contexto        text,    -- notas internas del coach
  add column if not exists stripe_customer_id    text;

-- 2) Restricción de valores para `etapa` (independiente de `estado`) ---------
-- Nullable a propósito: las clientas YA existentes quedan sin etapa hasta que
-- el coach las clasifique (no las marcamos como 'lead' por error).
do $$ begin
  alter table public.clientas
    add constraint clientas_etapa_check
    check (etapa is null or etapa in ('lead','activa','pausada','baja','recuperable'));
exception when duplicate_object then null; end $$;

-- 3) Índices ----------------------------------------------------------------
create index if not exists clientas_etapa
  on public.clientas (coach_id, etapa);
create index if not exists clientas_stripe_customer
  on public.clientas (stripe_customer_id) where stripe_customer_id is not null;

-- 4) Defensa en profundidad: congelar columnas comerciales frente a la
--    auto-edición de la clienta. Se reemplaza la función existente añadiendo
--    los campos comerciales a la lista que ya protegía coach_id/estado/email.
--    (El trigger trg_clientas_proteger_columnas ya apunta a esta función.)
create or replace function public.clientas_proteger_columnas()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if auth.uid() is not null and auth.uid() = old.user_id then
    new.coach_id           := old.coach_id;
    new.estado             := old.estado;
    new.email              := old.email;
    new.user_id            := old.user_id;
    new.trainerstudio_id   := old.trainerstudio_id;
    -- CRM Fase 1: campos comerciales gobernados SOLO por el coach
    new.etapa              := old.etapa;
    new.lead_source        := old.lead_source;
    new.es_avatar_objetivo := old.es_avatar_objetivo;
    new.stripe_customer_id := old.stripe_customer_id;
    new.notas_contexto     := old.notas_contexto;
  end if;
  return new;
end;
$$;
