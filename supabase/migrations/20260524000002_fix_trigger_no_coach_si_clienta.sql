-- Arreglo crítico: el trigger `on_auth_user_created` creaba un registro en
-- `public.coaches` para cualquier signup, incluso cuando el usuario se
-- registraba como CLIENTA vía /i/<token>. Eso le daba privilegios de
-- entrenadora (podía ver el panel completo, crear programas, ver otras
-- clientas, etc.).
--
-- El flujo de aceptar invitación ya envía `raw_user_meta_data.tipo = 'clienta'`
-- (ver web/src/app/i/[token]/aceptar.tsx). Con este cambio el trigger lo
-- respeta: si el signup viene como clienta, NO se crea coach.
--
-- Importante: esta migración SOLO corrige el trigger. NO limpia registros
-- de coach incorrectos que ya existan en BD. La limpieza se hace aparte,
-- caso por caso, para no borrar datos sin supervisión.

create or replace function public.crear_coach_al_registrarse() returns trigger
  language plpgsql security definer set search_path = public, auth
as $$
begin
  -- Si el signup viene del flujo de aceptar invitación de clienta,
  -- no crear registro en coaches. La clienta se enlaza después con
  -- public.canjear_invitacion().
  if new.raw_user_meta_data->>'tipo' = 'clienta' then
    return new;
  end if;

  insert into public.coaches (user_id, email, nombre)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1))
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;
