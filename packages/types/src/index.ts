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
  company_name?: string;
  admin_verified?: boolean;
  rating?: number;
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
  status: 'pending' | 'accepted' | 'rejected';
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

// Location types
export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
}

// Message types
export interface Message {
  id: string;
  jobId?: string;
  senderId: string;
  receiverId: string;
  messageText?: string;
  content?: string;
  messageType?: 'text' | 'image' | 'file' | 'video_call_invitation' | 'video_call_started' | 'video_call_ended' | 'video_call_missed' | 'contract_submitted';
  attachmentUrl?: string;
  callId?: string;
  callDuration?: number;
  read?: boolean;
  createdAt: string;
  syncedAt?: string;
  senderName?: string;
  senderRole?: string;
  // Relationships
  sender?: User;
  receiver?: User;
  job?: Job;
}

export interface MessageThread {
  jobId: string;
  jobTitle: string;
  participants: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  unreadCount: number;
  lastMessage?: Message;
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

// =====================================================
// LinkedIn Parity Features - Groups, Articles, Companies
// =====================================================

// ===== GROUPS =====
export type TradeType =
  | 'electricians'
  | 'plumbers'
  | 'carpenters'
  | 'hvac'
  | 'painters'
  | 'landscapers'
  | 'roofers'
  | 'builders'
  | 'tilers'
  | 'decorators'
  | 'handymen'
  | 'cleaners'
  | 'general'
  | 'multi_trade';

export type GroupLocationType = 'global' | 'country' | 'region' | 'city' | 'local';

export interface ContractorGroup {
  id: string;
  name: string;
  slug: string;
  description: string;
  tradeType: TradeType;
  isPrivate: boolean;
  requiresApproval: boolean;
  coverImage?: string;
  groupIcon?: string;
  createdBy: string;
  locationType?: GroupLocationType;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  memberCount: number;
  postCount: number;
  activeMembers30d: number;
  rules?: string;
  welcomeMessage?: string;
  tags: string[];
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export type GroupMemberRole = 'admin' | 'moderator' | 'member';
export type GroupMemberStatus = 'pending' | 'active' | 'banned' | 'left';

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: GroupMemberRole;
  status: GroupMemberStatus;
  joinMessage?: string;
  approvedBy?: string;
  approvedAt?: string;
  postsCount: number;
  commentsCount: number;
  lastActiveAt: string;
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  joinedAt: string;
  leftAt?: string;
  user?: User;
}

export type GroupDiscussionType =
  | 'discussion'
  | 'question'
  | 'announcement'
  | 'event'
  | 'job_posting'
  | 'resource';

export interface GroupDiscussion {
  id: string;
  groupId: string;
  authorId: string;
  title: string;
  content: string;
  contentHtml?: string;
  postType: GroupDiscussionType;
  images: string[];
  attachments: Array<{ name: string; url: string; type: string; size: number }>;
  isPinned: boolean;
  isLocked: boolean;
  isHidden: boolean;
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  sharesCount: number;
  hasAcceptedAnswer: boolean;
  acceptedAnswerId?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  author?: User;
  liked?: boolean;
}

export interface GroupDiscussionComment {
  id: string;
  discussionId: string;
  authorId: string;
  commentText: string;
  commentHtml?: string;
  parentCommentId?: string;
  isAcceptedAnswer: boolean;
  images: string[];
  likesCount: number;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
  author?: User;
  liked?: boolean;
}

export type GroupEventType =
  | 'meetup'
  | 'workshop'
  | 'training'
  | 'networking'
  | 'conference'
  | 'webinar'
  | 'social'
  | 'other';

export type GroupEventLocationType = 'in_person' | 'virtual' | 'hybrid';
export type GroupEventStatus = 'draft' | 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

export interface GroupEvent {
  id: string;
  groupId: string;
  createdBy: string;
  title: string;
  description: string;
  eventType: GroupEventType;
  locationType: GroupEventLocationType;
  locationName?: string;
  locationAddress?: string;
  latitude?: number;
  longitude?: number;
  meetingUrl?: string;
  meetingPlatform?: string;
  startDate: string;
  endDate: string;
  timezone: string;
  maxAttendees?: number;
  currentAttendees: number;
  requiresRegistration: boolean;
  registrationDeadline?: string;
  status: GroupEventStatus;
  coverImage?: string;
  createdAt: string;
  updatedAt: string;
}

export type EventAttendeeStatus = 'going' | 'maybe' | 'not_going' | 'waitlist';

export interface GroupEventAttendee {
  id: string;
  eventId: string;
  userId: string;
  status: EventAttendeeStatus;
  guestCount: number;
  notes?: string;
  registeredAt: string;
  updatedAt: string;
  user?: User;
}

// ===== ARTICLES =====
export type ArticleStatus = 'draft' | 'published' | 'archived' | 'scheduled';
export type ArticleCategory =
  | 'tips_and_tricks'
  | 'how_to_guides'
  | 'industry_news'
  | 'case_studies'
  | 'business_advice'
  | 'tool_reviews'
  | 'safety_regulations'
  | 'opinion';

export interface ContractorArticle {
  id: string;
  authorId: string;
  title: string;
  subtitle?: string;
  slug: string;
  contentMarkdown: string;
  contentHtml?: string;
  excerpt?: string;
  featuredImage?: string;
  featuredImageCaption?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords: string[];
  status: ArticleStatus;
  publishedAt?: string;
  scheduledPublishAt?: string;
  category?: ArticleCategory;
  tags: string[];
  readTimeMinutes?: number;
  wordCount?: number;
  viewsCount: number;
  uniqueViewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  bookmarksCount: number;
  isFeatured: boolean;
  featuredAt?: string;
  isHidden: boolean;
  editorsPick: boolean;
  createdAt: string;
  updatedAt: string;
  lastEditedAt?: string;
  author?: User;
  liked?: boolean;
  bookmarked?: boolean;
}

export interface ArticleComment {
  id: string;
  articleId: string;
  authorId: string;
  commentText: string;
  commentHtml?: string;
  parentCommentId?: string;
  likesCount: number;
  isHidden: boolean;
  isFlagged: boolean;
  createdAt: string;
  updatedAt: string;
  author?: User;
  liked?: boolean;
}

export interface ArticleSeries {
  id: string;
  authorId: string;
  title: string;
  slug: string;
  description?: string;
  coverImage?: string;
  articlesCount: number;
  createdAt: string;
  updatedAt: string;
  articles?: ContractorArticle[];
}

// ===== COMPANIES =====
export type CompanyType =
  | 'sole_trader'
  | 'partnership'
  | 'limited_company'
  | 'llp'
  | 'franchise'
  | 'other';

export type CompanyEmployeeCount = '1' | '2-5' | '6-10' | '11-20' | '21-50' | '51-100' | '100+';

export interface ContractorCompany {
  id: string;
  ownerId: string;
  companyName: string;
  slug: string;
  tagline?: string;
  description: string;
  companyType?: CompanyType;
  logoUrl?: string;
  coverImage?: string;
  brandColors: {
    primary: string;
    secondary: string;
  };
  email?: string;
  phone?: string;
  website?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  businessHours: Array<{
    day: string;
    open: string;
    close: string;
    closed: boolean;
  }>;
  servicesOffered: string[];
  specialties: string[];
  certifications: string[];
  yearEstablished?: number;
  employeeCount?: CompanyEmployeeCount;
  companyRegistrationNumber?: string;
  vatNumber?: string;
  socialMedia: {
    facebook?: string;
    linkedin?: string;
    instagram?: string;
    twitter?: string;
  };
  teamMemberCount: number;
  followerCount: number;
  postCount: number;
  averageRating: number;
  totalJobsCompleted: number;
  isVerified: boolean;
  verifiedAt?: string;
  verificationBadge?: 'verified' | 'premium' | 'featured';
  isActive: boolean;
  isFeatured: boolean;
  isHiring: boolean;
  createdAt: string;
  updatedAt: string;
  owner?: User;
  following?: boolean;
}

export type CompanyTeamRole = 'owner' | 'admin' | 'member';

// Subscription types for scheduling/maintenance
export interface Subscription {
  id: string;
  name?: string;
  next_billing_date: string | null;
  status: string;
  created_at: string;
  user_id?: string;
}

// Google Places API response types
export interface PlaceSuggestion {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

// Meeting types for scheduling
export interface ContractorMeeting {
  id: string;
  job_id?: string;
  contractor_id: string;
  homeowner_id?: string;
  meeting_type: 'site_visit' | 'consultation' | 'work_session';
  scheduled_datetime: string;
  status: string;
  contractor?: User;
  homeowner?: User;
  job?: {
    id: string;
    title: string;
  };
}

// Notification types
export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  action_url?: string;
  metadata?: Record<string, unknown>;
}

// Error types
export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
  details?: unknown;
}
export type CompanyEmploymentType = 'full_time' | 'part_time' | 'contract' | 'apprentice';
export type CompanyTeamStatus = 'active' | 'inactive' | 'invited' | 'left';

