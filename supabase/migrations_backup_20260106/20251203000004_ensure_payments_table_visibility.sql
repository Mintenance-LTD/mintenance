-- ==========================================================
-- ENSURE PAYMENTS TABLE VISIBILITY AND PERFORMANCE
-- Migration to verify payments table exists and optimize for revenue queries
-- ==========================================================

BEGIN;

-- ==========================================================
-- 1. ENSURE PAYMENTS TABLE EXISTS IN PUBLIC SCHEMA
-- ==========================================================

-- Create payments table if it doesn't exist (idempotent)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Related entities
    job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES public.contractor_invoices(id) ON DELETE SET NULL,

    -- Payment parties (used by revenue queries)
    payer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    payee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- Payment details
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'GBP',
    payment_method VARCHAR(50) CHECK (payment_method IN ('credit_card', 'debit_card', 'bank_transfer', 'paypal', 'stripe', 'cash', 'check')),

    -- Stripe integration
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    stripe_charge_id VARCHAR(255),
    transaction_id TEXT, -- Generic transaction reference

    -- Status (used by revenue queries to filter 'completed' payments)
    status VARCHAR(50) DEFAULT 'pending' CHECK (
        status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled')
    ),

    -- Description
    description TEXT,

    -- Fees and net amount
    platform_fee DECIMAL(10, 2) DEFAULT 0 CHECK (platform_fee >= 0),
    processing_fee DECIMAL(10, 2) DEFAULT 0 CHECK (processing_fee >= 0),
    net_amount DECIMAL(10, 2),

    -- Dates (created_at is critical for revenue queries)
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    -- Metadata for extensibility
    metadata JSONB DEFAULT '{}'::jsonb
);

-- ==========================================================
-- 2. PERFORMANCE INDEXES FOR REVENUE QUERIES
-- ==========================================================

-- Critical indexes for revenue queries (getMonthlyRevenue function)
-- These support filtering by payer_id/payee_id, status='completed', and date range

-- Index for contractor earnings queries
CREATE INDEX IF NOT EXISTS idx_payments_payee_revenue
    ON public.payments(payee_id, status, created_at DESC)
    WHERE status = 'completed';

-- Index for homeowner spending queries
CREATE INDEX IF NOT EXISTS idx_payments_payer_revenue
    ON public.payments(payer_id, status, created_at DESC)
    WHERE status = 'completed';

