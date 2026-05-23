-- Bucket nuevo: `programa-adjuntos`. Contiene PDFs y vídeos que la entrenadora
-- adjunta a bloques de un programa (NO los vídeos demostrativos de ejercicios,
-- que viven en `ejercicios-videos`). El path siempre empieza por <coach_id>/
-- para que el RLS funcione con el helper `storage_path_coach_id`.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'programa-adjuntos',
  'programa-adjuntos',
  false,
  157286400, -- 150 MB para permitir vídeos algo más largos
  array[
    'application/pdf',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/x-matroska'
  ]
)
on conflict (id) do nothing;

-- Políticas idénticas al resto de buckets de coach (cada coach solo ve su carpeta)
drop policy if exists programa_adjuntos_select on storage.objects;
drop policy if exists programa_adjuntos_insert on storage.objects;
drop policy if exists programa_adjuntos_update on storage.objects;
drop policy if exists programa_adjuntos_delete on storage.objects;

create policy programa_adjuntos_select on storage.objects
  for select using (
    bucket_id = 'programa-adjuntos'
    and public.storage_path_coach_id(name) = public.current_coach_id()
  );

create policy programa_adjuntos_insert on storage.objects
  for insert with check (
    bucket_id = 'programa-adjuntos'
    and public.storage_path_coach_id(name) = public.current_coach_id()
  );

create policy programa_adjuntos_update on storage.objects
  for update using (
    bucket_id = 'programa-adjuntos'
    and public.storage_path_coach_id(name) = public.current_coach_id()
  );

create policy programa_adjuntos_delete on storage.objects
  for delete using (
    bucket_id = 'programa-adjuntos'
    and public.storage_path_coach_id(name) = public.current_coach_id()
  );
