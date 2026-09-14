\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('fa060909-0000-4000-8000-000000000101','binding-owner@example.invalid','{}'),
 ('fa060909-0000-4000-8000-000000000102','binding-manager@example.invalid','{}'),
 ('fa060909-0000-4000-8000-000000000103','binding-other@example.invalid','{}');
INSERT INTO storage.objects(bucket_id,name) VALUES
 ('Job-storage','property-photos/fa060909-0000-4000-8000-000000000101/shared.jpg'),
 ('Job-storage','property-photos/fa060909-0000-4000-8000-000000000101/unshared.jpg'),
 ('Job-storage','property-photos/fa060909-0000-4000-8000-000000000102/manager.jpg');
CREATE FUNCTION pg_temp.reject_binding_for_failure_test() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.path LIKE '%/unshared.jpg' THEN
  RAISE EXCEPTION 'Synthetic attachment persistence failure' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER audit_binding_failure BEFORE INSERT ON public.property_photo_bindings
 FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_binding_for_failure_test();
SET LOCAL ROLE service_role;
SELECT public.save_property_with_photo_bindings(
 'fa060909-0000-4000-8000-000000000101','fa060909-0000-4000-8000-000000000110',
 '{"property_name":"Synthetic","address":"Synthetic","property_type":"residential","is_primary":true,
 "photos":["property-photos/fa060909-0000-4000-8000-000000000101/shared.jpg"]}'::jsonb,
 ARRAY['property-photos/fa060909-0000-4000-8000-000000000101/shared.jpg'],true) IS NOT NULL AS created;
INSERT INTO public.property_team_members(property_id,email,role,status,user_id)
 VALUES('fa060909-0000-4000-8000-000000000110','binding-manager@example.invalid','manager','accepted','fa060909-0000-4000-8000-000000000102');
DO $$
DECLARE owner_id uuid:='fa060909-0000-4000-8000-000000000101';
 manager_id uuid:='fa060909-0000-4000-8000-000000000102';
 v_property_id uuid:='fa060909-0000-4000-8000-000000000110';
 shared_path text:='property-photos/fa060909-0000-4000-8000-000000000101/shared.jpg';
 private_path text:='property-photos/fa060909-0000-4000-8000-000000000101/unshared.jpg';
 manager_path text:='property-photos/fa060909-0000-4000-8000-000000000102/manager.jpg';
BEGIN
 IF (SELECT count(*) FROM public.authorized_private_photo_paths(manager_id,ARRAY[shared_path,private_path]))<>1 THEN
  RAISE EXCEPTION 'Sharing authorization is not restricted to attached images'; END IF;
 PERFORM public.save_property_with_photo_bindings(manager_id,v_property_id,
  jsonb_build_object('photos',ARRAY[shared_path,manager_path],'property_name','Manager edit'),ARRAY[shared_path,manager_path],false);
 BEGIN
  PERFORM public.save_property_with_photo_bindings(manager_id,v_property_id,
   jsonb_build_object('photos',ARRAY[private_path],'property_name','Forbidden edit'),ARRAY[private_path],false);
  RAISE EXCEPTION 'Manager attached owner private upload';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF NOT EXISTS(SELECT FROM public.properties WHERE id=v_property_id AND property_name='Manager edit') OR
  (SELECT count(*) FROM public.property_photo_bindings b WHERE b.property_id=v_property_id)<>2 THEN
  RAISE EXCEPTION 'Rejected attachment partially changed property'; END IF;
 BEGIN
  PERFORM public.save_property_with_photo_bindings(owner_id,v_property_id,
   jsonb_build_object('photos',ARRAY[private_path],'property_name','Trigger failure'),ARRAY[private_path],false);
  RAISE EXCEPTION 'Injected binding persistence failure did not occur';
 EXCEPTION WHEN check_violation THEN NULL; END;
 IF NOT EXISTS(SELECT FROM public.properties WHERE id=v_property_id AND property_name='Manager edit') OR
  (SELECT count(*) FROM public.property_photo_bindings b WHERE b.property_id=v_property_id)<>2 THEN
  RAISE EXCEPTION 'Attachment persistence failure did not roll back property and removed bindings'; END IF;
 BEGIN
  PERFORM public.save_property_with_photo_bindings(owner_id,'fa060909-0000-4000-8000-000000000111',
   jsonb_build_object('property_name','Bad','address','Synthetic','property_type','residential','is_primary',true,
    'photos',ARRAY[manager_path]),ARRAY[manager_path],true);
  RAISE EXCEPTION 'Creation accepted another user upload';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF EXISTS(SELECT FROM public.properties WHERE id='fa060909-0000-4000-8000-000000000111') OR
  NOT EXISTS(SELECT FROM public.properties WHERE id=v_property_id AND is_primary) THEN
  RAISE EXCEPTION 'Failed creation left a row or cleared primary'; END IF;
 BEGIN
  PERFORM public.save_property_with_photo_bindings('fa060909-0000-4000-8000-000000000103',v_property_id,
   '{"property_name":"Forbidden"}'::jsonb,ARRAY[]::text[],false);
  RAISE EXCEPTION 'Unrelated actor edited property';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.save_property_with_photo_bindings(manager_id,v_property_id,
   jsonb_build_object('owner_id',manager_id),ARRAY[]::text[],false);
  RAISE EXCEPTION 'Editable fields changed owner';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 PERFORM public.save_property_with_photo_bindings(manager_id,v_property_id,
  jsonb_build_object('photos',ARRAY[manager_path]),ARRAY[manager_path],false);
 IF EXISTS(SELECT FROM public.authorized_private_photo_paths(manager_id,ARRAY[shared_path])) THEN
  RAISE EXCEPTION 'Removed attachment still grants new access'; END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN
  INSERT INTO public.property_photo_bindings(property_id,path) VALUES
   ('fa060909-0000-4000-8000-000000000110','forged');
  RAISE EXCEPTION 'Client forged trusted attachment';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.save_property_with_photo_bindings('fa060909-0000-4000-8000-000000000101',
   'fa060909-0000-4000-8000-000000000110','{}',ARRAY[]::text[],false);
  RAISE EXCEPTION 'Client impersonated save actor';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
