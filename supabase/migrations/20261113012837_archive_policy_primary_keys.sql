BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

-- Historical policy snapshots are service-only archives. Preserve every
-- original column and row; give each snapshot a non-collated stable key.
-- Some fresh environments do not contain these optional July archives.
DO $$
DECLARE
  archive_name text;
  archive_table regclass;
  identity_sequence text;
BEGIN
  FOREACH archive_name IN ARRAY ARRAY[
    'rls_cross_role_dedup_backup_20260716',
    'rls_cross_role_merge_backup_20260716',
    'rls_dead_sr_policy_backup_20260716',
    'rls_structural_split_backup_20260716'
  ] LOOP
    archive_table := to_regclass(format('public.%I', archive_name));
    IF archive_table IS NULL THEN
      CONTINUE;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = archive_table AND contype = 'p'
    ) THEN
      EXECUTE format(
        'ALTER TABLE %s ADD COLUMN archive_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY',
        archive_table
      );
      identity_sequence := pg_get_serial_sequence(archive_table::text, 'archive_id');
      -- Do not inherit broad default sequence grants in older projects.
      EXECUTE format('REVOKE ALL ON SEQUENCE %s FROM PUBLIC, anon, authenticated', identity_sequence);
      EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %s TO service_role', identity_sequence);
    END IF;
  END LOOP;
END
$$;
COMMIT;
