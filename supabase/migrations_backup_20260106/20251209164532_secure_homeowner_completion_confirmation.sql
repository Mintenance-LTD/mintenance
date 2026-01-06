-- Migration: Secure homeowner completion confirmation field
-- Purpose: Prevent contractors from bypassing homeowner confirmation by directly updating the field
-- Security: Ensures only homeowners can set completion_confirmed_by_homeowner = true

-- Add the column if it doesn't exist
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS completion_confirmed_by_homeowner BOOLEAN DEFAULT FALSE;

-- Add explicit RLS policy to protect completion_confirmed_by_homeowner field
-- This prevents contractors from directly updating the database to confirm completion
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'jobs'
    AND policyname = 'Only homeowners can confirm job completion'
  ) THEN
    CREATE POLICY "Only homeowners can confirm job completion"
    ON jobs
    FOR UPDATE
    USING (
      -- User must be the homeowner to update this field
      homeowner_id = auth.uid()
    )
    WITH CHECK (
      -- Only homeowners can update jobs
      homeowner_id = auth.uid()
    );
  END IF;
END $$;

-- Add rate limiting constraint to prevent spam confirmations
-- Ensure a job can only transition to confirmed state once
CREATE OR REPLACE FUNCTION prevent_completion_confirmation_reversal()
RETURNS TRIGGER AS $$
BEGIN
  -- Once confirmed, cannot be unconfirmed
  IF OLD.completion_confirmed_by_homeowner = true AND NEW.completion_confirmed_by_homeowner = false THEN
    RAISE EXCEPTION 'Cannot unconfirm job completion once confirmed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_confirmation_reversal ON jobs;
CREATE TRIGGER prevent_confirmation_reversal
BEFORE UPDATE ON jobs
FOR EACH ROW
EXECUTE FUNCTION prevent_completion_confirmation_reversal();

-- Add helpful comments
COMMENT ON COLUMN jobs.completion_confirmed_by_homeowner IS
  'Boolean flag indicating homeowner has inspected and confirmed job completion.
   Protected by RLS policy - only homeowner can set to true.
   Once true, cannot be reverted to false (one-way transition).';

-- Create index for faster queries on confirmation status
CREATE INDEX IF NOT EXISTS idx_jobs_completion_confirmed
ON jobs(completion_confirmed_by_homeowner)
WHERE completion_confirmed_by_homeowner = true;

-- Add audit logging for confirmation changes
CREATE OR REPLACE FUNCTION log_completion_confirmation_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log when confirmation status actually changes
  IF OLD.completion_confirmed_by_homeowner != NEW.completion_confirmed_by_homeowner THEN
    INSERT INTO job_status_transitions (
      job_id,
      from_status,
      to_status,
      transition_type,
      triggered_by_user_id,
      trigger_reason,
      is_valid_transition,
      metadata
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      'manual',
      auth.uid(),
      CASE
        WHEN NEW.completion_confirmed_by_homeowner = true THEN 'Homeowner confirmed job completion'
        ELSE 'Completion confirmation status changed'
      END,
      true,
      jsonb_build_object(
        'completion_confirmed', NEW.completion_confirmed_by_homeowner,
        'confirmed_at', NOW(),
        'previous_confirmed', OLD.completion_confirmed_by_homeowner
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS log_completion_confirmation ON jobs;
CREATE TRIGGER log_completion_confirmation
AFTER UPDATE ON jobs
FOR EACH ROW
WHEN (OLD.completion_confirmed_by_homeowner IS DISTINCT FROM NEW.completion_confirmed_by_homeowner)
EXECUTE FUNCTION log_completion_confirmation_change();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION prevent_completion_confirmation_reversal() TO authenticated;
GRANT EXECUTE ON FUNCTION log_completion_confirmation_change() TO authenticated;
