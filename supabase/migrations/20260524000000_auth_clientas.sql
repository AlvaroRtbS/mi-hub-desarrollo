-- ============================================================================
-- Sprint 3: Auth para clientas
-- ----------------------------------------------------------------------------
-- - Función current_clienta_id() para usar en políticas RLS de tablas
--   accedidas por la clienta logueada.
-- - Políticas RLS adicionales: cada clienta lee/escribe solo lo suyo.
-- - Tabla 'invitaciones_clienta' con tokens únicos para que la coach genere
--   un link, lo mande a la clienta y ésta cree su contraseña.
-- - Función canjear_invitacion() para enlazar auth.users con clientas.
-- ============================================================================

-- 1. Helper: devuelve el clienta_id del usuario auth actual (si lo hay).
create or replace function public.current_clienta_id() returns uuid
  language sql stable security definer set search_path = public, auth
as $$
  select id from public.clientas where user_id = auth.uid() limit 1;
$$;

grant execute on function public.current_clienta_id() to authenticated;

-- 2. Políticas RLS adicionales: la CLIENTA logueada también puede ver/escribir
-- sus propios datos. La coach ya tiene RLS por coach_id (no se toca).
-- Nota: usamos políticas separadas (no AS RESTRICTIVE) para que coexistan.

-- Clientas: cada clienta puede leer su propia fila
drop policy if exists clientas_self_select on public.clientas;
create policy clientas_self_select on public.clientas
  for select using (user_id = auth.uid());

-- Clientas: puede actualizar su propio nombre/teléfono/foto pero NO email,
-- estado, coach_id ni trainerstudio_id (eso queda para la coach).
drop policy if exists clientas_self_update on public.clientas;
create policy clientas_self_update on public.clientas
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Asignaciones: la clienta ve sus asignaciones
drop policy if exists asignaciones_clienta_select on public.asignaciones;
create policy asignaciones_clienta_select on public.asignaciones
  for select using (clienta_id = public.current_clienta_id());

-- Sesiones: la clienta ve sus sesiones y puede crearlas/actualizarlas
drop policy if exists sesiones_clienta_select on public.sesiones;
create policy sesiones_clienta_select on public.sesiones
  for select using (clienta_id = public.current_clienta_id());

drop policy if exists sesiones_clienta_insert on public.sesiones;
create policy sesiones_clienta_insert on public.sesiones
  for insert with check (clienta_id = public.current_clienta_id());

drop policy if exists sesiones_clienta_update on public.sesiones;
create policy sesiones_clienta_update on public.sesiones
  for update using (clienta_id = public.current_clienta_id())
  with check (clienta_id = public.current_clienta_id());

-- Métricas: la clienta puede leer y crear las suyas (no editar/borrar
-- históricas, eso lo controla el cliente UI)
drop policy if exists metricas_clienta_select on public.metricas;
create policy metricas_clienta_select on public.metricas
  for select using (clienta_id = public.current_clienta_id());

drop policy if exists metricas_clienta_insert on public.metricas;
create policy metricas_clienta_insert on public.metricas
  for insert with check (clienta_id = public.current_clienta_id());

-- Pasos diarios: la clienta los crea (la app móvil los envía automáticamente)
drop policy if exists pasos_clienta_select on public.pasos_diarios;
create policy pasos_clienta_select on public.pasos_diarios
  for select using (clienta_id = public.current_clienta_id());

drop policy if exists pasos_clienta_insert on public.pasos_diarios;
create policy pasos_clienta_insert on public.pasos_diarios
  for insert with check (clienta_id = public.current_clienta_id());

drop policy if exists pasos_clienta_update on public.pasos_diarios;
create policy pasos_clienta_update on public.pasos_diarios
  for update using (clienta_id = public.current_clienta_id())
  with check (clienta_id = public.current_clienta_id());

-- Fotos progreso: la clienta sube/lee las suyas
drop policy if exists fotos_clienta_select on public.fotos_progreso;
create policy fotos_clienta_select on public.fotos_progreso
  for select using (clienta_id = public.current_clienta_id());

drop policy if exists fotos_clienta_insert on public.fotos_progreso;
create policy fotos_clienta_insert on public.fotos_progreso
  for insert with check (clienta_id = public.current_clienta_id());

drop policy if exists fotos_clienta_delete on public.fotos_progreso;
create policy fotos_clienta_delete on public.fotos_progreso
  for delete using (clienta_id = public.current_clienta_id());

-- Mensajes: la clienta ve y crea (como remitente='clienta') sus mensajes
drop policy if exists mensajes_clienta_select on public.mensajes;
create policy mensajes_clienta_select on public.mensajes
  for select using (clienta_id = public.current_clienta_id());

drop policy if exists mensajes_clienta_insert on public.mensajes;
create policy mensajes_clienta_insert on public.mensajes
  for insert with check (
    clienta_id = public.current_clienta_id() and remitente = 'clienta'
  );

-- Marcar mensajes recibidos como leídos
drop policy if exists mensajes_clienta_update_leido on public.mensajes;
create policy mensajes_clienta_update_leido on public.mensajes
  for update using (clienta_id = public.current_clienta_id())
  with check (clienta_id = public.current_clienta_id());

-- Listas de la compra: la clienta lee y actualiza (para marcar productos)
drop policy if exists listas_clienta_select on public.listas_compra;
create policy listas_clienta_select on public.listas_compra
  for select using (clienta_id = public.current_clienta_id());

