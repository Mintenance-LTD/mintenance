export interface ProfileSummary {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

export interface Job {
  id: string;
  title: string;
  status: string;
  category: string | null;
  budget: number | null;
  created_at: string;
  updated_at: string | null;
  completed_at: string | null;
  homeowner_id: string;
  contractor_id: string | null;
  homeowner: ProfileSummary | null;
  contractor: ProfileSummary | null;
}

export interface JobStats {
  total: number;
  posted: number;
  assigned: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  active: number;
}

export interface JobsResponse {
  success: boolean;
  data: Job[];
  total: number;
  page: number;
  limit: number;
  stats: JobStats;
}

export const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'posted', label: 'Posted' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
] as const;

export const STATUS_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  posted: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  assigned: { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
  in_progress: { bg: '#F0FDFA', text: '#0F766E', border: '#99F6E4' },
  completed: { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
  cancelled: { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' },
  disputed: { bg: '#FDF4FF', text: '#7E22CE', border: '#E9D5FF' },
};

export const PAGE_SIZE = 20;

export function formatProfileName(profile: ProfileSummary | null): string {
  if (!profile) return 'Unknown';
  const first = profile.first_name || '';
  const last = profile.last_name || '';
  const full = `${first} ${last}`.trim();
  return full || profile.email || 'Unknown';
}

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatBudget(budget: number | null): string {
  if (budget === null || budget === undefined) return '--';
  return `\u00A3${Number(budget).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function generatePageNumbers(
  current: number,
  total: number
): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [];
  pages.push(1);
  if (current > 3) pages.push('...');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}
