-- Fix mobile RLS parity: ensure authenticated users can access tables that
-- web bypasses via service_role. Mobile uses anon key + JWT (subject to RLS).
-- All DROP POLICY statements are inside DO blocks to handle missing tables.

BEGIN;

-- ============================================================
-- FIX 1: messages — add UPDATE policy for marking messages as read
-- Mobile needs to update read status. Currently only SELECT/INSERT exist.
-- ============================================================

DO $$
BEGIN
  IF to_regclass('public.messages') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'thread_id'
     )
  THEN
    DROP POLICY IF EXISTS "messages_update_read" ON public.messages;
    CREATE POLICY "messages_update_read"
      ON public.messages
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.message_threads t
          WHERE t.id = messages.thread_id
            AND auth.uid() = ANY(t.participant_ids)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.message_threads t
          WHERE t.id = messages.thread_id
            AND auth.uid() = ANY(t.participant_ids)
        )
      );
  ELSE
    RAISE NOTICE 'Skipping messages_update_read policy — messages.thread_id does not exist';
  END IF;
END $$;

-- ============================================================
-- FIX 2: messages — add DELETE policy for sender's own messages
-- ============================================================

DO $$
BEGIN
  IF to_regclass('public.messages') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'sender_id'
     )
  THEN
    DROP POLICY IF EXISTS "messages_delete_own" ON public.messages;
    CREATE POLICY "messages_delete_own"
      ON public.messages
      FOR DELETE
      TO authenticated
      USING (sender_id = auth.uid());
  ELSE
    RAISE NOTICE 'Skipping messages_delete_own policy — messages.sender_id does not exist';
  END IF;
END $$;

-- ============================================================
-- FIX 3: contractor_certifications — allow public read of verified certs
-- Homeowners need to see contractor certs when browsing profiles.
-- ============================================================

DO $$
BEGIN
  IF to_regclass('public.contractor_certifications') IS NOT NULL THEN
    DROP POLICY IF EXISTS "contractor_certs_public_read" ON public.contractor_certifications;
    CREATE POLICY "contractor_certs_public_read"
      ON public.contractor_certifications
      FOR SELECT
      TO authenticated
      USING (
        contractor_id = auth.uid()
        OR is_verified = true
      );
  END IF;
END $$;

-- ============================================================
-- FIX 4: contractor_clients — ensure contractor ownership enforcement
-- ============================================================

ALTER TABLE IF EXISTS public.contractor_clients ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF to_regclass('public.contractor_clients') IS NOT NULL THEN
    DROP POLICY IF EXISTS "contractor_clients_own" ON public.contractor_clients;
    CREATE POLICY "contractor_clients_own"
      ON public.contractor_clients
      FOR ALL
      TO authenticated
      USING (contractor_id = auth.uid())
      WITH CHECK (contractor_id = auth.uid());

    DROP POLICY IF EXISTS "contractor_clients_service_role" ON public.contractor_clients;
    CREATE POLICY "contractor_clients_service_role"
      ON public.contractor_clients
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- FIX 5: client_segments — ensure contractor ownership enforcement
-- ============================================================

ALTER TABLE IF EXISTS public.client_segments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF to_regclass('public.client_segments') IS NOT NULL THEN
    DROP POLICY IF EXISTS "client_segments_own" ON public.client_segments;
    CREATE POLICY "client_segments_own"
      ON public.client_segments
      FOR ALL
      TO authenticated
      USING (contractor_id = auth.uid())
      WITH CHECK (contractor_id = auth.uid());

    DROP POLICY IF EXISTS "client_segments_service_role" ON public.client_segments;
    CREATE POLICY "client_segments_service_role"
      ON public.client_segments
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- FIX 6: job_sheets — ensure contractor ownership enforcement
-- ============================================================

ALTER TABLE IF EXISTS public.job_sheets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF to_regclass('public.job_sheets') IS NOT NULL THEN
    DROP POLICY IF EXISTS "job_sheets_contractor_own" ON public.job_sheets;
    CREATE POLICY "job_sheets_contractor_own"
      ON public.job_sheets
      FOR ALL
      TO authenticated
      USING (contractor_id = auth.uid())
      WITH CHECK (contractor_id = auth.uid());

    DROP POLICY IF EXISTS "job_sheets_service_role" ON public.job_sheets;
    CREATE POLICY "job_sheets_service_role"
      ON public.job_sheets
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- FIX 7: contractor_goals — ensure contractor ownership enforcement
-- ============================================================

