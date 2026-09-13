\set ON_ERROR_STOP on
BEGIN;
-- Synthetic storage metadata only; no uploaded bytes and no persisted records.
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('fa060909-0000-4000-8000-000000000001','photo-owner@example.invalid','{}'),
 ('fa060909-0000-4000-8000-000000000002','photo-other@example.invalid','{}'),
 ('fa060909-0000-4000-8000-000000000003','photo-member@example.invalid','{}');
INSERT INTO public.properties(id,owner_id,property_name,address,property_type)
VALUES ('fa060909-0000-4000-8000-000000000010','fa060909-0000-4000-8000-000000000001','Synthetic','Synthetic','residential');
INSERT INTO public.property_team_members(property_id,email,role,status,user_id)
VALUES ('fa060909-0000-4000-8000-000000000010','photo-member@example.invalid','viewer','accepted','fa060909-0000-4000-8000-000000000003');
INSERT INTO storage.objects(bucket_id,name) VALUES
 ('Job-storage','property-photos/fa060909-0000-4000-8000-000000000001/private.jpg'),
 ('Job-storage','property-room-photos/fa060909-0000-4000-8000-000000000001/fa060909-0000-4000-8000-000000000010/kitchen/private.jpg');
SET LOCAL ROLE service_role;
DO $$
DECLARE
 own_path text := 'property-photos/fa060909-0000-4000-8000-000000000001/private.jpg';
 room_path text := 'property-room-photos/fa060909-0000-4000-8000-000000000001/fa060909-0000-4000-8000-000000000010/kitchen/private.jpg';
BEGIN
 IF (SELECT count(*) FROM public.authorized_private_photo_paths('fa060909-0000-4000-8000-000000000001',ARRAY[own_path,room_path])) <> 2 THEN
  RAISE EXCEPTION 'Owner cannot renew owned photos';
 END IF;
 IF EXISTS (SELECT FROM public.authorized_private_photo_paths('fa060909-0000-4000-8000-000000000002',ARRAY[own_path,room_path])) THEN
  RAISE EXCEPTION 'Unrelated actor can renew private photos';
 END IF;
 IF (SELECT count(*) FROM public.authorized_private_photo_paths('fa060909-0000-4000-8000-000000000003',ARRAY[room_path])) <> 1 THEN
  RAISE EXCEPTION 'Accepted property viewer cannot renew room photo';
 END IF;
 IF EXISTS (SELECT FROM public.authorized_private_photo_paths('fa060909-0000-4000-8000-000000000003',ARRAY[own_path])) THEN
  RAISE EXCEPTION 'Property sharing grants access to unshared owner uploads';
 END IF;
END $$;
RESET ROLE;
DELETE FROM public.property_team_members WHERE property_id='fa060909-0000-4000-8000-000000000010';
SET LOCAL ROLE service_role;
DO $$ BEGIN
 IF EXISTS (SELECT FROM public.authorized_private_photo_paths('fa060909-0000-4000-8000-000000000003',ARRAY['property-room-photos/fa060909-0000-4000-8000-000000000001/fa060909-0000-4000-8000-000000000010/kitchen/private.jpg'])) THEN
  RAISE EXCEPTION 'Removed property member can renew room photo';
 END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN
  PERFORM public.authorized_private_photo_paths('fa060909-0000-4000-8000-000000000001',ARRAY['private.jpg']);
  RAISE EXCEPTION 'Client can impersonate a signer actor';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;
RESET ROLE;
ROLLBACK;
