-- ============================================================================
-- Buckets de Storage para vídeos, imágenes y PDFs.
-- Cada bucket tiene políticas RLS: cada coach solo accede a sus archivos.
-- Convención de ruta: <coach_id>/<resto-del-path>
-- ============================================================================

-- Crear buckets si no existen
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('ejercicios-videos',   'ejercicios-videos',   false, 104857600, array['video/mp4','video/quicktime','video/webm']),
  ('ejercicios-imagenes', 'ejercicios-imagenes', false, 10485760,  array['image/jpeg','image/png','image/webp']),
  ('fotos-progreso',      'fotos-progreso',      false, 10485760,  array['image/jpeg','image/png','image/webp']),
  ('nutricion-pdfs',      'nutricion-pdfs',      false, 20971520,  array['application/pdf']),
  ('coach-avatares',      'coach-avatares',      true,  5242880,   array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Helper: extraer el coach_id de la primera carpeta del path
-- Ej: '<coach-uuid>/file.mp4' → '<coach-uuid>'
create or replace function public.storage_path_coach_id(name text) returns uuid
  language sql immutable as $$
  select case
    when split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(name, '/', 1)::uuid
    else null
  end;
$$;

-- Política única para todos los buckets privados de coaches: cada coach accede solo a su carpeta
do $$
declare
  b text;
  bucket_ids text[] := array['ejercicios-videos','ejercicios-imagenes','fotos-progreso','nutricion-pdfs'];
begin
  foreach b in array bucket_ids loop
    -- SELECT
    execute format(
      'create policy %I on storage.objects for select using (bucket_id = %L and public.storage_path_coach_id(name) = public.current_coach_id())',
      b || '_select', b
    );
    -- INSERT
    execute format(
      'create policy %I on storage.objects for insert with check (bucket_id = %L and public.storage_path_coach_id(name) = public.current_coach_id())',
      b || '_insert', b
    );
    -- UPDATE
    execute format(
      'create policy %I on storage.objects for update using (bucket_id = %L and public.storage_path_coach_id(name) = public.current_coach_id())',
      b || '_update', b
    );
    -- DELETE
    execute format(
      'create policy %I on storage.objects for delete using (bucket_id = %L and public.storage_path_coach_id(name) = public.current_coach_id())',
      b || '_delete', b
    );
  end loop;
end $$;

-- Avatares de coaches son públicos (cualquiera puede ver), pero solo el dueño puede subir/editar
create policy coach_avatares_public_read on storage.objects for select using (bucket_id = 'coach-avatares');
create policy coach_avatares_owner_insert on storage.objects for insert with check (bucket_id = 'coach-avatares' and public.storage_path_coach_id(name) = public.current_coach_id());
create policy coach_avatares_owner_update on storage.objects for update using (bucket_id = 'coach-avatares' and public.storage_path_coach_id(name) = public.current_coach_id());
create policy coach_avatares_owner_delete on storage.objects for delete using (bucket_id = 'coach-avatares' and public.storage_path_coach_id(name) = public.current_coach_id());