drop policy if exists listas_clienta_update on public.listas_compra;
create policy listas_clienta_update on public.listas_compra
  for update using (clienta_id = public.current_clienta_id())
  with check (clienta_id = public.current_clienta_id());

-- Planes nutrición asignados a la clienta
drop policy if exists nutricion_clienta_select on public.nutricion_planes;
create policy nutricion_clienta_select on public.nutricion_planes
  for select using (clienta_id = public.current_clienta_id());

-- Formularios: la clienta lee los que existen del coach y crea respuestas
drop policy if exists formularios_clienta_select on public.formularios;
create policy formularios_clienta_select on public.formularios
  for select using (
    coach_id in (select coach_id from public.clientas where user_id = auth.uid())
  );

drop policy if exists respuestas_clienta_all on public.formulario_respuestas;
create policy respuestas_clienta_all on public.formulario_respuestas
  for all using (clienta_id = public.current_clienta_id())
  with check (clienta_id = public.current_clienta_id());

-- Logros: solo lectura para la clienta (la coach/cron los crean)
drop policy if exists logros_clienta_select on public.logros;
create policy logros_clienta_select on public.logros
  for select using (clienta_id = public.current_clienta_id());

-- Objetivos: la clienta ve los suyos (solo lectura)
drop policy if exists objetivos_clienta_select on public.objetivos;
create policy objetivos_clienta_select on public.objetivos
  for select using (clienta_id = public.current_clienta_id());

-- Ejercicios: la clienta lee los de su coach (para que se muestren en programa)
drop policy if exists ejercicios_clienta_select on public.ejercicios;
create policy ejercicios_clienta_select on public.ejercicios
  for select using (
    coach_id in (select coach_id from public.clientas where user_id = auth.uid())
  );

-- Programas: la clienta lee los que tiene asignados
drop policy if exists programas_clienta_select on public.programas;
create policy programas_clienta_select on public.programas
  for select using (
    id in (
      select programa_id from public.asignaciones
      where clienta_id = public.current_clienta_id()
    )
  );

-- Coach: la clienta puede leer datos básicos de SU coach (nombre, marca)
drop policy if exists coaches_clienta_select on public.coaches;
create policy coaches_clienta_select on public.coaches
  for select using (
    id in (select coach_id from public.clientas where user_id = auth.uid())
  );

-- ============================================================================
-- 3. Tabla de invitaciones
-- ============================================================================
create table if not exists public.invitaciones_clienta (
  token text primary key default encode(gen_random_bytes(16), 'hex'),
  clienta_id uuid not null references public.clientas on delete cascade,
  coach_id uuid not null references public.coaches on delete cascade,
  creada_en timestamptz not null default now(),
  expira_en timestamptz not null default (now() + interval '30 days'),
  usada_en timestamptz
);

create index if not exists invitaciones_clienta_idx
  on public.invitaciones_clienta (clienta_id);

alter table public.invitaciones_clienta enable row level security;

-- La coach gestiona sus propias invitaciones
drop policy if exists invitaciones_coach_all on public.invitaciones_clienta;
create policy invitaciones_coach_all on public.invitaciones_clienta
  for all using (coach_id = public.current_coach_id())
  with check (coach_id = public.current_coach_id());

-- ============================================================================
-- 4. Funciones públicas para el flow de invitación (sin login)
-- ============================================================================

-- Resuelve un token a la info que necesita la pantalla de aceptación de
-- invitación: nombre de la clienta, nombre/marca de la coach, validez.
create or replace function public.invitacion_info(t text)
  returns table (
    clienta_id uuid,
    clienta_nombre text,
    clienta_apellidos text,
    clienta_email text,
    coach_nombre text,
    coach_marca_nombre text,
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
      null::text, null::text, false, 'token_no_encontrado';
    return;
  end if;
  if inv.usada_en is not null then
    return query select null::uuid, null::text, null::text, null::text,
      null::text, null::text, false, 'ya_usada';
    return;
  end if;
  if inv.expira_en < now() then
    return query select null::uuid, null::text, null::text, null::text,
      null::text, null::text, false, 'expirada';
    return;
  end if;

  return query
    select cl.id, cl.nombre, cl.apellidos, cl.email,
           co.nombre, co.marca_nombre, true, null::text
    from public.clientas cl
    join public.coaches co on co.id = cl.coach_id
    where cl.id = inv.clienta_id;
end;
$$;

grant execute on function public.invitacion_info(text) to anon, authenticated;

-- Canjea una invitación: enlaza el auth.users que acaba de hacer signup con
-- la fila clientas.user_id correspondiente y marca la invitación como usada.
-- Debe llamarse DESPUÉS de que la clienta haya hecho supabase.auth.signUp().
create or replace function public.canjear_invitacion(t text)
  returns table (ok boolean, motivo text)
  language plpgsql security definer set search_path = public, auth
as $$
declare
  inv record;
  uid uuid;
  cl record;
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
  if cl.user_id is not null and cl.user_id <> uid then
    return query select false, 'ya_enlazada_a_otra_cuenta';
    return;
  end if;

  -- Enlazar
  update public.clientas
    set user_id = uid,
        estado = case when estado = 'invitada' then 'activa' else estado end
    where id = inv.clienta_id;

  -- Marcar invitación usada
  update public.invitaciones_clienta
    set usada_en = now()
    where token = t;

  return query select true, null::text;
end;
$$;

grant execute on function public.canjear_invitacion(text) to authenticated;
