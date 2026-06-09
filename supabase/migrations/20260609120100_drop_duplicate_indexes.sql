-- Audit 2026-06-09 (performance advisor): 15 exact-duplicate index pairs —
-- same table, same definition, different names. Each pair doubles write
-- amplification and storage for zero read benefit. One of each pair is
-- dropped; the kept name is the clearer/conventional one.
-- Applied live via Supabase MCP 2026-06-09; post-apply duplicate scan
-- returned zero rows.

-- contractor_payout_accounts: both pairs are duplicate UNIQUE CONSTRAINTS
-- (table itself is orphaned per audit-46, but cheap to clean while it lives).
ALTER TABLE public.contractor_payout_accounts
  DROP CONSTRAINT IF EXISTS payout_accounts_unique_contractor,
  DROP CONSTRAINT IF EXISTS payout_accounts_unique_stripe;

DROP INDEX IF EXISTS public.idx_report_tokens_token;                  -- dup of anonymous_report_tokens_token_key (constraint)
DROP INDEX IF EXISTS public.idx_contractor_skills_contractor;         -- dup of idx_contractor_skills_contractor_id
DROP INDEX IF EXISTS public.idx_security_events_type;                 -- dup of idx_security_events_event_type
DROP INDEX IF EXISTS public.idx_security_events_user;                 -- dup of idx_security_events_user_id
DROP INDEX IF EXISTS public.idx_building_assessments_job_created;     -- dup of idx_building_assessments_job_id_created_at
DROP INDEX IF EXISTS public.idx_job_photos_metadata_photo_type;       -- dup of idx_job_photos_metadata_job_id_photo_type (both are (job_id, photo_type))
DROP INDEX IF EXISTS public.idx_sam3_pseudo_labels_hash;              -- dup of idx_sam3_pseudo_labels_image_hash
DROP INDEX IF EXISTS public.idx_hybrid_routing_decisions_route;       -- dup of idx_hybrid_routing_decisions_route_selected
DROP INDEX IF EXISTS public.idx_confidence_calibration_routing_id;    -- dup of idx_confidence_calibration_routing_decision
DROP INDEX IF EXISTS public.idx_payment_methods_user;                 -- dup of idx_payment_methods_user_id
DROP INDEX IF EXISTS public.idx_message_threads_participants;         -- dup of idx_message_threads_participant_ids_gin
DROP INDEX IF EXISTS public.idx_disputes_job;                         -- dup of idx_disputes_job_id
DROP INDEX IF EXISTS public.idx_organization_memberships_user_active; -- dup of idx_organization_memberships_user_status (both are (user_id, status))
