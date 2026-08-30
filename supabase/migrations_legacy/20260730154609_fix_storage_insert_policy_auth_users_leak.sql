drop policy if exists "Admin users can upload YOLO models" on storage.objects;

create policy "Admin users can upload YOLO models"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'yolo-models'
    and public.is_admin((select auth.uid()))
  );;
