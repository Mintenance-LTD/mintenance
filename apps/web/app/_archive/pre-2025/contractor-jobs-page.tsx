import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { JobsTable } from './components/JobsTable';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';

export const metadata = {
  title: 'My Jobs | Mintenance',
  description: 'View and manage all your jobs',
};

export default async function ContractorJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; search?: string }>;
}) {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  const resolvedSearchParams = await searchParams;
  const statusFilter = resolvedSearchParams.status;
  const page = parseInt(resolvedSearchParams.page || '1', 10);
  const search = resolvedSearchParams.search || '';
  const limit = 20;
  const offset = (page - 1) * limit;

  // Build query
  let query = serverSupabase
    .from('jobs')
    .select(
      `
      id,
      title,
      status,
      budget,
      created_at,
      updated_at,
      location,
      homeowner_id
    `,
      { count: 'exact' }
    )
    .eq('contractor_id', user.id)
    .order('updated_at', { ascending: false });

  // Apply status filter
  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  // Apply search filter
  if (search) {
    query = query.ilike('title', `%${search}%`);
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data: jobs, error, count } = await query;

  if (error) {
    console.error('Error fetching jobs:', error);
  }

  // Fetch homeowner data for each job
  const jobsWithHomeowners = await Promise.all(
    (jobs || []).map(async (job) => {
      if (!job.homeowner_id) {
        return { ...job, homeowner: null };
      }

      const { data: homeowner } = await serverSupabase
        .from('users')
        .select('id, first_name, last_name, profile_image_url')
        .eq('id', job.homeowner_id)
        .single();

      return {
        ...job,
        homeowner: homeowner || null,
      };
    })
  );

  const totalPages = count ? Math.ceil(count / limit) : 1;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Jobs</h1>
          <p className="text-sm text-gray-600 mt-1">
            {count || 0} total {count === 1 ? 'job' : 'jobs'}
          </p>
        </div>
        <Link href="/contractor/jobs-near-you">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Jobs
          </Button>
        </Link>
      </div>

      {/* Jobs Table */}
      <JobsTable
        jobs={jobsWithHomeowners}
        currentPage={page}
        totalPages={totalPages}
        currentStatus={statusFilter || 'all'}
        currentSearch={search}
      />
    </div>
  );
}

