export interface DerivedClient {
  id: string;
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

export interface JobRecord {
  id: string;
  homeowner_id: string;
  status: string;
  title?: string;
  created_at: string;
  completed_at?: string;
  budget?: number;
  final_price?: number;
  homeowner?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    profile_image_url?: string;
  };
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

const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;

export function deriveClients(jobs: JobRecord[]): DerivedClient[] {
  const map = new Map<
    string,
    { jobs: JobRecord[]; owner: JobRecord['homeowner'] }
  >();
  for (const job of jobs) {
    if (!job.homeowner_id) continue;
    const entry = map.get(job.homeowner_id) || {
      jobs: [],
      owner: job.homeowner,
    };
    entry.jobs.push(job);
    if (job.homeowner) entry.owner = job.homeowner;
    map.set(job.homeowner_id, entry);
  }
  const now = Date.now();
  const result: DerivedClient[] = [];
  map.forEach((entry, hid) => {
    const { owner, jobs: cj } = entry;
    const done = cj.filter(
      (j) => j.status === 'completed' || j.status === 'in_progress'
    );
    const rev = cj.reduce((s, j) => s + (j.final_price || j.budget || 0), 0);
    const sorted = [...cj].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const last = sorted[0];
    const lastDate = last?.completed_at || last?.created_at || '';
    const lastMs = lastDate ? new Date(lastDate).getTime() : 0;
    let status: DerivedClient['relationship_status'] = 'inactive';
    if (done.length === 0) status = 'prospect';
    else if (now - lastMs <= NINETY_DAYS) status = 'active';
    result.push({
      id: hid,
      first_name: owner?.first_name || 'Unknown',
      last_name: owner?.last_name || '',
      email: owner?.email || '',
      phone: owner?.phone,
      profile_image_url: owner?.profile_image_url,
      total_jobs: cj.length,
      total_revenue: rev,
      last_job_date: lastDate,
      last_job_title: last?.title || 'Untitled job',
      relationship_status: status,
    });
  });
  return result.sort((a, b) =>
    `${a.first_name} ${a.last_name}`.localeCompare(
      `${b.first_name} ${b.last_name}`
    )
  );
}
