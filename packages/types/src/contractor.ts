import type { ContractorSkill, Review } from './jobs';
import type { Message } from './messaging';
import type { User } from './user';

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
