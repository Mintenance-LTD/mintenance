/**
 * Helpers shared across the Mint Editorial homeowner dashboard
 * sub-components.
 */

export const formatGBP = (n: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(n);

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'YOU';

export interface ActiveJob {
  id: string;
  title: string;
  status: string;
  budget: number;
  category?: string;
  contractor?: { name: string; image?: string };
  progress: number;
  bidsCount: number;
  scheduledDate?: string;
}

export interface PendingBid {
  id: string;
  amount: number;
  jobId: string;
  jobTitle: string;
  contractorName: string;
  contractorImage?: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  title: string;
  date: string;
  time: string;
  endTime?: string;
  locationType?: string;
  status: string;
  contractor?: { name: string };
}

export interface DashboardData {
  homeowner: { id: string; name: string; avatar?: string; email: string };
  metrics: {
    totalSpent: number;
    activeJobs: number;
    completedJobs: number;
    savedContractors: number;
  };
  activeJobs: ActiveJob[];
  pendingBids?: PendingBid[];
  upcomingAppointments?: Appointment[];
}
