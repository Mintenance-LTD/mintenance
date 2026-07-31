-- Anonymous-report retention: stop property deletion wiping tenant reports.
--
-- Chain before this migration:
--   properties (delete)
--     -> anonymous_report_tokens.property_id  ON DELETE CASCADE  (NOT NULL)
--        -> anonymous_reports.token_id        ON DELETE CASCADE  (NOT NULL)
--
-- anonymous_reports.property_id was already ON DELETE SET NULL
-- (20260521104934), but the report rows were still destroyed transitively
-- through the token, so that retention fix was incomplete.
--
-- Fix: keep the TOKEN row alive rather than nulling the report's token link.
-- anonymous_reports RLS resolves the landlord exclusively through
-- token_id -> anonymous_report_tokens.owner_id, and the landlord reports
-- list/detail queries join `anonymous_report_tokens!inner`. Preserving the
-- token keeps the reports both RETAINED and READABLE; nulling
-- anonymous_reports.token_id would have kept them only as admin-only orphans.
--
-- A token whose property is gone must not keep accepting submissions:
-- the public /api/report/[token] GET + POST treat property_id IS NULL as a
-- deactivated link (410).
--
-- Verified live 2026-07-26 with a seeded + rolled-back transaction: after
-- deleting the property the report row survives, token_id stays intact,
-- token.property_id becomes NULL, and the owner-scoped RLS predicate still
-- resolves true for the landlord.

ALTER TABLE public.anonymous_report_tokens
  ALTER COLUMN property_id DROP NOT NULL;

ALTER TABLE public.anonymous_report_tokens
  DROP CONSTRAINT IF EXISTS anonymous_report_tokens_property_id_fkey;

ALTER TABLE public.anonymous_report_tokens
  ADD CONSTRAINT anonymous_report_tokens_property_id_fkey
  FOREIGN KEY (property_id)
  REFERENCES public.properties(id)
  ON DELETE SET NULL;
