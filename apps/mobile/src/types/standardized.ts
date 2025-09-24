/**
 * Standardized Application Types
 *
 * This file defines all application types using consistent camelCase naming.
 * Database conversion is handled transparently by fieldMapper utilities.
 *
 * Naming Convention: camelCase everywhere
 * - firstName (not first_name)
 * - homeownerId (not homeowner_id)
 * - createdAt (not created_at)
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
  createdAt: string;
  updatedAt: string;
}

// =============================================
// JOB MANAGEMENT TYPES
// =============================================

export interface Job {
  id: string;
  title: string;
  description: string;
  location: string;
  homeownerId: string;
  contractorId?: string;
  status: 'posted' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  budget: number;
  createdAt: string;
  updatedAt: string;
  // Additional fields
  category?: string;
  subcategory?: string;
  priority?: 'low' | 'medium' | 'high';
  photos?: string[];
  // Relationships
  bids?: Bid[];
  homeowner?: User;
  contractor?: User;
}

export interface Bid {
  id: string;
  jobId: string;
  contractorId: string;
  amount: number;
  description: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt?: string;
  // Relationships
  contractor?: User;
  job?: Job;
}

// =============================================
// MESSAGING TYPES
// =============================================

export type MessageType =
  | 'text'
  | 'image'
  | 'file'
  | 'video_call_invitation'
  | 'video_call_started'
  | 'video_call_ended'
  | 'video_call_missed';

export interface Message {
  id: string;
  jobId: string;
  senderId: string;
  receiverId: string;
  messageText: string;
  messageType: MessageType;
  attachmentUrl?: string;
  read: boolean;
  createdAt: string;
  syncedAt?: string;
  // Computed fields
  senderName?: string;
  senderRole?: string;
  // Video call specific fields
  callId?: string;
  callDuration?: number;
  // Relationships
  sender?: User;
  receiver?: User;
  job?: Job;
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

export interface ContractorMatch {
  id: string;
  homeownerId: string;
  contractorId: string;
  action: 'like' | 'pass';
  createdAt: string;
}

// =============================================
// LOCATION AND MEETING
// =============================================

export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface Meeting {
  id: string;
  jobId: string;
  homeownerId: string;
  contractorId: string;
  scheduledDateTime: string;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  meetingType: 'site_visit' | 'consultation' | 'work_session';
  location?: LocationData;
  duration?: number; // in minutes
  notes?: string;
  estimatedArrival?: string;
  actualArrival?: string;
  createdAt: string;
  updatedAt: string;
  // Relationships
  job?: Job;
  homeowner?: User;
  contractor?: User;
}

// =============================================
// SOCIAL FEATURES
// =============================================

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
  // Relationships
  contractor?: User;
}

export interface ContractorPostComment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
  // Relationships
  user?: User;
}

// =============================================
// CONNECTIONS
// =============================================

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

// =============================================
// NOTIFICATIONS
// =============================================

export interface NotificationSettings {
  jobUpdates: boolean;
  messages: boolean;
  payments: boolean;
  reminders: boolean;
  system: boolean;
}

export interface PushNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'job' | 'message' | 'payment' | 'reminder' | 'system';
  actionUrl?: string;
  read: boolean;
  createdAt: string;
}

// =============================================
// API RESPONSES
// =============================================

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  success: boolean;
  message?: string;
}

// =============================================
// FORM TYPES
// =============================================

export interface CreateJobForm {
  title: string;
  description: string;
  location: string;
  budget: number;
  category?: string;
  subcategory?: string;
  priority?: 'low' | 'medium' | 'high';
  photos?: string[];
}

export interface CreateBidForm {
  jobId: string;
  amount: number;
  description: string;
}

export interface UpdateUserProfileForm {
  firstName?: string;
  lastName?: string;
  phone?: string;
  bio?: string;
  address?: string;
  profileImageUrl?: string;
}

// =============================================
// TYPE GUARDS
// =============================================

export function isUser(obj: any): obj is User {
  return obj && typeof obj.id === 'string' && typeof obj.email === 'string';
}

export function isJob(obj: any): obj is Job {
  return obj && typeof obj.id === 'string' && typeof obj.title === 'string';
}

export function isBid(obj: any): obj is Bid {
  return obj && typeof obj.id === 'string' && typeof obj.jobId === 'string';
}

export function isMessage(obj: any): obj is Message {
  return obj && typeof obj.id === 'string' && typeof obj.messageText === 'string';
}

// =============================================
// VALIDATION TYPES
// =============================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FieldValidation {
  field: string;
  rules: string[];
  message?: string;
}

// =============================================
// SEARCH & FILTER TYPES
// =============================================

export interface JobSearchFilters {
  category?: string;
  minBudget?: number;
  maxBudget?: number;
  status?: Job['status'];
  location?: LocationData;
  radius?: number;
}

export interface ContractorSearchFilters {
  skills?: string[];
  minRating?: number;
  availability?: ContractorProfile['availability'];
  location?: LocationData;
  radius?: number;
  priceRange?: {
    min: number;
    max: number;
  };
}

// =============================================
// UTILITY TYPES
// =============================================

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Database field mapping types for conversion
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

export type DatabaseJob = {
  id: string;
  title: string;
  description: string;
  location: string;
  homeowner_id: string;
  contractor_id?: string;
  status: Job['status'];
  budget: number;
  created_at: string;
  updated_at: string;
  category?: string;
  subcategory?: string;
  priority?: Job['priority'];
  photos?: string[];
};

export type DatabaseMessage = {
  id: string;
  job_id: string;
  sender_id: string;
  receiver_id: string;
  message_text: string;
  message_type: MessageType;
  attachment_url?: string;
  read: boolean;
  created_at: string;
  synced_at?: string;
  call_id?: string;
  call_duration?: number;
};

// =============================================
// RE-EXPORTS FOR BACKWARD COMPATIBILITY
// =============================================

// Export all types with both original and standardized names
export type { User as UserProfile2 };
export type { Job as JobData };
export type { Message as ChatMessage };
export type { ContractorProfile as EnhancedContractor };

// Authentication types
export interface BiometricCredentials {
  email: string;
  accessToken: string;
  refreshToken: string;
}

export interface AuthSession {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}
