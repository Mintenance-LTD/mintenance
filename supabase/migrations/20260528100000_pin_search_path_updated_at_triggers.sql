-- 2026-05-28: pin search_path on two updated_at trigger functions.
--
-- Supabase advisor flagged tg_job_tips_updated_at and
-- tg_job_checklist_items_updated_at with a mutable (unset) search_path.
-- Both bodies do only `NEW.updated_at := now(); RETURN NEW;` — now() is
-- a pg_catalog builtin, so the practical exploit surface is nil, but an
-- unset search_path on any function is a standing advisor warning and a
-- latent risk if the body ever grows to reference a bare relation name.
--
-- Fix: pin search_path to the repo-standard `public, pg_temp`. ALTER
-- FUNCTION (not CREATE OR REPLACE) preserves the existing body verbatim.

ALTER FUNCTION public.tg_job_tips_updated_at()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.tg_job_checklist_items_updated_at()
  SET search_path = public, pg_temp;
