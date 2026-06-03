-- ============================================================================
-- Proteger columnas sensibles de `clientas` frente a auto-edición de la clienta
-- ----------------------------------------------------------------------------
-- La policy `clientas_self_update` permite a la clienta actualizar SU fila
-- (user_id = auth.uid()), pero Postgres RLS no restringe POR COLUMNA. Es decir,
-- una clienta podría (llamando a la API directamente, no vía la app) cambiar su
-- coach_id, estado, email, user_id o trainerstudio_id sobre su propia fila.
--
-- Este trigger congela esas columnas cuando quien actualiza es la PROPIA clienta
-- (auth.uid() = user_id de la fila). La entrenadora (auth.uid() != user_id de la
-- clienta) y el service_role siguen pudiendo cambiarlas con normalidad.
-- Defensa en profundidad: el server action de la app ya está acotado; esto cierra
-- el hueco a nivel de base de datos.
-- ============================================================================

create or replace function public.clientas_proteger_columnas()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  -- Si quien hace el UPDATE es la propia clienta, restaurar los valores OLD de
  -- las columnas sensibles (ignora cualquier intento de cambiarlas).
  if auth.uid() is not null and auth.uid() = old.user_id then
    new.coach_id        := old.coach_id;
    new.estado          := old.estado;
    new.email           := old.email;
    new.user_id         := old.user_id;
    new.trainerstudio_id := old.trainerstudio_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_clientas_proteger_columnas on public.clientas;
create trigger trg_clientas_proteger_columnas
  before update on public.clientas
  for each row
  execute function public.clientas_proteger_columnas();
