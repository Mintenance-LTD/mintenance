/**
 * Contractor profile and supporting entity types
 */

import type { User } from './user';

// =============================================
// CONTRACTOR PROFILE
// =============================================

export interface ContractorProfile extends User {
  // Business information
  companyName?: string;
  companyLogo?: string;
  businessAddress?: string;
  licenseNumber?: string;
  yearsExperience?: number;
  hourlyRate?: number;
  serviceRadius?: number; // in kilometers
  availability?: 'immediate' | 'this_week' | 'this_month' | 'busy';

  // Professional details
  specialties?: string[];
  certifications?: string[];
  portfolioImages?: string[];

  // Verification status
  licenseVerified?: boolean;
  insuranceVerified?: boolean;
  backgroundCheckStatus?: string;

  // Insurance information
  insurance?: {
    provider: string;
    policyNumber: string;
    expiryDate: string;
  };

  // Skills and reviews
  skills?: ContractorSkill[];
  reviews?: Review[];
  distance?: number;
}

// =============================================
// SUPPORTING ENTITIES
// =============================================

export interface ContractorSkill {
  id: string;
  contractorId: string;
  skillName: string;
  createdAt: string;
}

export interface Review {
  id: string;
  jobId: string;
  reviewerId: string;
  reviewedId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

interface ContractorMatch {
  id: string;
  homeownerId: string;
  contractorId: string;
  action: 'like' | 'pass';
  createdAt: string;
}

// Re-exports for backward compatibility
