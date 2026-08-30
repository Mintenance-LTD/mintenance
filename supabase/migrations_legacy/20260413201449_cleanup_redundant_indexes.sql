-- Migration: Drop indexes that duplicate their table's PRIMARY KEY index.
-- PostgreSQL automatically creates a unique index for every PK constraint.
-- These explicit indexes on (id) columns are redundant and waste write I/O.

DROP INDEX IF EXISTS public.idx_users_id;
DROP INDEX IF EXISTS public.idx_jobs_id;
DROP INDEX IF EXISTS public.idx_bids_id;
DROP INDEX IF EXISTS public.idx_escrow_transactions_id;
DROP INDEX IF EXISTS public.idx_properties_id;
DROP INDEX IF EXISTS public.idx_messages_id;
DROP INDEX IF EXISTS public.idx_building_assessments_id;
DROP INDEX IF EXISTS public.idx_contractor_quotes_id;
DROP INDEX IF EXISTS public.idx_contractor_posts_id;;
