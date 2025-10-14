// Shared TypeScript types for Mintenance apps

// Core User types
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'homeowner' | 'contractor' | 'admin';
  created_at: string;
  updated_at: string;
  email_verified?: boolean;
  phone?: string;
  // Computed fields for backward compatibility
  firstName?: string;
  lastName?: string;
  createdAt?: string;
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

// Authentication types
export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: 'homeowner' | 'contractor' | 'admin';
  phone?: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Rate limiting types
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

// JWT Payload
export interface JWTPayload {
  sub: string; // user ID
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
  iat: number;
  exp: number;
}

// Job types
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
  comment: string;
  createdAt: string;
}

// Location types
export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
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
  yearsExperience?: number;
  hourlyRate?: number;
  portfolioImages?: string[];
  specialties?: string[];
  serviceRadius?: number; // in kilometers
  availability?: 'immediate' | 'this_week' | 'this_month' | 'busy';
  certifications?: string[];
  // Additional fields for UI compatibility
  rating?: number;
  profileImageUrl?: string;
  totalJobsCompleted?: number;
}

// Messaging types
export interface Message {
  id: string;
  jobId: string;
  senderId: string;
  receiverId: string;
  messageText: string;
  messageType: 'text' | 'image' | 'file' | 'video_call_invitation' | 'video_call_started' | 'video_call_ended' | 'video_call_missed';
  attachmentUrl?: string;
  read: boolean;
  createdAt: string;
  // Video call specific fields
  callId?: string;
  callDuration?: number;
  // Populated fields
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

// Enhanced Video call types
export interface VideoCall {
  id: string;
  jobId?: string;
  initiatorId: string;
  participantId: string;
  title: string;
  description?: string;
  status: 'scheduled' | 'pending' | 'active' | 'ended' | 'missed' | 'cancelled';
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;
  duration?: number; // in seconds
  recordingUrl?: string;
  roomId?: string;
  accessToken?: string;
  type: 'consultation' | 'assessment' | 'project_review' | 'emergency' | 'follow_up';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
  // Populated fields
  initiator?: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  participant?: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  job?: {
    title: string;
    category: string;
  };
}

export interface VideoCallParticipant {
  id: string;
  callId: string;
  userId: string;
  joinedAt?: string;
  leftAt?: string;
  connectionStatus: 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenShareEnabled: boolean;
  role: 'host' | 'participant';
}

export interface VideoCallSettings {
  id: string;
  userId: string;
  autoJoinAudio: boolean;
  autoJoinVideo: boolean;
  preferredCamera?: string;
  preferredMicrophone?: string;
  recordingEnabled: boolean;
  notificationEnabled: boolean;
  maxCallDuration: number; // in minutes
  allowScreenShare: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CallQualityMetrics {
  id: string;
  callId: string;
  userId: string;
  audioQuality: 'poor' | 'fair' | 'good' | 'excellent';
  videoQuality: 'poor' | 'fair' | 'good' | 'excellent';
  connectionStability: 'unstable' | 'fair' | 'stable' | 'excellent';
  latencyMs: number;
  packetsLost: number;
  bandwidth: number; // in kbps
  timestamp: string;
}

export interface VideoCallInvitation {
  id: string;
  callId: string;
  fromUserId: string;
  toUserId: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: string;
  respondedAt?: string;
  createdAt: string;
}

// Payment types
export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status:
    | 'requires_payment_method'
    | 'requires_confirmation'
    | 'succeeded'
    | 'canceled';
  client_secret: string;
}

export interface EscrowTransaction {
  id: string;
  jobId: string;
  payerId: string;
  payeeId: string;
  amount: number;
  status: 'pending' | 'held' | 'released' | 'refunded';
  createdAt: string;
  updatedAt: string;
  paymentIntentId?: string;
  releasedAt?: string;
  refundedAt?: string;
  // Populated fields
  job?: {
    title: string;
    description: string;
  };
  payer?: {
    first_name: string;
    last_name: string;
  };
  payee?: {
    first_name: string;
    last_name: string;
  };
}

export interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  billing_details?: {
    name?: string;
    email?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
    };
  };
}

export interface FeeCalculation {
  platformFee: number;
  stripeFee: number;
  contractorAmount: number;
  totalFees: number;
}

export interface ContractorPayoutAccount {
  id: string;
  contractorId: string;
  stripeAccountId: string;
  accountComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

// Advanced Search Types
export interface LocationRadius {
  latitude: number;
  longitude: number;
  radiusMiles: number;
  address?: string;
}

export interface PriceRange {
  min: number;
  max: number;
  currency: 'USD';
}

export interface SkillLevel {
  skill: string;
  level: 'beginner' | 'intermediate' | 'expert';
  yearsExperience?: number;
}

export interface AdvancedSearchFilters {
  // Location-based filtering
  location?: LocationRadius;

