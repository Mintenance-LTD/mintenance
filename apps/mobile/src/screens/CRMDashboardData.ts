export interface DerivedClient {
  id: string;
  // 2026-05-23 audit-22 P1: API now returns both `id` and `client_id`
  // on every row. `id` matches what mobile already destructures;
  // `client_id` is the canonical identifier ClientDetailScreen reads
  // when fetching past jobs. `homeowner_id` is the platform profile
  // UUID — null for manually-added contractor_clients rows that
  // don't yet have a Mintenance account. `recent_job_id` carries the
  // most recent job between contractor + homeowner so the message
  // button can navigate to a real thread instead of passing the
  // homeowner UUID as a conversation key.
  client_id?: string;
  homeowner_id?: string | null;
  recent_job_id?: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  profile_image_url?: string;
  total_jobs: number;
  total_revenue: number;
  last_job_date: string;
  last_job_title: string;
  relationship_status: 'active' | 'prospect' | 'inactive';
}

export type FilterKey = 'all' | 'active' | 'prospect' | 'inactive';

export const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'prospect', label: 'Prospects' },
  { key: 'inactive', label: 'Inactive' },
];

export const STATUS_DOT: Record<string, string> = {
  active: '#10B981',
  prospect: '#F59E0B',
  inactive: '#B0B0B0',
};
