-- 2026-05-26 audit-48 P1: contractor_locations was missing from the
-- supabase_realtime publication, so the homeowner-side Realtime
-- subscriptions (web ContractorTravelTracking + mobile
-- HomeownerLocationRequest) silently received no INSERT/UPDATE events
-- even when the contractor's GPS tick was writing rows. Live publication
-- pre-fix: bids, jobs, messages, notifications, spatial_ref_sys.
--
-- Applied live via Supabase MCP on 2026-05-26 (see audit-48 commit).
-- Adding the file to the repo so a future re-create from migrations
-- doesn't drop the table from the publication again.

ALTER PUBLICATION supabase_realtime ADD TABLE public.contractor_locations;
