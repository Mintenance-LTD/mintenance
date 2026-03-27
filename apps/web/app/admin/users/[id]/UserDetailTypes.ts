export interface UserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  phone: string | null;
  profileImageUrl: string | null;
  companyName: string | null;
  licenseNumber: string | null;
  businessAddress: string | null;
  insuranceProvider: string | null;
  insuranceExpiryDate: string | null;
  yearsExperience: number | null;
  adminVerified: boolean;
  bio: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserStats {
  jobsPosted: number;
  jobsCompleted: number;
  bidsSent: number;
  bidsWon: number;
  avgRating: number;
  reviewCount: number;
  totalSpent: number;
  totalEarned: number;
}

export interface Job {
  id: string;
  title: string;
  status: string;
  category: string | null;
  createdAt: string;
}

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewerId?: string;
  revieweeId?: string;
}

export interface Payment {
  id: string;
  type: 'payment' | 'earning';
  amount: number;
  status: string;
  jobId: string | null;
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  type: string;
  title: string;
  message: string | null;
  read: boolean;
  createdAt: string;
}

export interface UserDetail {
  profile: UserProfile;
  stats: UserStats;
  recentJobs: Job[];
  contractorJobs: Job[];
  reviewsReceived: Review[];
  reviewsGiven: Review[];
  paymentHistory: Payment[];
  activity: ActivityItem[];
}

export type Tab = 'activity' | 'jobs' | 'payments' | 'reviews';

// ── Helpers ─────────────────────────────────────────────────────────

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(
    amount
  );

export const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

export const formatDateTime = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export function getJobStatusBadge(status: string): {
  bg: string;
  text: string;
} {
  switch (status) {
    case 'posted':
    case 'open':
      return { bg: '#DBEAFE', text: '#1E40AF' };
    case 'assigned':
      return { bg: '#FEF3C7', text: '#92400E' };
    case 'in_progress':
      return { bg: '#E0E7FF', text: '#3730A3' };
    case 'completed':
      return { bg: '#D1FAE5', text: '#065F46' };
    case 'cancelled':
      return { bg: '#FEE2E2', text: '#991B1B' };
    default:
      return { bg: '#F1F5F9', text: '#475569' };
  }
}

export function getRoleBadge(role: string): {
  bg: string;
  text: string;
  label: string;
} {
  switch (role) {
    case 'admin':
      return { bg: '#FEE2E2', text: '#991B1B', label: 'Admin' };
    case 'contractor':
      return { bg: '#DBEAFE', text: '#1E40AF', label: 'Contractor' };
    case 'homeowner':
      return { bg: '#D1FAE5', text: '#065F46', label: 'Homeowner' };
    default:
      return { bg: '#F1F5F9', text: '#475569', label: role };
  }
}

export function getActivityIcon(type: string): string {
  if (type.includes('job')) return 'briefcase';
  if (type.includes('bid')) return 'target';
  if (type.includes('payment') || type.includes('escrow'))
    return 'currencyPound';
  if (type.includes('message')) return 'messages';
  if (type.includes('review')) return 'star';
  if (type.includes('verif')) return 'checkCircle';
  return 'info';
}
