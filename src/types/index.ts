export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'homeowner' | 'contractor';
  created_at: string;
  updated_at: string;
  // Optional fields
  firstName?: string; // Computed field
  lastName?: string;  // Computed field
  createdAt?: string; // Computed field
  latitude?: number;
  longitude?: number;
  address?: string;
  profileImageUrl?: string;
  bio?: string;
  rating?: number;
  totalJobsCompleted?: number;
  isAvailable?: boolean;
  phone?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'homeowner' | 'contractor';
  phone?: string;
  address?: string;
  bio?: string;
  profileImageUrl?: string;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  location: string;
  homeowner_id: string;
  contractor_id?: string;
  status: 'posted' | 'assigned' | 'in_progress' | 'completed';
  budget: number;
  created_at: string;
  updated_at: string;
  // Core MVP fields
  category?: string;
  subcategory?: string;
  priority?: 'low' | 'medium' | 'high';
  photos?: string[]; // Max 3 photos for MVP
  // Computed fields for service layer
  homeownerId?: string;
  contractorId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// AI Analysis interfaces moved to post-MVP phase
// export interface AIAnalysis { ... }
// export interface AIConcern { ... }

export interface Bid {
  id: string;
  jobId: string;
  contractorId: string;
  amount: number;
  description: string;
  createdAt: string;
  status: 'pending' | 'accepted' | 'rejected';
  contractorName?: string;
  contractorEmail?: string;
  jobTitle?: string;
  jobDescription?: string;
  jobLocation?: string;
  jobBudget?: number;
}

export interface ContractorSkill {
  id: string;
  contractorId: string;
  skillName: string;
  createdAt: string;
}

export interface ContractorMatch {
  id: string;
  homeownerId: string;
  contractorId: string;
  action: 'like' | 'pass';
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

export interface ContractorProfile extends User {
  skills: ContractorSkill[];
  reviews: Review[];
  distance?: number;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
}

// Contractor Social features
export type ContractorPostType = 'project_showcase' | 'tip' | 'before_after' | 'milestone';

export interface ContractorPost {
  id: string;
  contractorId: string;
  type: ContractorPostType;
  content: string;
  photos?: string[];
  likes: number;
  comments: number;
  shares: number;
  hashtags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ContractorPostComment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface ContractorFollow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

export interface ContractorEndorsement {
  id: string;
  contractorId: string;
  endorserId: string;
  skillName: string;
  createdAt: string;
}

// Additional types for biometric authentication
export interface BiometricCredentials {
  email: string;
  hashedToken: string;
}

// Notification types
export interface NotificationBehavior {
  shouldShowAlert: boolean;
  shouldPlaySound: boolean;
  shouldSetBadge: boolean;
  shouldShowBanner: boolean;
  shouldShowList: boolean;
}

// Global declarations
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_SUPABASE_URL: string;
      EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
      EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string;
      STRIPE_SECRET_KEY?: string;
      NODE_ENV: 'development' | 'production' | 'test';
    }
  }
}