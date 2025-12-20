-- Add payment_status column to jobs table
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

-- Add check constraint for valid payment statuses (drop first if exists)
ALTER TABLE jobs
DROP CONSTRAINT IF EXISTS jobs_payment_status_check;

ALTER TABLE jobs
ADD CONSTRAINT jobs_payment_status_check
CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed', 'canceled'));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_jobs_payment_status
ON jobs(payment_status);

-- Add comment for documentation
COMMENT ON COLUMN jobs.payment_status IS 'Payment status for the job: pending, paid, refunded, failed, canceled';
