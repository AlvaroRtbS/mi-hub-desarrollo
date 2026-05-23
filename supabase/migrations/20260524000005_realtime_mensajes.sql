-- Activar replicación en tiempo real para `public.mensajes` de modo que el chat
-- entre coach y clienta se actualice sin recargar (escucha vía Supabase Realtime
-- en el cliente).
--
-- Idempotente: comprueba si la tabla ya está en la publication antes de añadirla.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'mensajes'
  ) then
    alter publication supabase_realtime add table public.mensajes;
  end if;
end
$$;
