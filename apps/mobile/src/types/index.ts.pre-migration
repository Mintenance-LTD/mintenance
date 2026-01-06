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
  lastName?: string; // Computed field
  createdAt?: string; // Computed field
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
  homeowner_id: string; // Database field (snake_case)
  contractor_id?: string; // Database field (snake_case)
  status: 'posted' | 'assigned' | 'in_progress' | 'completed';
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
  // Enhanced profile fields for discovery card
  companyName?: string;
  companyLogo?: string;
  businessAddress?: string;
  licenseNumber?: string;
  yearsExperience?: number;
  hourlyRate?: number;
  portfolioImages?: string[];
  specialties?: string[];
  serviceRadius?: number; // in kilometers
  availability?: 'immediate' | 'this_week' | 'this_month' | 'busy';
  certifications?: string[];
  insurance?: {
    provider: string;
    policyNumber: string;
    expiryDate: string;
  };
}

export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
}

// Contractor Social features
export type ContractorPostType =
  | 'project_showcase'
  | 'tip'
  | 'before_after'
  | 'milestone';

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

// Mutual Connections Types
export type ConnectionStatus = 'pending' | 'accepted' | 'blocked';

export interface MutualConnection {
  id: string;
  requesterId: string;
  receiverId: string;
  status: ConnectionStatus;
  requestedAt: string;
  acceptedAt?: string;
  requester?: User;
  receiver?: User;
}

export interface ConnectionRequest {
  id: string;
  requesterId: string;
  receiverId: string;
  message?: string;
  status: ConnectionStatus;
  createdAt: string;
  requester: User;
}

export interface Message {
  id: string;
  jobId: string;
  senderId: string;
  receiverId: string;
  messageText: string;
  messageType: 'text' | 'image' | 'file';
  attachmentUrl?: string;
  read: boolean;
  createdAt: string;
  senderName?: string;
  senderRole?: string;
}

export interface MessageThread {
  jobId: string;
  jobTitle: string;
  lastMessage?: Message;
  unreadCount: number;
  participants: {
    id: string;
    name: string;
    role: string;
  }[];
}

// Additional types for biometric authentication
export interface BiometricCredentials {
  email: string;
  accessToken: string;
  refreshToken: string;
}

// Notification types
export interface NotificationBehavior {
  shouldShowAlert: boolean;
  shouldPlaySound: boolean;
  shouldSetBadge: boolean;
  shouldShowBanner: boolean;
  shouldShowList: boolean;
}

// Meeting and Scheduling types
export interface ContractorMeeting {
  id: string;
  jobId: string;
  homeownerId: string;
  contractorId: string;
  scheduledDateTime: string;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled';
  meetingType: 'site_visit' | 'consultation' | 'work_session';
  location: LocationData;
  duration: number; // Duration in minutes
  notes?: string;
  estimatedArrival?: string;
  actualArrival?: string;
  createdAt: string;
  updatedAt: string;
  // Expanded details
  homeowner?: User;
  contractor?: User;
  job?: Job;
}

export interface MeetingUpdate {
  id: string;
  meetingId: string;
  updateType: 'schedule_change' | 'location_update' | 'status_change' | 'arrival_notification';
  message: string;
  updatedBy: string;
  timestamp: string;
  oldValue?: any;
  newValue?: any;
}

export interface ContractorLocation {
  id: string;
  contractorId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  isActive: boolean;
  meetingId?: string;
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
