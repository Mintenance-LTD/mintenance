export interface ContractorVerification {
  id: string;
  email: string;
  assigned_admin_email?: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  company_name: string | null;
  license_number: string | null;
  insurance_expiry_date: string | null;
  business_address: string | null;
  admin_verified: boolean;
  background_check_status: string | null;
  trade_categories: string[];
  skills: Array<{
    skill_name: string;
    years_experience: number | null;
    verified: boolean;
  }>;
  certifications_count: number;
  rating: number;
  total_jobs_completed: number;
  city: string | null;
  created_at: string;
  updated_at: string;
  verification_status: 'ready' | 'incomplete' | 'verified' | 'rejected';
  identity_submitted: boolean;
  business_submitted: boolean;
}

export interface Stats {
  total: number | null;
  ready: number | null;
  incomplete: number | null;
  verified: number | null;
  rejected: number | null;
}

export type StatusFilter = ContractorVerification['verification_status'] | 'all';

export interface VerificationClientProps {
  initialStats: Stats;
}
