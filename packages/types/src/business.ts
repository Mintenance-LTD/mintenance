import type { Bid, Job, Review } from './jobs';
import type { Message } from './messaging';
import type { Notification } from './notifications';
import type { ContractorProfile } from './contractor';
import type { EscrowTransaction } from './payments';
import type { Property } from './property';
import type { User } from './user';

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
