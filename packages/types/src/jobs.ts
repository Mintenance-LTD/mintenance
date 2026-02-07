import type { User } from './user';

// Job types
export interface Job {
  id: string;
  title: string;
  description: string;
  location: string;
  homeowner_id: string; // Database field (snake_case)
  contractor_id?: string; // Database field (snake_case)
  status: 'draft' | 'open' | 'in_progress' | 'completed' | 'cancelled';
  budget: number;
  created_at: string; // Database field (snake_case)
  updated_at: string; // Database field (snake_case)
  // Core MVP fields
  category?: string;
  subcategory?: string;
  priority?: 'low' | 'medium' | 'high';
  photos?: string[]; // Max 3 photos for MVP
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
  createdAt: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  contractorName?: string;
  contractorEmail?: string;
  jobTitle?: string;
  jobDescription?: string;
  jobLocation?: string;
  jobBudget?: number;
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
  comment: string;
  createdAt: string;
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
