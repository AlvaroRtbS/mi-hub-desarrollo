-- ============================================================================
-- RPC de ingesta de pasos por token (para el webhook /api/pasos/ingest).
-- SECURITY DEFINER + granted a anon: el atajo del iPhone puede subir los pasos
-- sin sesión, identificándose solo con el token de la clienta. Mismo patrón
-- que invitacion_info / programa_por_token (token = secreto).
-- Así el webhook NO necesita la service_role key en el entorno de Vercel.
-- ============================================================================

create or replace function public.ingerir_pasos(t text, p int, f date default null)
  returns table (ok boolean, error text)
  language plpgsql security definer set search_path = public
as $$
declare
  cl record;
  fecha_final date;
begin
  if t is null or t = '' then
    return query select false, 'sin_token';
    return;
  end if;
  if p is null or p < 0 then
    return query select false, 'pasos_invalidos';
    return;
  end if;

  select id, coach_id into cl from public.clientas where pasos_ingest_token = t;
  if not found then
    return query select false, 'token_no_valido';
    return;
  end if;

  fecha_final := coalesce(f, (now() at time zone 'utc')::date);

  insert into public.pasos_diarios (coach_id, clienta_id, fecha, pasos, fuente)
    values (cl.coach_id, cl.id, fecha_final, p, 'apple_health')
    on conflict (clienta_id, fecha)
    do update set pasos = excluded.pasos, fuente = excluded.fuente;

  return query select true, null::text;
end;
$$;

grant execute on function public.ingerir_pasos(text, int, date) to anon, authenticated;