ALTER TABLE IF EXISTS public.contractor_goals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF to_regclass('public.contractor_goals') IS NOT NULL THEN
    DROP POLICY IF EXISTS "contractor_goals_own" ON public.contractor_goals;
    CREATE POLICY "contractor_goals_own"
      ON public.contractor_goals
      FOR ALL
      TO authenticated
      USING (contractor_id = auth.uid())
      WITH CHECK (contractor_id = auth.uid());

    DROP POLICY IF EXISTS "contractor_goals_service_role" ON public.contractor_goals;
    CREATE POLICY "contractor_goals_service_role"
      ON public.contractor_goals
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- FIX 8: inventory_items — ensure contractor ownership enforcement
-- ============================================================

ALTER TABLE IF EXISTS public.inventory_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF to_regclass('public.inventory_items') IS NOT NULL THEN
    DROP POLICY IF EXISTS "inventory_items_own" ON public.inventory_items;
    CREATE POLICY "inventory_items_own"
      ON public.inventory_items
      FOR ALL
      TO authenticated
      USING (contractor_id = auth.uid())
      WITH CHECK (contractor_id = auth.uid());

    DROP POLICY IF EXISTS "inventory_items_service_role" ON public.inventory_items;
    CREATE POLICY "inventory_items_service_role"
      ON public.inventory_items
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- FIX 9: service_areas — ensure contractor ownership enforcement
-- ============================================================

ALTER TABLE IF EXISTS public.service_areas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF to_regclass('public.service_areas') IS NOT NULL THEN
    DROP POLICY IF EXISTS "service_areas_own" ON public.service_areas;
    CREATE POLICY "service_areas_own"
      ON public.service_areas
      FOR ALL
      TO authenticated
      USING (contractor_id = auth.uid())
      WITH CHECK (contractor_id = auth.uid());

    DROP POLICY IF EXISTS "service_areas_service_role" ON public.service_areas;
    CREATE POLICY "service_areas_service_role"
      ON public.service_areas
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- FIX 10: client_communication_templates — ensure contractor ownership
-- ============================================================

ALTER TABLE IF EXISTS public.client_communication_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF to_regclass('public.client_communication_templates') IS NOT NULL THEN
    DROP POLICY IF EXISTS "client_comm_templates_own" ON public.client_communication_templates;
    CREATE POLICY "client_comm_templates_own"
      ON public.client_communication_templates
      FOR ALL
      TO authenticated
      USING (contractor_id = auth.uid())
      WITH CHECK (contractor_id = auth.uid());

    DROP POLICY IF EXISTS "client_comm_templates_service_role" ON public.client_communication_templates;
    CREATE POLICY "client_comm_templates_service_role"
      ON public.client_communication_templates
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- FIX 11: client_communications — ensure ownership via client relationship
-- ============================================================

ALTER TABLE IF EXISTS public.client_communications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF to_regclass('public.client_communications') IS NOT NULL THEN
    DROP POLICY IF EXISTS "client_comms_own" ON public.client_communications;
    CREATE POLICY "client_comms_own"
      ON public.client_communications
      FOR ALL
      TO authenticated
      USING (contractor_id = auth.uid())
      WITH CHECK (contractor_id = auth.uid());

    DROP POLICY IF EXISTS "client_comms_service_role" ON public.client_communications;
    CREATE POLICY "client_comms_service_role"
      ON public.client_communications
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- FIX 12: goal_templates — allow public read of public templates
-- ============================================================

ALTER TABLE IF EXISTS public.goal_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF to_regclass('public.goal_templates') IS NOT NULL THEN
    DROP POLICY IF EXISTS "goal_templates_public_read" ON public.goal_templates;
    CREATE POLICY "goal_templates_public_read"
      ON public.goal_templates
      FOR SELECT
      TO authenticated
      USING (is_public = true);

    DROP POLICY IF EXISTS "goal_templates_service_role" ON public.goal_templates;
    CREATE POLICY "goal_templates_service_role"
      ON public.goal_templates
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

COMMIT;
