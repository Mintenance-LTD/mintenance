import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface JobRecord {
  id: string;
  title: string;
  category: string;
  status: string;
  updated_at: string;
  city: string;
  homeowner_id: string;
  contractor_id?: string;
}

interface BidRecord {
  job_id: string;
  created_at: string;
}

interface UserRecord {
  id: string;
  first_name: string;
  last_name: string;
  city?: string;
}

/**
 * GET /api/activity-feed
 * Public endpoint for live activity feed on the landing page
 */
export const GET = withApiHandler(
  { auth: false, rateLimit: { maxRequests: 30 } },
  async () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let completedJobs: JobRecord[] | null = null;
    for (const window of [oneHourAgo, oneDayAgo, sevenDaysAgo]) {
      const { data, error } = await serverSupabase
        .from('jobs')
        .select('id, title, category, status, updated_at, city, homeowner_id')
        .eq('status', 'completed')
        .gte('updated_at', window.toISOString())
        .order('updated_at', { ascending: false })
        .limit(10);
      if (!error && data && data.length > 0) { completedJobs = data as JobRecord[]; break; }
    }

    let hiredJobs: JobRecord[] | null = null;
    for (const window of [oneHourAgo, oneDayAgo, sevenDaysAgo]) {
      const { data, error } = await serverSupabase
        .from('jobs')
        .select('id, title, category, status, updated_at, city, homeowner_id, contractor_id')
        .eq('status', 'assigned')
        .gte('updated_at', window.toISOString())
        .order('updated_at', { ascending: false })
        .limit(10);
      if (!error && data && data.length > 0) { hiredJobs = data as JobRecord[]; break; }
    }

    let jobsWithBids: BidRecord[] | null = null;
    for (const window of [oneHourAgo, oneDayAgo, sevenDaysAgo]) {
      const { data, error } = await serverSupabase
        .from('bids')
        .select('job_id, created_at')
        .gte('created_at', window.toISOString())
        .order('created_at', { ascending: false })
        .limit(20);
      if (!error && data && data.length > 0) { jobsWithBids = data as BidRecord[]; break; }
    }

    const homeownerIds = new Set<string>();
    const contractorIds = new Set<string>();
    const jobIds = new Set<string>();

    completedJobs?.forEach((job) => { if (job.homeowner_id) homeownerIds.add(job.homeowner_id); if (job.id) jobIds.add(job.id); });
    hiredJobs?.forEach((job) => { if (job.homeowner_id) homeownerIds.add(job.homeowner_id); if (job.contractor_id) contractorIds.add(job.contractor_id); if (job.id) jobIds.add(job.id); });
    jobsWithBids?.forEach((bid) => { if (bid.job_id) jobIds.add(bid.job_id); });

    const allUserIds = [...homeownerIds, ...contractorIds];
    const { data: users } = allUserIds.length > 0 ? await serverSupabase.from('profiles').select('id, first_name, last_name').in('id', allUserIds) : { data: [] };
    const userMap = new Map((users || []).map((u: UserRecord) => [u.id, u]));

    const { data: bidJobs } = jobIds.size > 0 ? await serverSupabase.from('jobs').select('id, title, category, city, homeowner_id').in('id', Array.from(jobIds)) : { data: [] };
    const jobMap = new Map((bidJobs || []).map((j: Pick<JobRecord, 'id' | 'title' | 'category' | 'city' | 'homeowner_id'>) => [j.id, j as JobRecord]));

    const quotesByJob = new Map<string, number>();
    jobsWithBids?.forEach((bid) => { quotesByJob.set(bid.job_id, (quotesByJob.get(bid.job_id) || 0) + 1); });

    const activities: Array<{ name: string; action: string; location: string; time: string; timestamp: Date }> = [];

    completedJobs?.forEach((job) => {
      const homeowner = userMap.get(job.homeowner_id) as UserRecord | undefined;
      const name = `${homeowner?.first_name || ''} ${homeowner?.last_name || ''}`.trim() || 'Someone';
      const firstName = name.split(' ')[0];
      activities.push({ name: firstName + (name.includes(' ') ? ' ' + name.split(' ')[1].charAt(0) + '.' : ''), action: `completed a ${job.category || 'project'}`, location: job.city || 'UK', time: formatTimeAgo(new Date(job.updated_at)), timestamp: new Date(job.updated_at) });
    });

    hiredJobs?.forEach((job) => {
      const homeowner = userMap.get(job.homeowner_id) as UserRecord | undefined;
      const name = `${homeowner?.first_name || ''} ${homeowner?.last_name || ''}`.trim() || 'Someone';
      const firstName = name.split(' ')[0];
      activities.push({ name: firstName + (name.includes(' ') ? ' ' + name.split(' ')[1].charAt(0) + '.' : ''), action: `hired a ${getContractorType(job.category || 'contractor')}`, location: job.city || 'UK', time: formatTimeAgo(new Date(job.updated_at)), timestamp: new Date(job.updated_at) });
    });

    jobsWithBids?.forEach((bid) => {
      const job = jobMap.get(bid.job_id) as JobRecord | undefined;
      if (!job) return;
      const quoteCount = quotesByJob.get(job.id) || 0;
      if (quoteCount < 3) return;
      const homeowner = userMap.get(job.homeowner_id) as UserRecord | undefined;
      const name = `${homeowner?.first_name || ''} ${homeowner?.last_name || ''}`.trim() || 'Someone';
      const firstName = name.split(' ')[0];
      activities.push({ name: firstName + (name.includes(' ') ? ' ' + name.split(' ')[1].charAt(0) + '.' : ''), action: `received ${quoteCount} quotes`, location: job.city || 'UK', time: formatTimeAgo(new Date(bid.created_at)), timestamp: new Date(bid.created_at) });
    });

    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const recentActivities = activities.slice(0, 20);

    // Calculate active users in last 24 hours
    const oneDayAgoForCount = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const { data: recentJobs24h } = await serverSupabase
      .from('jobs')
      .select('homeowner_id, contractor_id')
      .gte('updated_at', oneDayAgoForCount.toISOString())
      .limit(100);

    const activeUserIds24h = new Set<string>();
    recentJobs24h?.forEach((job: Pick<JobRecord, 'homeowner_id' | 'contractor_id'>) => {
      if (job.homeowner_id) activeUserIds24h.add(job.homeowner_id);
      if (job.contractor_id) activeUserIds24h.add(job.contractor_id);
    });

    return NextResponse.json({
      activities: recentActivities,
      activeUserCount: activeUserIds24h.size,
      hasRealData: recentActivities.length > 0,
    });
  }
);

function formatTimeAgo(timestamp: Date): string {
  const diffMs = Date.now() - timestamp.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

function getContractorType(category: string): string {
  const categoryMap: Record<string, string> = {
    plumbing: 'plumber', electrical: 'electrician', painting: 'painter',
    carpentry: 'carpenter', roofing: 'roofer', hvac: 'HVAC technician',
    landscaping: 'landscaper', kitchen: 'kitchen specialist', bathroom: 'bathroom specialist',
  };
  return categoryMap[category.toLowerCase()] || 'contractor';
}
