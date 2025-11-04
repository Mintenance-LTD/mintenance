-- Migration: Add Company Info to Contracts Table
-- Created: 2025-11-03
-- Description: Adds contractor company name and license registration fields to contracts table for homeowner trust and verification

-- ============================================================================
-- ADD COMPANY INFO COLUMNS TO CONTRACTS TABLE
-- ============================================================================

ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS contractor_company_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS contractor_license_registration VARCHAR(100),
ADD COLUMN IF NOT EXISTS contractor_license_type VARCHAR(50);

-- Comments for documentation
COMMENT ON COLUMN contracts.contractor_company_name IS 'Company name of the contractor creating the contract - visible to homeowners for trust';
COMMENT ON COLUMN contracts.contractor_license_registration IS 'License registration number of the contractor - required for homeowner verification';
COMMENT ON COLUMN contracts.contractor_license_type IS 'Type/category of license (e.g., "General Contractor", "Electrical", "Plumbing") - optional categorization';

