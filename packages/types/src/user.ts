// Core User types
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'homeowner' | 'contractor' | 'admin';
  created_at: string;
  updated_at: string;
  verified?: boolean;
  phone?: string;
  phone_verified?: boolean;
  location?: string;
  profile_image_url?: string;
  // Computed fields for backward compatibility
  firstName?: string;
  lastName?: string;
  createdAt?: string;
  // Additional profile fields
  bio?: string;
  city?: string;
  country?: string;
  address?: string;
  postcode?: string;
  company_name?: string;
  admin_verified?: boolean;
  is_available?: boolean;
  onboarding_completed?: boolean;
  rating?: number;
  total_jobs_completed?: number;
  /** @deprecated Use total_jobs_completed */
  jobs_count?: number;
}

// Database User type (for creation)
export interface CreateUserData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: 'homeowner' | 'contractor' | 'admin';
  phone?: string;
}
