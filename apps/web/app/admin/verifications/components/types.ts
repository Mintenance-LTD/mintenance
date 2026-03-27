export interface ContractorVerification {
  id: string;
  email: string;
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
  verification_status: 'pending' | 'verified' | 'rejected';
}

export interface Stats {
  total: number;
  pending: number;
  verified: number;
  rejected: number;
}

export type StatusFilter = 'pending' | 'verified' | 'rejected' | 'all';

export interface VerificationClientProps {
  initialStats: Stats;
}
