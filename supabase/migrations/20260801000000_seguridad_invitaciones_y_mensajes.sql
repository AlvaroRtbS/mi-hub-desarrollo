-- ============================================================================
-- Endurecimiento de seguridad previo al alta de clientas reales (2026-08-01)
-- ----------------------------------------------------------------------------
-- Tres agujeros detectados en la auditoría, todos explotables el día que se
-- envíen las invitaciones por WhatsApp:
--
--  1. canjear_invitacion() no comprobaba que quien canjea el token sea la
--     persona invitada: bastaba reenviar el enlace para que un tercero se
--     registrase con SU email y se quedara la cuenta (y el historial médico)
--     de la clienta.
--  2. La clienta podía editar por API los mensajes que le escribió el coach,
--     o marcar los suyos como remitente 'coach' y fabricar instrucciones.
--  3. Las invitaciones vivían 30 días. Un enlace que es la credencial no
--     debería sobrevivir tanto tiempo en un chat de WhatsApp.
-- ============================================================================

-- ─── 1. La invitación solo la canjea su destinataria ────────────────────────
create or replace function public.canjear_invitacion(t text)
  returns table (ok boolean, motivo text)
  language plpgsql security definer set search_path = public, auth
as $$
declare
  inv record;
  uid uuid;
  cl record;
  email_sesion text;
begin
  uid := auth.uid();
  if uid is null then
    return query select false, 'no_autenticada';
    return;
  end if;

  select * into inv from public.invitaciones_clienta where token = t;
  if not found then return query select false, 'token_no_encontrado'; return; end if;
  if inv.usada_en is not null then return query select false, 'ya_usada'; return; end if;
  if inv.expira_en < now() then return query select false, 'expirada'; return; end if;

  select * into cl from public.clientas where id = inv.clienta_id;
  if not found then return query select false, 'clienta_no_encontrada'; return; end if;

  -- El email de la sesión debe coincidir con el de la ficha. Es lo que ata el
  -- enlace a una persona concreta: reenviarlo ya no sirve de nada.
  email_sesion := lower(coalesce(auth.jwt() ->> 'email', ''));
  if cl.email is null or email_sesion = '' or lower(cl.email) <> email_sesion then
    return query select false, 'email_no_coincide';
    return;
  end if;

  if cl.user_id is not null and cl.user_id <> uid then
    return query select false, 'ya_enlazada_a_otra_cuenta';
    return;
  end if;

  update public.clientas
    set user_id = uid,
        estado = case when estado = 'invitada' then 'activa' else estado end
    where id = inv.clienta_id;

  update public.invitaciones_clienta
    set usada_en = now()
    where token = t;

  return query select true, null::text;
end;
$$;

grant execute on function public.canjear_invitacion(text) to authenticated;

-- ─── 2. La clienta no reescribe los mensajes del coach ──────────────────────
-- Mismo patrón que clientas_proteger_columnas(): en vez de prohibir el UPDATE
-- (que rompería el marcado de leído), se restauran los campos que ella no
-- puede tocar.
create or replace function public.mensajes_proteger_columnas()
  returns trigger
  language plpgsql security definer set search_path = public
as $$
declare
  es_la_clienta boolean;
begin
  select exists (
    select 1 from public.clientas c
     where c.id = new.clienta_id and c.user_id = auth.uid()
  ) into es_la_clienta;

  if es_la_clienta then
    -- Contenido, autoría y fecha son inmutables para ella; solo puede marcar
    -- como leído lo que le llegó.
    new.contenido := old.contenido;
    new.remitente := old.remitente;
    new.creado_en := old.creado_en;
    new.clienta_id := old.clienta_id;
    new.coach_id := old.coach_id;
  end if;

  return new;
end;
$$;

drop trigger if exists mensajes_proteger_columnas_trg on public.mensajes;
create trigger mensajes_proteger_columnas_trg
  before update on public.mensajes
  for each row execute function public.mensajes_proteger_columnas();

-- ─── 3. Invitaciones de vida corta ──────────────────────────────────────────
-- 30 días era demasiado para un enlace que da acceso a datos de salud.
alter table public.invitaciones_clienta
  alter column expira_en set default (now() + interval '72 hours');

-- Las que sigan vivas y sin usar de la tanda anterior se recortan a 72 h desde
-- ahora (ninguna se ha enviado todavía; si alguna caduca, se regenera).
update public.invitaciones_clienta
   set expira_en = now() + interval '72 hours'
 where usada_en is null
   and expira_en > now() + interval '72 hours';
