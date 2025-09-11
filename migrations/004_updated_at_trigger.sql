-- 004_updated_at_trigger.sql
-- Purpose: Ensure uniform updated_at maintenance across mutable tables.

BEGIN;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $$;

-- Attach trigger to a curated list of tables when present
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'public.profiles',
    'public.service_areas','public.service_routes','public.area_performance',
    'public.quote_templates','public.quote_line_item_templates','public.contractor_quotes',
    'public.quote_revisions','public.quote_analytics',
    'public.form_templates','public.form_fields','public.job_sheets',
    'public.email_templates','public.email_template_versions','public.email_automation_rules','public.email_analytics',
    'public.contractor_posts','public.contractor_post_comments'
  ]
  LOOP
    BEGIN
      EXECUTE format('SELECT 1 FROM %s LIMIT 1', t);
      EXCEPTION WHEN undefined_table THEN CONTINUE;
    END;
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON %s;', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();', t);
  END LOOP;
END $$;

COMMIT;

