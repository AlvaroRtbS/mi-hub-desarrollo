-- Exponer color y logo de marca del coach en los RPCs públicos
-- (invitacion_info y programa_por_token), para que las páginas
-- públicas (/i/[token] y /p/[token]) puedan pintarse con los
-- colores del coach sin necesidad de hacer una segunda query.
--
-- Postgres no permite cambiar el tipo de retorno con CREATE OR REPLACE
-- (las funciones devuelven TABLEs con columnas distintas), por eso
-- hacemos DROP + CREATE.

drop function if exists public.invitacion_info(text);

create function public.invitacion_info(t text)
  returns table (
    clienta_id uuid,
    clienta_nombre text,
    clienta_apellidos text,
    clienta_email text,
    coach_nombre text,
    coach_marca_nombre text,
    coach_marca_color_primario text,
    coach_marca_logo_url text,
    valida boolean,
    motivo text
  )
  language plpgsql security definer set search_path = public, auth
as $$
declare
  inv record;
begin
  select * into inv from public.invitaciones_clienta where token = t;
  if not found then
    return query select null::uuid, null::text, null::text, null::text,
      null::text, null::text, null::text, null::text, false, 'token_no_encontrado';
    return;
  end if;
  if inv.usada_en is not null then
    return query select null::uuid, null::text, null::text, null::text,
      null::text, null::text, null::text, null::text, false, 'ya_usada';
    return;
  end if;
  if inv.expira_en < now() then
    return query select null::uuid, null::text, null::text, null::text,
      null::text, null::text, null::text, null::text, false, 'expirada';
    return;
  end if;

  return query
    select cl.id, cl.nombre, cl.apellidos, cl.email,
           co.nombre, co.marca_nombre,
           co.marca_color_primario, co.marca_logo_url,
           true, null::text
    from public.clientas cl
    join public.coaches co on co.id = cl.coach_id
    where cl.id = inv.clienta_id;
end;
$$;

grant execute on function public.invitacion_info(text) to anon, authenticated;


drop function if exists public.programa_por_token(text);

create function public.programa_por_token(t text)
  returns table (
    asignacion_id uuid,
    fecha_inicio date,
    fecha_fin date,
    estructura jsonb,
    clienta_nombre text,
    clienta_apellidos text,
    programa_nombre text,
    coach_nombre text,
    coach_marca_nombre text,
    coach_marca_color_primario text,
    coach_marca_logo_url text
  )
  language sql
  security definer
  set search_path = public
as $$
  with tk as (
    select * from public.asignacion_share_tokens
    where token = t
      and (expira_en is null or expira_en > now())
  )
  select
    a.id,
    a.fecha_inicio,
    a.fecha_fin,
    a.estructura_snapshot,
    cl.nombre,
    cl.apellidos,
    p.nombre,
    co.nombre,
    co.marca_nombre,
    co.marca_color_primario,
    co.marca_logo_url
  from tk
  join public.asignaciones a on a.id = tk.asignacion_id
  join public.clientas cl on cl.id = a.clienta_id
  join public.programas p on p.id = a.programa_id
  join public.coaches co on co.id = a.coach_id
  limit 1;
$$;

grant execute on function public.programa_por_token(text) to anon, authenticated;
