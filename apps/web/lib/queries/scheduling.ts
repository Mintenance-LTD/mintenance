import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

interface UserInfo {
  id: string;
  first_name: string;
  last_name: string;
}

interface ContractInfo {
  start_date: string | null;
  end_date: string | null;
  status: string;
  contractor_signed_at: string | null;
  homeowner_signed_at: string | null;
}

interface JobWithRelations {
  id: string;
  title: string;
  status: string;
  scheduled_start_date: string | null;
  scheduled_end_date: string | null;
  created_at: string;
  contractor_id: string | null;
  homeowner_id: string;
  contractor: UserInfo | UserInfo[] | null;
  homeowner: UserInfo | UserInfo[] | null;
  contract: ContractInfo | ContractInfo[] | null;
}

// Helper to normalize joined data (Supabase can return object or array)
const getFirst = <T>(data: T | T[] | null | undefined): T | null => {
  if (!data) return null;
  return Array.isArray(data) ? data[0] || null : data;
};

/**
 * Fetch jobs with all related data in a single optimized query
 * Uses Supabase joins to avoid N+1 query problems
 */
export async function fetchJobsWithRelations(
  userId: string,
  role: 'homeowner' | 'contractor'
): Promise<JobWithRelations[]> {
  if (role === 'homeowner') {
    // Homeowner jobs with joins
    const { data, error } = await serverSupabase
      .from('jobs')
      .select(`
        id,
        title,
        status,
        scheduled_start_date,
        scheduled_end_date,
        created_at,
        contractor_id,
        homeowner_id,
        contractor:users!jobs_contractor_id_fkey (
          id,
          first_name,
          last_name
        ),
        homeowner:users!jobs_homeowner_id_fkey (
          id,
          first_name,
          last_name
        )
      `)
      .eq('homeowner_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching homeowner jobs:', error);
      return [];
    }

    return (data || []) as JobWithRelations[];
  } else {
    // Contractor: Get assigned jobs
    const { data: assignedJobs, error: assignedError } = await serverSupabase
      .from('jobs')
      .select(`
        id,
        title,
        status,
        scheduled_start_date,
        scheduled_end_date,
        created_at,
        contractor_id,
        homeowner_id,
        contractor:users!jobs_contractor_id_fkey (
          id,
          first_name,
          last_name
        ),
        homeowner:users!jobs_homeowner_id_fkey (
          id,
          first_name,
          last_name
        )
      `)
      .eq('contractor_id', userId)
      .order('created_at', { ascending: false });

    if (assignedError) {
      logger.error('Error fetching assigned jobs:', assignedError);
    }

    // Get jobs where contractor has bids
    const { data: bids, error: bidsError } = await serverSupabase
      .from('bids')
      .select('job_id')
      .eq('contractor_id', userId);

    if (bidsError) {
      logger.error('Error fetching bids:', bidsError);
    }

    const bidJobIds = bids?.map(b => b.job_id).filter(Boolean) || [];

    let bidJobs: JobWithRelations[] = [];
    if (bidJobIds.length > 0) {
      const { data: jobsWithBids, error: bidJobsError } = await serverSupabase
        .from('jobs')
        .select(`
          id,
          title,
          status,
          scheduled_start_date,
          scheduled_end_date,
          created_at,
          contractor_id,
          homeowner_id,
          contractor:users!jobs_contractor_id_fkey (
            id,
            first_name,
            last_name
          ),
          homeowner:users!jobs_homeowner_id_fkey (
            id,
            first_name,
            last_name
          )
        `)
        .in('id', bidJobIds)
        .order('created_at', { ascending: false });

      if (bidJobsError) {
        logger.error('Error fetching jobs with bids:', bidJobsError);
      }

      bidJobs = (jobsWithBids || []) as JobWithRelations[];
    }

    // Combine and deduplicate
    const allJobsMap = new Map<string, JobWithRelations>();
    (assignedJobs || []).forEach(job => allJobsMap.set(job.id, job as JobWithRelations));
    bidJobs.forEach(job => {
      if (!allJobsMap.has(job.id)) {
        allJobsMap.set(job.id, job);
      }
    });

    return Array.from(allJobsMap.values());
  }
}

/**
 * Batch fetch contracts for multiple jobs in a single query
 */
export async function fetchContractsForJobs(
  jobIds: string[]
): Promise<Map<string, {
  start_date: string | null;
  end_date: string | null;
  status: string;
  contractor_signed_at: string | null;
  homeowner_signed_at: string | null;
}>> {
  if (jobIds.length === 0) {
    return new Map();
  }

  const { data, error } = await serverSupabase
    .from('contracts')
    .select('job_id, start_date, end_date, status, contractor_signed_at, homeowner_signed_at')
    .in('job_id', jobIds);

  if (error) {
    logger.error('Error fetching contracts:', error);
    return new Map();
  }

  const contractsMap = new Map();
  (data || []).forEach(contract => {
    contractsMap.set(contract.job_id, {
      start_date: contract.start_date,
      end_date: contract.end_date,
      status: contract.status,
      contractor_signed_at: contract.contractor_signed_at,
      homeowner_signed_at: contract.homeowner_signed_at,
    });
  });

  return contractsMap;
}

/**
 * Fetch meetings for a user with joins
 */
export async function fetchMeetingsForUser(userId: string): Promise<any[]> {
  try {
    const { data } = await serverSupabase
      .from('contractor_meetings')
      .select(`
        id,
        scheduled_datetime,
        meeting_type,
        status,
        job_id,
        contractor:users!contractor_meetings_contractor_id_fkey (
          id,
          first_name,
          last_name
        ),
        job:jobs!contractor_meetings_job_id_fkey (
          id,
          title
        )
      `)
      .or(`homeowner_id.eq.${userId},contractor_id.eq.${userId}`)
      .in('status', ['scheduled', 'confirmed'])
      .order('scheduled_datetime', { ascending: true });

    return data || [];
  } catch (error) {
    // Table might not exist
    logger.info('contractor_meetings table not found, using jobs scheduled_date instead');
    return [];
  }
}

