import type { ContractorSkill, Review } from './jobs';
import type { Message } from './messaging';
import type { User } from './user';

// ContractorCertification matching DB: public.contractor_certifications
export interface ContractorCertification {
  id: string;
  contractor_id: string;
  name: string;
  issuing_body?: string;
  certificate_number?: string;
  issue_date?: string;
  expiry_date?: string;
  document_url?: string;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

// LicenseVerification matching DB: public.license_verifications
export type VerificationStatus = 'pending' | 'verified' | 'failed' | 'expired';
export type VerificationMethod = 'manual' | 'api_lookup' | 'document_upload';

export interface LicenseVerification {
  id: string;
  contractor_id: string;
  license_type: string;
  license_number: string;
  trade_body?: string;
  holder_name?: string;
  status: VerificationStatus;
  verification_method: VerificationMethod;
  verified_at?: string;
  expires_at?: string;
  document_url?: string;
  external_lookup_data?: Record<string, unknown>;
  admin_reviewer_id?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

// InsuranceVerification matching DB: public.insurance_verifications
export interface InsuranceVerification {
  id: string;
  contractor_id: string;
  insurance_type: string;
  provider_name: string;
  policy_number?: string;
  coverage_amount?: number;
  excess_amount?: number;
  status: VerificationStatus;
  verification_method: 'document_upload' | 'manual';
  verified_at?: string;
  policy_start_date?: string;
  policy_expiry_date: string;
  document_url: string;
  admin_reviewer_id?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

// Contractor types
export interface ContractorProfile extends User {
  skills: ContractorSkill[];
  reviews: Review[];
  distance?: number;
  // Enhanced profile fields for discovery card
  companyName?: string;
  companyLogo?: string;
  businessAddress?: string;
  licenseNumber?: string;
  license_number?: string; // Database field alias
  yearsExperience?: number;
  years_experience?: number; // Database field alias
  hourlyRate?: number;
  hourly_rate?: number; // Database field alias
  portfolioImages?: string[];
  specialties?: string[];
  serviceRadius?: number; // in kilometers
  availability?: 'immediate' | 'this_week' | 'this_month' | 'busy';
  is_available?: boolean; // Database field
  certifications?: string[];
  // Additional fields for UI compatibility
  lastMessage?: Message;
  unreadCount?: number;
  participants?: {
    id: string;
    name: string;
    role: string;
  }[];
  // Geolocation
  latitude?: number;
  longitude?: number;
  // Stats
  total_jobs_completed?: number;
}
