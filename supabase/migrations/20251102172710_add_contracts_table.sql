-- Migration: Add Contracts Table
-- Created: 2025-11-02
-- Description: Creates contracts table for managing agreements between contractors and homeowners

-- ============================================================================
-- CONTRACTS TABLE - For managing contracts between contractors and homeowners
-- ============================================================================
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    homeowner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Contract status
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_contractor', 'pending_homeowner', 'accepted', 'rejected', 'cancelled')),

    -- Contract terms (JSONB for flexible structure)
    terms JSONB DEFAULT '{}'::jsonb,
    
    -- Contract details
    title VARCHAR(255),
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    amount DECIMAL(10, 2) NOT NULL,
    
    -- Signatures
    contractor_signed_at TIMESTAMP WITH TIME ZONE,
    homeowner_signed_at TIMESTAMP WITH TIME ZONE,
    
    -- Contract metadata
    contract_version INTEGER DEFAULT 1,
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(job_id) -- One contract per job
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_contracts_job_id ON contracts(job_id);
CREATE INDEX IF NOT EXISTS idx_contracts_contractor_id ON contracts(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contracts_homeowner_id ON contracts(homeowner_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contracts_updated_at
    BEFORE UPDATE ON contracts
    FOR EACH ROW
    EXECUTE FUNCTION update_contracts_updated_at();

-- Comments for documentation
COMMENT ON TABLE contracts IS 'Manages contracts between contractors and homeowners for jobs';
COMMENT ON COLUMN contracts.terms IS 'JSONB object containing contract terms, pricing breakdown, and conditions';
COMMENT ON COLUMN contracts.status IS 'Contract status: draft (being created), pending_contractor/homeowner (awaiting signature), accepted (both signed), rejected/cancelled';

