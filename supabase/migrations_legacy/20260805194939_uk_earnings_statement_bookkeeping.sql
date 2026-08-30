BEGIN;

-- UK earnings statement bookkeeping (Task 2). tax_year_summaries is empty
-- (0 rows) and was keyed to the US 1099 workflow (form_1099_generated/_filed).
-- Add UK-named statement columns so no runtime code needs to reference "1099".
-- The old form_1099_* columns are left in place (dropped at deploy time) so
-- pre-merge code does not break mid-deploy.
ALTER TABLE public.tax_year_summaries
  ADD COLUMN IF NOT EXISTS statement_generated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS statement_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS statement_filed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS statement_filed_at timestamptz;

COMMENT ON COLUMN public.tax_year_summaries.tax_year IS
  'UK tax-year START year (e.g. 2025 denotes 6 Apr 2025 – 5 Apr 2026, label "2025-26").';

COMMIT;;
