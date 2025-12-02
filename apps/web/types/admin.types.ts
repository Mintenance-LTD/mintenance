/**
 * Admin-specific types for dashboard, settings, and user management
 */

import type { User, Job, EscrowTransaction } from '@mintenance/types';

/**
 * Admin settings configuration
 */
export interface AdminSettings {
  id: string;
  platform_name: string;
  platform_fee_percentage: number;
  stripe_fee_percentage: number;
  min_escrow_amount: number;
  max_escrow_amount: number;
  default_currency: string;
  supported_currencies: string[];
  maintenance_mode: boolean;
  maintenance_message?: string;
  email_notifications_enabled: boolean;
  sms_notifications_enabled: boolean;
  auto_approve_contractors: boolean;
  require_background_check: boolean;
  require_insurance: boolean;
  max_photos_per_job: number;
  max_file_size_mb: number;
  support_email: string;
  support_phone?: string;
  terms_url?: string;
  privacy_url?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Admin user with extended permissions
 */
export interface AdminUser extends User {
  permissions: AdminPermission[];
  last_login_at?: string;
  login_count: number;
  is_super_admin: boolean;
}

export type AdminPermission =
  | 'manage_users'
  | 'manage_contractors'
  | 'manage_jobs'
  | 'manage_payments'
  | 'manage_escrow'
  | 'manage_settings'
  | 'view_analytics'
  | 'manage_content'
  | 'manage_support';

/**
 * Admin dashboard metrics
 */
export interface AdminDashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  totalContractors: number;
  verifiedContractors: number;
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  totalRevenue: number;
  platformFees: number;
  pendingEscrows: number;
  disputedEscrows: number;
  period: {
    start: string;
    end: string;
  };
}

/**
 * Security metrics for admin dashboard
 */
export interface SecurityMetrics {
  failedLoginAttempts: number;
  suspiciousActivities: number;
  blockedIPs: number;
  activeAdminSessions: number;
  recentSecurityEvents: SecurityEvent[];
  vulnerabilityAlerts: VulnerabilityAlert[];
}

export interface SecurityEvent {
  id: string;
  type: 'login_attempt' | 'password_change' | 'permission_change' | 'suspicious_activity' | 'ip_blocked';
  severity: 'low' | 'medium' | 'high' | 'critical';
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  description: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface VulnerabilityAlert {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affected_component: string;
  recommended_action: string;
  is_resolved: boolean;
  resolved_at?: string;
  created_at: string;
}

/**
 * User detail for admin view
 */
export interface AdminUserDetail extends User {
  jobs_count: number;
  bids_count: number;
  total_spent: number;
  total_earned: number;
  last_activity_at?: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  account_status: 'active' | 'suspended' | 'banned' | 'deleted';
  notes?: AdminNote[];
  flags?: UserFlag[];
}

export interface AdminNote {
  id: string;
  user_id: string;
  admin_id: string;
  content: string;
  is_internal: boolean;
  created_at: string;
}

export interface UserFlag {
  id: string;
  user_id: string;
  type: 'warning' | 'violation' | 'fraud' | 'spam';
  reason: string;
  admin_id: string;
  is_resolved: boolean;
  resolved_at?: string;
  created_at: string;
}

/**
 * Admin activity log entry
 */
export interface AdminActivityLog {
  id: string;
  admin_id: string;
  action: string;
  resource_type: 'user' | 'job' | 'escrow' | 'settings' | 'content';
  resource_id?: string;
  details: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  // Populated
  admin?: User;
}

/**
 * Revenue analytics data
 */
export interface RevenueAnalyticsData {
  totalRevenue: number;
  platformFees: number;
  stripeFees: number;
  netRevenue: number;
  transactionCount: number;
  averageTransactionValue: number;
  growthRate: number;
  revenueByMonth: MonthlyRevenue[];
  revenueByCategory: CategoryRevenue[];
  revenueByContractorType: ContractorTypeRevenue[];
  recentTransactions: TransactionRecord[];
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  fees: number;
  transactions: number;
}

export interface CategoryRevenue {
  category: string;
  amount: number;
  percentage: number;
  transactions: number;
}

export interface ContractorTypeRevenue {
  type: string;
  revenue: number;
  jobs: number;
}

export interface TransactionRecord {
  id: string;
  date: string;
  type: 'job_payment' | 'subscription' | 'refund' | 'payout';
  amount: number;
  fee: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  job_id?: string;
  user_id: string;
  description?: string;
}

/**
 * Escrow hold/release admin actions
 */
export interface EscrowHoldAction {
  escrow_id: string;
  admin_id: string;
  action: 'hold' | 'release' | 'refund' | 'partial_release';
  amount?: number;
  reason: string;
  notes?: string;
  created_at: string;
}

/**
 * Admin communication record
 */
export interface AdminCommunication {
  id: string;
  admin_id: string;
  user_id: string;
  type: 'email' | 'sms' | 'in_app' | 'phone';
  subject?: string;
  content: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  sent_at: string;
  read_at?: string;
}

/**
 * Export request for admin data
 */
export interface AdminExportRequest {
  id: string;
  admin_id: string;
  export_type: 'users' | 'jobs' | 'transactions' | 'analytics' | 'full';
  filters?: Record<string, unknown>;
  format: 'csv' | 'json' | 'xlsx';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  file_url?: string;
  error_message?: string;
  requested_at: string;
  completed_at?: string;
}

/**
 * Platform verification request
 */
export interface VerificationRequest {
  id: string;
  contractor_id: string;
  type: 'identity' | 'business' | 'insurance' | 'certification' | 'background_check';
  status: 'pending' | 'in_review' | 'approved' | 'rejected';
  documents: VerificationDocument[];
  reviewer_id?: string;
  review_notes?: string;
  submitted_at: string;
  reviewed_at?: string;
}

export interface VerificationDocument {
  id: string;
  request_id: string;
  type: string;
  file_url: string;
  file_name: string;
  file_size: number;
  uploaded_at: string;
}