-- Basic indexes (if not already exist from previous migrations)
CREATE INDEX IF NOT EXISTS idx_payments_job_id ON public.payments(job_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_payer_id ON public.payments(payer_id);
CREATE INDEX IF NOT EXISTS idx_payments_payee_id ON public.payments(payee_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent_id ON public.payments(stripe_payment_intent_id);

-- Composite index for common payment lookups
CREATE INDEX IF NOT EXISTS idx_payments_user_status
    ON public.payments(payer_id, payee_id, status, created_at DESC);

-- ==========================================================
-- 3. ROW LEVEL SECURITY POLICIES
-- ==========================================================

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to recreate them
DROP POLICY IF EXISTS "Contractors view earnings" ON public.payments;
DROP POLICY IF EXISTS "Homeowners view spending" ON public.payments;
DROP POLICY IF EXISTS "Users can view their payments as payer or payee" ON public.payments;
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
DROP POLICY IF EXISTS "Users create payments as payer" ON public.payments;
DROP POLICY IF EXISTS "Users can create payments as payer" ON public.payments;
DROP POLICY IF EXISTS "Users can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Users update own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can update their payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can manage all payments" ON public.payments;
DROP POLICY IF EXISTS "Admins full access to payments" ON public.payments;

-- Contractors can view payments where they are the payee (earnings)
CREATE POLICY "Contractors view earnings" ON public.payments
    FOR SELECT
    USING (payee_id = auth.uid());

-- Homeowners can view payments where they are the payer (spending)
CREATE POLICY "Homeowners view spending" ON public.payments
    FOR SELECT
    USING (payer_id = auth.uid());

-- Users can create payments as payer
CREATE POLICY "Users create payments as payer" ON public.payments
    FOR INSERT
    WITH CHECK (payer_id = auth.uid());

-- Users can update their own payments (payer or payee)
CREATE POLICY "Users update own payments" ON public.payments
    FOR UPDATE
    USING (payer_id = auth.uid() OR payee_id = auth.uid())
    WITH CHECK (payer_id = auth.uid() OR payee_id = auth.uid());

-- Admins can do everything
CREATE POLICY "Admins full access to payments" ON public.payments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- ==========================================================
-- 4. TRIGGERS FOR AUTOMATIC UPDATES
-- ==========================================================

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION public.update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;

-- Create trigger for updated_at
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_payments_updated_at();

-- ==========================================================
-- 5. HELPER FUNCTIONS FOR REVENUE CALCULATIONS
-- ==========================================================

-- Function to calculate net amount (amount - fees)
CREATE OR REPLACE FUNCTION public.calculate_payment_net_amount()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate net amount if not explicitly set
    IF NEW.net_amount IS NULL THEN
        NEW.net_amount = NEW.amount - COALESCE(NEW.platform_fee, 0) - COALESCE(NEW.processing_fee, 0);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS calculate_payment_net_amount_trigger ON public.payments;

-- Create trigger for net amount calculation
CREATE TRIGGER calculate_payment_net_amount_trigger
    BEFORE INSERT OR UPDATE OF amount, platform_fee, processing_fee ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_payment_net_amount();

-- ==========================================================
-- 6. UTILITY FUNCTIONS FOR REVENUE QUERIES
-- ==========================================================

-- Function to get total earnings for a contractor
CREATE OR REPLACE FUNCTION public.get_contractor_total_earnings(
    p_contractor_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS DECIMAL AS $$
BEGIN
    RETURN (
        SELECT COALESCE(SUM(amount), 0)
        FROM public.payments
        WHERE payee_id = p_contractor_id
        AND status = 'completed'
        AND (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at <= p_end_date)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get total spending for a homeowner
CREATE OR REPLACE FUNCTION public.get_homeowner_total_spending(
    p_homeowner_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS DECIMAL AS $$
BEGIN
    RETURN (
        SELECT COALESCE(SUM(amount), 0)
        FROM public.payments
        WHERE payer_id = p_homeowner_id
        AND status = 'completed'
        AND (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at <= p_end_date)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================================
-- 7. TABLE COMMENTS FOR DOCUMENTATION
-- ==========================================================

COMMENT ON TABLE public.payments IS 'Payment transactions between homeowners (payers) and contractors (payees)';
COMMENT ON COLUMN public.payments.payer_id IS 'User who pays (typically homeowner) - used for spending queries';
COMMENT ON COLUMN public.payments.payee_id IS 'User who receives payment (typically contractor) - used for earnings queries';
COMMENT ON COLUMN public.payments.amount IS 'Total payment amount in the specified currency';
COMMENT ON COLUMN public.payments.status IS 'Payment status - only "completed" payments count toward revenue';
COMMENT ON COLUMN public.payments.platform_fee IS 'Platform fee charged (typically 5% of amount)';
COMMENT ON COLUMN public.payments.net_amount IS 'Amount after deducting all fees';
COMMENT ON COLUMN public.payments.created_at IS 'Payment creation date - used for grouping by month in revenue queries';

-- ==========================================================
-- 8. GRANT PERMISSIONS
-- ==========================================================

-- Grant necessary permissions for authenticated users
GRANT SELECT ON public.payments TO authenticated;
GRANT INSERT ON public.payments TO authenticated;
GRANT UPDATE ON public.payments TO authenticated;

-- Grant permissions for service role (backend operations)
GRANT ALL ON public.payments TO service_role;

COMMIT;

-- ==========================================================
-- VERIFICATION QUERIES (Run these manually to verify)
-- ==========================================================

-- Check table exists
-- SELECT table_name, table_schema FROM information_schema.tables WHERE table_name = 'payments';

-- Check indexes
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'payments' ORDER BY indexname;

-- Check RLS policies
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'payments';

-- Test revenue query (replace USER_ID with actual UUID)
-- SELECT
--     DATE_TRUNC('month', created_at) as month,
--     SUM(amount) as total,
--     COUNT(*) as count
-- FROM public.payments
-- WHERE payee_id = 'USER_ID'
-- AND status = 'completed'
-- AND created_at >= NOW() - INTERVAL '12 months'
-- GROUP BY DATE_TRUNC('month', created_at)
-- ORDER BY month;
