-- Add RLS policies for authenticated homeowners on homeowner_subscriptions
-- Previously only service_role had access. This adds user-level policies
-- so homeowners can manage their own subscriptions.

BEGIN;

-- Allow homeowners to read their own subscriptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'homeowner_subscriptions'
      AND policyname = 'homeowner_subscriptions_select_own'
  ) THEN
    CREATE POLICY homeowner_subscriptions_select_own
      ON public.homeowner_subscriptions
      FOR SELECT
      TO authenticated
      USING (homeowner_id = auth.uid());
  END IF;
END $$;

-- Allow homeowners to insert their own subscriptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'homeowner_subscriptions'
      AND policyname = 'homeowner_subscriptions_insert_own'
  ) THEN
    CREATE POLICY homeowner_subscriptions_insert_own
      ON public.homeowner_subscriptions
      FOR INSERT
      TO authenticated
      WITH CHECK (homeowner_id = auth.uid());
  END IF;
END $$;

-- Allow homeowners to update their own subscriptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'homeowner_subscriptions'
      AND policyname = 'homeowner_subscriptions_update_own'
  ) THEN
    CREATE POLICY homeowner_subscriptions_update_own
      ON public.homeowner_subscriptions
      FOR UPDATE
      TO authenticated
      USING (homeowner_id = auth.uid())
      WITH CHECK (homeowner_id = auth.uid());
  END IF;
END $$;

COMMIT;
