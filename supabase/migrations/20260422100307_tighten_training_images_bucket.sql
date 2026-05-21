-- Tighten `training-images` bucket policies.
--
-- Problem (2026-04-21 security audit, live-DB verified):
--   The bucket had three `authenticated`-role policies whose only gate
--   was `bucket_id = 'training-images'`. Any authenticated user could
--   INSERT, UPDATE, or DELETE objects in this bucket — the latter two
--   with no ownership check at all. The existing SELECT policy was
--   already correctly scoped to admins.
--
-- Fix:
--   Drop the three broad policies and replace with admin-gated versions.
--   Training-image uploads are an internal ML-ops activity; regular
--   contractors/homeowners never need to write to this bucket.
--
-- Compatibility:
--   - Service role access is unchanged (`Service role can manage training
--     images` covers all operations).
--   - Admin read access is unchanged (`Admins read training images`).
--   - Any legitimate non-admin write path should go through a server API
--     route that uses the service-role client — the user-authenticated
--     write path is the vulnerability, not a feature.

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