export interface CompanyTeamMember {
  id: string;
  companyId: string;
  userId: string;
  position: string;
  role: CompanyTeamRole;
  employmentType?: CompanyEmploymentType;
  department?: string;
  startDate?: string;
  endDate?: string;
  bio?: string;
  showOnPage: boolean;
  displayOrder: number;
  canPost: boolean;
  canManageTeam: boolean;
  status: CompanyTeamStatus;
  invitedAt?: string;
  joinedAt?: string;
  leftAt?: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

export type CompanyUpdateType =
  | 'update'
  | 'job_posting'
  | 'project_showcase'
  | 'announcement'
  | 'milestone'
  | 'team_update'
  | 'news';

export interface CompanyUpdate {
  id: string;
  companyId: string;
  authorId: string;
  postType: CompanyUpdateType;
  title?: string;
  content: string;
  contentHtml?: string;
  images: string[];
  videoUrl?: string;
  jobTitle?: string;
  jobDescription?: string;
  jobLocation?: string;
  jobType?: string;
  applyUrl?: string;
  applicationDeadline?: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  isPinned: boolean;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
  author?: User;
  liked?: boolean;
}

export interface CompanyReview {
  id: string;
  companyId: string;
  reviewerId: string;
  jobId?: string;
  rating: number;
  title?: string;
  reviewText: string;
  qualityRating?: number;
  professionalismRating?: number;
  valueRating?: number;
  communicationRating?: number;
  companyResponse?: string;
  responseDate?: string;
  isVerified: boolean;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
  reviewer?: User;
}

// =====================================================
// Additional Utility Types for Type Safety
// =====================================================

/**
 * Paginated API response wrapper
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Form data record for handling form submissions
 */
export interface FormDataRecord {
  [key: string]: string | number | boolean | null | undefined | File | FileList;
}

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  error: string;
  message?: string;
  details?: Record<string, unknown>;
  statusCode?: number;
}

