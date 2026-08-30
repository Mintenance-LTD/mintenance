-- Tighten `training-images` bucket policies.
-- Drops three broad authenticated-role policies (INSERT/UPDATE/DELETE)
-- and replaces with admin-gated equivalents. See
-- supabase/migrations/20260421000003_tighten_training_images_bucket.sql.

drop policy if exists "Authenticated users can upload training images" on storage.objects;
drop policy if exists "Authenticated users can update training images" on storage.objects;
drop policy if exists "Authenticated users can delete training images" on storage.objects;

create policy "Admins can upload training images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'training-images'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Admins can update training images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'training-images'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    bucket_id = 'training-images'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Admins can delete training images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'training-images'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
;
