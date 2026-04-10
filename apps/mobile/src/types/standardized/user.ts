/**
 * User-related standardized types
 */

// =============================================
// CORE USER TYPES
// =============================================

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'homeowner' | 'contractor';
  createdAt: string;
  updatedAt: string;
  // Optional profile fields
  latitude?: number;
  longitude?: number;
  address?: string;
  profileImageUrl?: string;
  bio?: string;
  rating?: number;
  totalJobsCompleted?: number;
  isAvailable?: boolean;
  isVerified?: boolean;
  phone?: string;
}

interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'homeowner' | 'contractor';
  phone?: string;
  address?: string;
  bio?: string;
  profileImageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================
// AUTHENTICATION TYPES
// =============================================

interface BiometricCredentials {
  email: string;
  accessToken: string;
  refreshToken: string;
}

interface AuthSession {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

// Database field mapping type
export type DatabaseUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'homeowner' | 'contractor';
  created_at: string;
  updated_at: string;
  profile_image_url?: string;
  total_jobs_completed?: number;
  is_available?: boolean;
  is_verified?: boolean;
  phone?: string;
  bio?: string;
  rating?: number;
  latitude?: number;
  longitude?: number;
  address?: string;
};

// Re-exports for backward compatibility