  // Price-based filtering
  priceRange?: PriceRange;

  // Skill-based filtering
  skills: string[];
  skillLevels?: SkillLevel[];

  // Rating and experience
  minRating?: number;
  minJobsCompleted?: number;

  // Availability filtering
  availability: 'immediate' | 'this_week' | 'this_month' | 'flexible';

  // Project type filtering
  projectTypes: string[];
  projectComplexity?: 'simple' | 'medium' | 'complex';

  // Time-based filtering
  urgency?: 'emergency' | 'urgent' | 'normal' | 'flexible';
  estimatedDuration?: number; // in hours

  // Additional filters
  hasInsurance?: boolean;
  isBackgroundChecked?: boolean;
  hasPortfolio?: boolean;
  responseTimeHours?: number;
}

export interface SearchResult<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
  facets?: SearchFacets;
  suggestions?: string[];
}

export interface SearchFacets {
  skills: { [key: string]: number };
  priceRanges: { [key: string]: number };
  ratings: { [key: string]: number };
  locations: { [key: string]: number };
  availability: { [key: string]: number };
}

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  filters: AdvancedSearchFilters;
  alertEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SearchAnalytics {
  userId: string;
  searchQuery: string;
  filters: AdvancedSearchFilters;
  resultsCount: number;
  clickedResults: string[];
  timestamp: string;
  sessionId: string;
}

// Project Timeline & Milestone Types
export interface ProjectTimeline {
  id: string;
  jobId: string;
  title: string;
  description?: string;
  startDate: string;
  estimatedEndDate: string;
  actualEndDate?: string;
  status: 'planning' | 'active' | 'paused' | 'completed' | 'cancelled';
  progress: number; // 0-100 percentage
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Populated fields
  job?: Job;
  milestones?: ProjectMilestone[];
  totalMilestones?: number;
  completedMilestones?: number;
}

export interface ProjectMilestone {
  id: string;
  timelineId: string;
  jobId: string;
  title: string;
  description?: string;
  targetDate: string;
  completedDate?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  type: 'task' | 'checkpoint' | 'payment' | 'inspection' | 'delivery';
  assignedTo?: string;
  estimatedHours?: number;
  actualHours?: number;
  paymentAmount?: number;
  dependencies?: string[]; // Array of milestone IDs that must be completed first
  attachments?: MilestoneAttachment[];
  notes?: MilestoneNote[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Populated fields
  assignee?: User;
  dependsOn?: ProjectMilestone[];
  blocking?: ProjectMilestone[];
}

export interface MilestoneAttachment {
  id: string;
  milestoneId: string;
  filename: string;
  originalName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: string;
  description?: string;
}

export interface MilestoneNote {
  id: string;
  milestoneId: string;
  content: string;
  type: 'note' | 'update' | 'issue' | 'resolution';
  visibility: 'public' | 'contractor_only' | 'homeowner_only';
  authorId: string;
  createdAt: string;
  updatedAt: string;
  // Populated fields
  author?: User;
}

export interface ProjectProgress {
  timelineId: string;
  totalMilestones: number;
  completedMilestones: number;
  overdueMilestones: number;
  upcomingMilestones: number;
  progressPercentage: number;
  estimatedCompletion: string;
  isOnTrack: boolean;
  daysRemaining?: number;
  daysOverdue?: number;
}

export interface TimelineTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  estimatedDuration: number; // in days
  milestoneTemplates: MilestoneTemplate[];
  createdBy: string;
  isPublic: boolean;
  usageCount: number;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

export interface MilestoneTemplate {
  id: string;
  templateId: string;
  title: string;
  description?: string;
  type: ProjectMilestone['type'];
  priority: ProjectMilestone['priority'];
  dayOffset: number; // Days from project start
  estimatedHours?: number;
  paymentPercentage?: number; // Percentage of total job budget
  dependencies?: number[]; // Array of milestone template indices
  isRequired: boolean;
  order: number;
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

export interface ProjectAnalytics {
  timelineId: string;
  totalDuration: number; // actual days taken
  estimatedVsActualTime: {
    estimated: number;
    actual: number;
    variance: number;
  };
  milestonePerformance: {
    onTime: number;
    late: number;
    early: number;
    cancelled: number;
  };
  budgetTracking: {
    totalBudget: number;
    spentAmount: number;
    remainingAmount: number;
    milestonePayments: number;
    pendingPayments: number;
  };
  bottlenecks: ProjectBottleneck[];
  recommendations: string[];
}

export interface ProjectBottleneck {
  milestoneId: string;
  milestoneName: string;
  delayDays: number;
  impact: 'low' | 'medium' | 'high';
  reason: string;
  suggestedAction: string;
}