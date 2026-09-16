\set ON_ERROR_STOP on
BEGIN;
-- All records are synthetic and the transaction always rolls back.
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('fa060906-0000-4000-8000-000000000001','audit-owner@example.invalid','{}'),
 ('fa060906-0000-4000-8000-000000000002','audit-contractor@example.invalid','{}'),
 ('fa060906-0000-4000-8000-000000000003','audit-unrelated@example.invalid','{}'),
 ('fa060906-0000-4000-8000-000000000004','audit-admin@example.invalid','{}');
UPDATE public.profiles SET role='contractor' WHERE id='fa060906-0000-4000-8000-000000000002';
UPDATE public.profiles SET role='admin' WHERE id='fa060906-0000-4000-8000-000000000004';
INSERT INTO public.jobs(id,homeowner_id,contractor_id,title,description,location,status)
 VALUES ('fa060906-0000-4000-8000-000000000010','fa060906-0000-4000-8000-000000000001','fa060906-0000-4000-8000-000000000002','Synthetic audit job','Synthetic maintenance description for rollback-only audit','Synthetic','draft');
INSERT INTO public.properties(id,owner_id,property_name,address,property_type)
 VALUES ('fa060906-0000-4000-8000-000000000020','fa060906-0000-4000-8000-000000000001','Synthetic','Synthetic','residential');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','fa060906-0000-4000-8000-000000000002',true) IS NOT NULL AS contractor_context;
DO $$ BEGIN
  BEGIN
    INSERT INTO public.bids(job_id,contractor_id,amount,description,status)
    VALUES ('fa060906-0000-4000-8000-000000000010','fa060906-0000-4000-8000-000000000002',500,'Synthetic bid','accepted');
    RAISE EXCEPTION 'Accepted bid forged';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
INSERT INTO public.bids(id,job_id,contractor_id,amount,description,status)
VALUES ('fa060906-0000-4000-8000-000000000050','fa060906-0000-4000-8000-000000000010','fa060906-0000-4000-8000-000000000002',500,'Synthetic bid','pending');
UPDATE public.bids SET amount=550 WHERE id='fa060906-0000-4000-8000-000000000050';
RESET ROLE;
DO $$ BEGIN
 IF (SELECT amount FROM public.bids WHERE id='fa060906-0000-4000-8000-000000000050') IS DISTINCT FROM 550::numeric THEN
  RAISE EXCEPTION 'Legitimate pending bid edit did not persist'; END IF;
END $$;
UPDATE public.bids SET status='accepted' WHERE id='fa060906-0000-4000-8000-000000000050';
DO $$ BEGIN
  BEGIN
    UPDATE public.bids SET amount=900 WHERE id='fa060906-0000-4000-8000-000000000050';
    RAISE EXCEPTION 'Trusted racing edit changed accepted amount';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN
    UPDATE public.bids SET status='withdrawn' WHERE id='fa060906-0000-4000-8000-000000000050';
    RAISE EXCEPTION 'Client withdrew accepted bid';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
DO $$ BEGIN
 BEGIN
  DELETE FROM public.bids WHERE id='fa060906-0000-4000-8000-000000000050';
  RAISE EXCEPTION 'Client deleted accepted bid';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF NOT EXISTS(SELECT FROM public.bids WHERE id='fa060906-0000-4000-8000-000000000050'
  AND status='accepted' AND amount=550 AND contractor_id='fa060906-0000-4000-8000-000000000002') THEN
  RAISE EXCEPTION 'Accepted bid state changed after denied operations'; END IF;
END $$;
ROLLBACK;
