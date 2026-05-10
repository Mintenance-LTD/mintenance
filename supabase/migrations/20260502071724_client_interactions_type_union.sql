DO $$
BEGIN
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
