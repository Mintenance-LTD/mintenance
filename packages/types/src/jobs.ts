import type { User } from './user';

// Job types
export interface Job {
  id: string;
  title: string;
  description: string;
  location: string | Record<string, unknown>; // JSONB in DB, string in some UI contexts
  homeowner_id: string; // Database field (snake_case)
  contractor_id?: string; // Database field (snake_case)
  status: 'draft' | 'posted' | 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  budget?: number; // Legacy single budget field
  budget_min?: number; // DB: budget_min DECIMAL
  budget_max?: number; // DB: budget_max DECIMAL
  created_at: string; // Database field (snake_case)
  updated_at: string; // Database field (snake_case)
  // Core MVP fields
  category?: string;
  subcategory?: string;
  priority?: 'low' | 'medium' | 'high' | 'emergency';
  urgency?: 'low' | 'medium' | 'high' | 'emergency'; // DB column name
  photos?: string[]; // Max 3 photos for MVP
  images?: string[]; // DB: images TEXT[]
  postcode?: string;
  // Computed/alias fields for UI layer (camelCase)
  homeownerId?: string; // Alias for homeowner_id
  contractorId?: string; // Alias for contractor_id
  createdAt?: string; // Alias for created_at
  updatedAt?: string; // Alias for updated_at
  // Additional relationships for display
  bids?: Bid[];
  // Geolocation fields (from geocoding or manual entry)
  latitude?: number;
  longitude?: number;
  city?: string;
  // Joined relations (populated via database joins)
  homeowner?: {
    id: string;
    first_name?: string;
    last_name?: string;
    profile_image_url?: string;
    rating?: number;
    jobs_count?: number;
    email?: string;
    city?: string;
    country?: string;
  };
  contractor?: {
    id: string;
    first_name?: string;
    last_name?: string;
    company_name?: string;
    profile_image_url?: string;
  };
  // DB timestamp fields
  published_at?: string;
  completed_at?: string;
  metadata?: Record<string, unknown>; // DB: JSONB
  // Additional computed/display fields
  timeline?: string;
  skills?: string[];
  photoUrls?: string[]; // Normalized photo URLs
}

export interface Bid {
  id: string;
  jobId: string;
  contractorId: string;
  amount: number;
  description: string;
  message?: string; // DB column name (maps to description in UI)
  createdAt: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  contractorName?: string;
  contractorEmail?: string;
  jobTitle?: string;
  jobDescription?: string;
  jobLocation?: string;
  jobBudget?: number;
  // DB-specific fields
  estimated_duration_days?: number;
  materials_included?: boolean;
  warranty_months?: number;
  // Database field aliases (snake_case)
  job_id?: string;
  contractor_id?: string;
  homeowner_id?: string;
  created_at?: string;
  updated_at?: string;
  // Joined relations
  job?: Job;
  jobs?: Job | Job[]; // Sometimes returned as array from Supabase
  contractor?: {
    id: string;
    first_name?: string;
    last_name?: string;
    company_name?: string;
    profile_image_url?: string;
  };
  homeowner?: {
    id: string;
    first_name?: string;
    last_name?: string;
    profile_image_url?: string;
  };
}

export interface ContractorSkill {
  id: string;
  contractorId: string;
  skillName: string;
  createdAt: string;
  // DB fields matching public.contractor_skills
  contractor_id?: string;
  skill_name?: string;
  skill_icon?: string;
  years_experience?: number;
  verified?: boolean;
  created_at?: string;
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
  rating: number; // DB: CHECK (rating >= 1 AND rating <= 5)
  comment?: string;
  response?: string; // DB: reviewee's response text
  createdAt: string;
  // DB field aliases (snake_case)
  job_id?: string;
  reviewer_id?: string;
  reviewee_id?: string; // DB column name (maps to reviewedId)
  created_at?: string;
  updated_at?: string;
}

// JobPhotoMetadata matching DB: public.job_photos_metadata
export type PhotoType = 'before' | 'after' | 'progress' | 'video';

export interface JobPhotoMetadata {
  id: string;
  job_id: string;
  photo_url: string;
  photo_type: PhotoType;
  geolocation?: { lat: number; lng: number; accuracy?: number };
  timestamp: string;
  verified: boolean;
  quality_score?: number; // 0-1
  angle_type?: string;
  created_at: string;
  created_by?: string;
  geolocation_verified?: boolean;
}

export interface ProjectUpdateNotification {
  id: string;
  timelineId: string;
  milestoneId?: string;
  type: 'milestone_completed' | 'milestone_overdue' | 'timeline_updated' | 'payment_due' | 'inspection_needed';
  title: string;
  message: string;
  recipients: string[];
  sentAt: string;
  readBy: string[];
  actionUrl?: string;
}
