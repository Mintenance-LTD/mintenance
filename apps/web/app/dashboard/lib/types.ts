/**
 * Dashboard Types
 * Type definitions for dashboard data structures
 */

export interface BidWithRelations {
  id: string;
  job_id: string;
  contractor_id: string;
  amount: number;
  status: string;
  created_at: string;
  jobs?: Array<{ id: string; title: string; category?: string; location?: string }> | { id: string; title: string; category?: string; location?: string };
  contractor?: { id: string; first_name: string; last_name: string; profile_image_url?: string } | Array<{ id: string; first_name: string; last_name: string; profile_image_url?: string }>;
  total_amount?: number;
}

export interface QuoteWithRelations {
  id: string;
  job_id: string;
  contractor_id: string;
  total_amount: number;
  status: string;
  created_at: string;
  job?: Array<{ id: string; title: string; category?: string }> | { id: string; title: string; category?: string };
  contractor?: Array<{ id: string; first_name: string; last_name: string; profile_image_url?: string }> | { id: string; first_name: string; last_name: string; profile_image_url?: string };
}

export interface JobWithContractor {
  id: string;
  status: string;
  contractor_id?: string | null;
  [key: string]: unknown;
}

export interface MessageWithContent {
  id: string;
  content: string;
  created_at: string;
  [key: string]: unknown;
}

export interface DashboardActivity {
  id: string;
  type: 'job' | 'payment' | 'message' | 'estimate' | 'subscription';
  title: string;
  description: string;
  timestamp: string;
  timestampDate: Date;
  linkText?: string;
  linkHref?: string;
}

export interface UpcomingItem {
  id: string;
  title: string;
  location: string;
  scheduledTime: string;
  avatar?: string;
}

export interface KpiData {
  jobsData: {
    averageSize: number;
    totalRevenue: number;
    completedJobs: number;
    scheduledJobs: number;
  };
  bidsData: {
    activeBids: number;
    pendingReview: number;
    acceptedBids: number;
    averageBid: number;
  };
  propertiesData: {
    activeProperties: number;
    pendingProperties: number;
    activeSubscriptions: number;
    overdueSubscriptions: number;
  };
  invoicesData: {
    pastDue: number;
    due: number;
    unsent: number;
    open: number;
  };
}


export interface Job {
  id: string;
  status: string;
  budget?: number;
  title?: string;
  location?: string;
  scheduled_start_date?: string;
  created_at: string;
  contractor_id?: string | null;
  [key: string]: unknown;
}

export interface Property {
  id: string;
  is_primary?: boolean;
  created_at: string;
  [key: string]: unknown;
}

export interface Subscription {
  id: string;
  status: string;
  next_billing_date?: string;
  created_at: string;
  [key: string]: unknown;
}

export interface Payment {
  id: string;
  status: string;
  amount: number;
  due_date?: string;
  created_at: string;
  [key: string]: unknown;
}
