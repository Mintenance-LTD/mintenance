-- Add company_name and license_number columns to users table
-- These fields allow contractors to add their company information for verification

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS license_number VARCHAR(100);

COMMENT ON COLUMN public.users.company_name IS 'Company name of the contractor - helps build trust with homeowners';
COMMENT ON COLUMN public.users.license_number IS 'License registration number of the contractor - will be verified by admin team';

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_users_company_name ON public.users(company_name) WHERE company_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_license_number ON public.users(license_number) WHERE license_number IS NOT NULL;

