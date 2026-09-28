-- Run only against the isolated audit database. All synthetic rows roll back.
\set ON_ERROR_STOP on
BEGIN;
DO $$
DECLARE actor uuid := gen_random_uuid(); outsider uuid := gen_random_uuid();
        stamp timestamptz := '2026-09-27 08:00:00.123456+00';
        first_ids uuid[]; next_ids uuid[]; cursor_id uuid; total integer;
BEGIN
 INSERT INTO public.retained_dispute_records(dispute_id,escrow_id,job_id,participant_ids,evidence,archived_at)
 SELECT gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),ARRAY[actor],'{}'::jsonb,stamp FROM generate_series(1,65);
 INSERT INTO public.retained_dispute_records(dispute_id,escrow_id,job_id,participant_ids,evidence,archived_at)
 SELECT gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),ARRAY[outsider],'{}'::jsonb,stamp FROM generate_series(1,5);
 SELECT array_agg(dispute_id ORDER BY archived_at DESC,dispute_id DESC) INTO first_ids FROM
  (SELECT dispute_id,archived_at FROM public.retained_dispute_records WHERE participant_ids @> ARRAY[actor] AND escrow_id IS NOT NULL ORDER BY archived_at DESC,dispute_id DESC LIMIT 50) page;
 cursor_id := first_ids[50];
 -- A newly archived row does not shift the cursor or duplicate an older page.
 INSERT INTO public.retained_dispute_records(dispute_id,escrow_id,job_id,participant_ids,evidence,archived_at)
 VALUES(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),ARRAY[actor],'{}'::jsonb,stamp+interval '1 second');
 SELECT array_agg(dispute_id ORDER BY archived_at DESC,dispute_id DESC) INTO next_ids FROM
  (SELECT dispute_id,archived_at FROM public.retained_dispute_records WHERE participant_ids @> ARRAY[actor] AND escrow_id IS NOT NULL
   AND (archived_at < stamp OR (archived_at = stamp AND dispute_id < cursor_id)) ORDER BY archived_at DESC,dispute_id DESC LIMIT 51) page;
 IF cardinality(first_ids) <> 50 OR cardinality(next_ids) <> 15 OR first_ids && next_ids THEN RAISE EXCEPTION 'Pagination skipped or duplicated tied records'; END IF;
 SELECT count(*) INTO total FROM public.retained_dispute_records WHERE participant_ids @> ARRAY[outsider];
 IF total <> 5 THEN RAISE EXCEPTION 'Participant isolation failed'; END IF;
 RAISE NOTICE 'PASS: 65 tied archives, 50/15 pages, intervening new archive, no overlap, unrelated participant isolated';
END $$;
ROLLBACK;