/**
 * Property type for homeowners
 */
export interface Property {
  id: string;
  homeowner_id: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  county?: string;
  postcode: string;
  country: string;
  property_type: 'house' | 'flat' | 'bungalow' | 'maisonette' | 'other';
  bedrooms?: number;
  bathrooms?: number;
  year_built?: number;
  square_footage?: number;
  latitude?: number;
  longitude?: number;
  photos?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Quote/Estimate from contractor
 */
export interface Quote {
  id: string;
  job_id: string;
  contractor_id: string;
  homeowner_id: string;
  amount: number;
  currency: string;
  description: string;
  line_items?: QuoteLineItem[];
  valid_until: string;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';
  notes?: string;
  terms_and_conditions?: string;
  created_at: string;
  updated_at: string;
  // Populated fields
  job?: Job;
  contractor?: User;
  homeowner?: User;
}

export interface QuoteLineItem {
  id: string;
  quote_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  category?: string;
}

/**
 * Contract between homeowner and contractor
 */
export interface Contract {
  id: string;
  job_id: string;
  quote_id?: string;
  contractor_id: string;
  homeowner_id: string;
  title: string;
  description: string;
  total_amount: number;
  currency: string;
  start_date?: string;
  end_date?: string;
  status: 'draft' | 'pending_signature' | 'active' | 'completed' | 'cancelled' | 'disputed';
  contractor_signed_at?: string;
  homeowner_signed_at?: string;
  terms: string;
  created_at: string;
  updated_at: string;
  // Populated fields
  job?: Job;
  contractor?: User;
  homeowner?: User;
}

/**
 * Testimonial/Review from homeowner
 */
export interface Testimonial {
  id: string;
  contractor_id: string;
  homeowner_id: string;
  job_id?: string;
  rating: number;
  title?: string;
  content: string;
  response?: string;
  response_date?: string;
  is_featured: boolean;
  is_verified: boolean;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
  // Populated fields
  contractor?: User;
  homeowner?: User;
  job?: Job;
}

/**
 * Schedule/Appointment for jobs
 */
export interface Schedule {
  id: string;
  job_id: string;
  contractor_id: string;
  homeowner_id: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  type: 'site_visit' | 'consultation' | 'work_session' | 'inspection' | 'follow_up';
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  location?: string;
  reminder_sent: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Financial summary for dashboards
 */
export interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  pendingPayments: number;
  completedPayments: number;
  averageJobValue: number;
  revenueByMonth: { month: string; amount: number }[];
  expensesByCategory: { category: string; amount: number }[];
  currency: string;
  period: {
    start: string;
    end: string;
  };
}

/**
 * Pricing plan for subscriptions
 */
export interface PricingPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  features: string[];
  limits: {
    jobs_per_month?: number;
    bids_per_month?: number;
    photos_per_job?: number;
    team_members?: number;
  };
  is_popular: boolean;
  is_active: boolean;
  stripe_price_id_monthly?: string;
  stripe_price_id_yearly?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Customer (homeowner from contractor's perspective)
 */
export interface Customer {
  id: string;
  contractor_id: string;
  homeowner_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address?: string;
  notes?: string;
  total_jobs: number;
  total_spent: number;
  last_job_date?: string;
  rating?: number;
  tags?: string[];
  created_at: string;
  updated_at: string;
  // Populated fields
  homeowner?: User;
  jobs?: Job[];
}

/**
 * Swipe action for discovery cards
 */
export interface SwipeAction {
  type: 'like' | 'pass' | 'super_like';
  target_id: string;
  target_type: 'job' | 'contractor';
  user_id: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/**
 * Recommendation for contractors/jobs
 */
export interface Recommendation {
  id: string;
  type: 'contractor' | 'job';
  target_id: string;
  user_id: string;
  score: number;
  reason: string;
  factors: {
    factor: string;
    weight: number;
    score: number;
  }[];
  created_at: string;
  // Populated fields
  contractor?: ContractorProfile;
  job?: Job;
}

/**
 * Job tracking data
 */
export interface TrackingData {
  job_id: string;
  status: string;
  progress_percentage: number;
  milestones: {
    id: string;
    name: string;
    status: 'pending' | 'in_progress' | 'completed';
    completed_at?: string;
  }[];
  timeline: {
    event: string;
    timestamp: string;
    actor_id: string;
    details?: string;
  }[];
  estimated_completion: string;
  actual_completion?: string;
  delays?: {
    reason: string;
    duration_days: number;
    reported_at: string;
  }[];
}

/**
 * Sign-off data for job completion
 */
export interface SignOffData {
  job_id: string;
  contractor_id: string;
  homeowner_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'disputed';
  completion_photos: string[];
  completion_notes?: string;
  homeowner_signature?: string;
  contractor_signature?: string;
  signed_at?: string;
  issues?: {
    description: string;
    severity: 'minor' | 'major' | 'critical';
    resolution?: string;
  }[];
  final_amount: number;
  payment_released: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Card design for contractor business cards
 */
export interface CardDesign {
  id: string;
  contractor_id: string;
  template_id: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
  logo_url?: string;
  tagline?: string;
  contact_info: {
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
  };
  social_links?: {
    platform: string;
    url: string;
  }[];
  qr_code_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * GDPR data export
 */
export interface GDPRExportData {
  user: User;
  profile?: ContractorProfile;
  jobs: Job[];
  bids: Bid[];
  messages: Message[];
  payments: EscrowTransaction[];
  properties?: Property[];
  reviews: Review[];
  notifications: Notification[];
  exported_at: string;
}

// =====================================================
// Feature Access & Subscription Types
// =====================================================

/**
 * Subscription tier for contractors
 */
export type SubscriptionTier = 'free' | 'basic' | 'professional' | 'enterprise';

/**
 * Feature limit definition
 */
export interface FeatureLimit {
  free?: number | boolean | 'unlimited';
  basic?: number | boolean | 'unlimited';
  professional?: number | boolean | 'unlimited';
  enterprise?: number | boolean | 'unlimited';
  homeowner?: boolean;
}

/**
 * Feature definition with access controls
 */
export interface FeatureDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  limits: FeatureLimit;
  upgradeMessage?: string;
  learnMoreUrl?: string;
}

/**
 * Feature usage tracking
 */
export interface FeatureUsage {
  id: string;
  user_id: string;
  feature_id: string;
  used_count: number;
  limit_count: number | 'unlimited';
  reset_date: string;
  created_at: string;
  updated_at: string;
}

/**
 * Feature access result
 */
export interface FeatureAccessResult {
  hasAccess: boolean;
  limit: number | boolean | 'unlimited';
  used?: number;
  remaining?: number | 'unlimited';
  requiresUpgrade: boolean;
  upgradeTiers: SubscriptionTier[];
  feature?: FeatureDefinition;
}

/**
 * Subscription information
 */
export interface SubscriptionInfo {
  tier: SubscriptionTier;
  status: 'free' | 'active' | 'past_due' | 'canceled' | 'expired';
  currentPeriodEnd?: string | null;
  currentPeriodStart?: string | null;
  canceledAt?: string | null;
  cancelAtPeriodEnd?: boolean;
}

/**
 * Tier pricing information
 */
export interface TierPricing {
  name: string;
  price: number;
  period: string;
  description: string;
  popular?: boolean;
  features?: string[];
}

/**
 * Feature category
 */
export type FeatureCategory =
  | 'Job Management'
  | 'Bidding'
  | 'Discovery'
  | 'Social'
  | 'Portfolio'
  | 'Branding'
  | 'Analytics'
  | 'Business Tools'
  | 'Support'
  | 'Marketing'
  | 'Communication'
  | 'Resources'
  | 'Content'
  | 'Payments'
  | 'Reviews'
  | 'Properties';