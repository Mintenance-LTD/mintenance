-- 2026-05-02 audit follow-up (review pass 5) — align the
-- `client_interactions.type` CHECK constraint with the values the
-- mobile contractor CRM actually emits.
--
-- Before this migration:
--   DB allowed: call, email, meeting, site_visit, quote_sent,
--               invoice_sent, follow_up, other
--   Mobile sent: call, email, meeting, job, follow_up, complaint,
--                compliment   (apps/mobile/src/services/client-management/
--                              ClientRepository.ts:275)
--
--   So `job` / `complaint` / `compliment` from the mobile contractor
--   CRM "Add interaction" form would fail the CHECK constraint and the
--   row never landed. Repository.addClientInteraction silently swallowed
--   the error in the surrounding throw boundary.
--
-- This migration takes the union of both sets so:
--   - every existing row still validates (no data migration needed)
--   - every value mobile + future web flows want to send is allowed
--   - drop+recreate is wrapped in a DO block so the migration is
--     idempotent (re-runnable on a fresh local DB without erroring on
--     the missing pre-existing constraint).

BEGIN;

DO $$
BEGIN
  -- Drop the old check (idempotent — only run if the named constraint
  -- exists; works on greenfield DBs that never ran the legacy check).
  IF EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'client_interactions'
      AND con.conname = 'client_interactions_type_check'
  ) THEN
    EXECUTE 'ALTER TABLE public.client_interactions DROP CONSTRAINT client_interactions_type_check';
  END IF;

  -- Add the union check. Listed alphabetically for stable diffing.
  EXECUTE $sql$
    ALTER TABLE public.client_interactions
      ADD CONSTRAINT client_interactions_type_check
      CHECK (
        type IN (
          'call',
          'compliment',
          'complaint',
          'email',
          'follow_up',
          'invoice_sent',
          'job',
          'meeting',
          'other',
          'quote_sent',
          'site_visit'
        )
      )
  $sql$;
END $$;

COMMIT;
