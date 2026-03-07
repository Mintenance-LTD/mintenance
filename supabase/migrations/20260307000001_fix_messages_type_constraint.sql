-- Fix messages.message_type CHECK constraint to include 'system' type
-- The old constraint only allowed ('text', 'image', 'file'), blocking
-- system messages like contract notifications and rejection notices.

-- Step 1: Drop any existing message_type CHECK constraints
DO $$
DECLARE
  cname TEXT;
BEGIN
  FOR cname IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE rel.relname = 'messages'
      AND nsp.nspname = 'public'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%message_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.messages DROP CONSTRAINT %I', cname);
    RAISE NOTICE 'Dropped messages type constraint: %', cname;
  END LOOP;
END $$;

-- Step 2: Add updated constraint including 'system'
ALTER TABLE public.messages
ADD CONSTRAINT messages_type_check
CHECK (message_type IN ('text', 'image', 'file', 'system'));
