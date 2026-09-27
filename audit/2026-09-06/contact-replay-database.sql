-- Run only against the isolated audit database. Every synthetic row rolls back.
BEGIN;
DO $$
DECLARE contact uuid := gen_random_uuid(); failed uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.property_tenants(id,name) VALUES(contact,'Synthetic recovery contact');
  DELETE FROM public.property_tenants WHERE id=contact;
  BEGIN
    INSERT INTO public.property_tenants(id,name) VALUES(contact,'Synthetic retry');
    RAISE EXCEPTION 'FAIL: deleted contact was recreated';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.property_tenants(id,name) VALUES(failed,NULL);
    RAISE EXCEPTION 'FAIL: invalid contact was inserted';
  EXCEPTION WHEN not_null_violation THEN NULL;
  END;
  IF EXISTS(SELECT 1 FROM public.property_contact_save_ids WHERE id=failed) THEN
    RAISE EXCEPTION 'FAIL: failed insert consumed identity';
  END IF;
  INSERT INTO public.property_tenants(id,name) VALUES(failed,'Synthetic corrected contact');
  BEGIN
    UPDATE public.property_tenants SET id=gen_random_uuid() WHERE id=failed;
    RAISE EXCEPTION 'FAIL: contact identity changed';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  IF has_table_privilege('anon','public.property_contact_save_ids','SELECT') OR
     has_table_privilege('authenticated','public.property_contact_save_ids','SELECT') OR
     has_table_privilege('service_role','public.property_contact_save_ids','DELETE') OR
     has_function_privilege('authenticated','public.reserve_property_contact_identity()','EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: identity ledger privileges too broad';
  END IF;
END;
$$;
ROLLBACK;
