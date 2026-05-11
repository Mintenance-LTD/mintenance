import { headers } from 'next/headers';
import {
  getCurrentUserFromHeaders,
  getCurrentUserFromCookies,
} from '@/lib/auth';
import UnauthenticatedCard from '@/components/UnauthenticatedCard';
import { OnboardingWrapper } from '@/components/onboarding/OnboardingWrapper';
import { DashboardClient } from './components/DashboardClient';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import type { Metadata } from 'next';
import { fetchDashboardData } from './lib/data-fetching';
import {
  combineBidsAndQuotes,
  filterJobsByStatus,
  calculateKpiData,
} from './lib/data-processing';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { fetchNotificationFeed } from '@/lib/notifications/feed';
import { resignJobStorageUrls } from '@/lib/api/job-storage';
import { buildNeedsYouFeed } from './lib/needs-you-aggregator';

export const metadata: Metadata = {
  title: 'Dashboard | Mintenance',
  description: 'Manage your Mintenance account and projects',
};

export default async function DashboardPage2025() {
  const headersList = await headers();

  let user = getCurrentUserFromHeaders(headersList as unknown as Headers);
  if (!user) {
    user = await getCurrentUserFromCookies();
  }

  if (!user) {
    return <UnauthenticatedCard />;
  }

  // Redirect contractors to their enhanced dashboard
  if (user.role === 'contractor') {
    const { redirect } = await import('next/navigation');
    redirect('/contractor/dashboard-enhanced');
  }

  // Fetch all dashboard data
  const dashboardData = await fetchDashboardData(user.id);
  const {
    homeownerProfile,
    jobs,
    bids,
    quotes,
    properties,
    subscriptions,
    payments,
    recommendations,
    onboardingStatus,
  } = dashboardData;

  // Process data
  const allBids = combineBidsAndQuotes(bids, quotes);

  const { activeJobs, completedJobs, postedJobs, awaitingBids, scheduledJobs } =
    filterJobsByStatus(jobs);

  const kpiData = calculateKpiData(
    jobs,
    allBids,
    properties,
    subscriptions,
    payments,
    completedJobs,
    scheduledJobs
  );

  const userDisplayName = homeownerProfile
    ? `${homeownerProfile.first_name} ${homeownerProfile.last_name}`.trim() ||
      user.email
    : user.email;

  // Calculate total spent from actual payments (escrow transactions),
  // not job budgets. The previous filter checked for status==='held' but
  // the canonical payments-table enum uses 'in_escrow' — so even when
  // money was actually held the KPI read £0. Fixed to use the real
  // schema enum (`003_payment_system.sql`): in_escrow / released /
  // completed cover "money the homeowner has paid in".
  //
  // For a pure budget-sum view the user can look at /financials
  // "Total Budget".
  const HELD_STATUSES = ['in_escrow'];
  const SPENT_STATUSES = ['in_escrow', 'released', 'completed'];

  let totalSpent = payments
    .filter((p: { status?: string }) => SPENT_STATUSES.includes(p.status || ''))
    .reduce(
      (sum: number, p: { amount?: number }) => sum + (Number(p.amount) || 0),
      0
    );

  // Build a per-job "currently held in escrow" map so the active-jobs
  // cards can show a real escrow badge instead of using job.budget as
  // a proxy (which lied when in_progress jobs had no funded payment).
  const escrowByJob = new Map<string, number>();
  let totalHeldInEscrow = 0;
  for (const p of payments) {
    const status = (p as { status?: string }).status;
    const jobId = (p as { job_id?: string }).job_id;
    const amount = Number((p as { amount?: number }).amount) || 0;
    if (!jobId || !HELD_STATUSES.includes(status || '') || amount <= 0)
      continue;
    escrowByJob.set(jobId, (escrowByJob.get(jobId) || 0) + amount);
    totalHeldInEscrow += amount;
  }

  // Bridge to `escrow_transactions` — same drift the /financials and
  // /payments pages hit on 2026-04-21: the legacy `payments` table is
  // empty in production, all real money flows live in
  // `escrow_transactions` keyed by `payer_id`. Without this bridge the
  // dashboard's "Held in escrow" KPI + the PaymentProtected card both
  // render £0 and the card silently hides (it gates on `escrow > 0`).
  const { data: escrowRows } = await serverSupabase
    .from('escrow_transactions')
    .select('id, amount, status, job_id')
    .eq('payer_id', user.id);

  // escrow_transactions status enum: pending / held / release_pending /
  // released / completed / refunded. Anything once-held counts as
  // "spent"; only `held` and `release_pending` are still actively
  // protected ("Payment protected" card surface).
  const ESCROW_SPENT = new Set([
    'held',
    'release_pending',
    'released',
    'completed',
  ]);
  const ESCROW_HELD = new Set(['held', 'release_pending']);

  for (const row of escrowRows || []) {
    const status = (row as { status?: string }).status || '';
    const amount = Number((row as { amount?: number }).amount) || 0;
    const jobId = (row as { job_id?: string }).job_id;
    if (amount <= 0) continue;
    if (ESCROW_SPENT.has(status)) totalSpent += amount;
    if (ESCROW_HELD.has(status)) {
      totalHeldInEscrow += amount;
      if (jobId) {
        escrowByJob.set(jobId, (escrowByJob.get(jobId) || 0) + amount);
      }
    }
  }

  // PERFORMANCE FIX: Batch queries instead of N+1
  // Collect all job and contractor IDs
  const jobIds = activeJobs.map((j) => j.id);
  const contractorIds = activeJobs
    .map((j) => j.contractor_id)
    .filter((id): id is string => id !== null && id !== undefined);

  // Batch query 1: Get all job photos at once
  const { data: allJobPhotos } = await serverSupabase
    .from('job_attachments')
    .select('job_id, file_url, file_type, uploaded_at')
    .in('job_id', jobIds)
    .eq('file_type', 'image')
    .order('uploaded_at', { ascending: false });

  // Batch query 2: Get all bid counts at once
  const { data: allBidCounts } = await serverSupabase
    .from('bids')
    .select('job_id')
    .in('job_id', jobIds);

  // Batch query 3: Get all contractors at once
  const { data: allContractors } =
    contractorIds.length > 0
      ? await serverSupabase
          .from('profiles')
          .select('id, first_name, last_name, profile_image_url')
          .in('id', contractorIds)
      : { data: [] };

  // Batch query 4: Get all job progress at once
  const { data: allJobProgress } = await serverSupabase
    .from('job_progress')
    .select('job_id, progress_percentage')
    .in('job_id', jobIds);

  // Create lookup maps for O(1) access. Re-sign Job-storage URLs in
  // batch so stale `public` URLs don't 404 after the 2026-04-17 bucket
  // flip — same pattern as /api/contractor/my-jobs. External CDN URLs
  // pass through untouched.
  const rawPhotoUrls: string[] = [];
  const photoOrder: string[] = []; // job_id order, 1:1 with rawPhotoUrls
  const firstPhotoByJob = new Map<string, string>();
  allJobPhotos?.forEach((photo) => {
    if (!firstPhotoByJob.has(photo.job_id)) {
      firstPhotoByJob.set(photo.job_id, photo.file_url);
      rawPhotoUrls.push(photo.file_url);
      photoOrder.push(photo.job_id);
    }
  });
  const signedPhotoUrls = await resignJobStorageUrls(rawPhotoUrls);
  const photoMap = new Map<string, string>();
  photoOrder.forEach((jobId, idx) => {
    const signed = signedPhotoUrls[idx];
    if (signed) photoMap.set(jobId, signed);
  });

  const bidCountMap = new Map<string, number>();
  allBidCounts?.forEach((bid) => {
    const current = bidCountMap.get(bid.job_id) || 0;
    bidCountMap.set(bid.job_id, current + 1);
  });

  const contractorMap = new Map(allContractors?.map((c) => [c.id, c]) || []);

  const progressMap = new Map(
    allJobProgress?.map((p) => [p.job_id, p.progress_percentage]) || []
  );

  // Map data in memory (no more queries!)
  const jobsWithContractors = activeJobs.map((job) => {
    const contractor = job.contractor_id
      ? contractorMap.get(job.contractor_id)
      : undefined;
    const progress = progressMap.get(job.id);
    const photoUrl = photoMap.get(job.id) || null;
    const bidsCount = bidCountMap.get(job.id) || 0;

    return {
      id: job.id,
      title: job.title || 'Untitled Job',
      status: job.status,
      budget: job.budget || 0,
      category: typeof job.category === 'string' ? job.category : undefined,
      contractor: contractor
        ? {
            name: `${contractor.first_name} ${contractor.last_name}`.trim(),
            image: contractor.profile_image_url,
          }
        : undefined,
      progress: progress ? parseFloat(progress.toString()) : 0,
      bidsCount: job.contractor_id ? 0 : bidsCount,
      scheduledDate:
        typeof job.scheduled_start_date === 'string'
          ? job.scheduled_start_date
          : undefined,
      photoUrl,
      escrowAmount: escrowByJob.get(job.id) ?? 0,
    };
  });

  // Prepare pending bids for the "Bids Received" section
  const pendingBids = allBids
    .filter((bid) => bid.status === 'pending')
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 10)
    .map((bid) => ({
      id: bid.id,
      amount: Number(bid.amount || bid.total_amount || 0),
      jobId: bid.job?.id || '',
      jobTitle: bid.job?.title || 'Untitled Job',
      contractorName: bid.contractor
        ? `${bid.contractor.first_name || ''} ${bid.contractor.last_name || ''}`.trim() ||
          'Contractor'
        : 'Contractor',
      contractorImage: bid.contractor?.profile_image_url || undefined,
      createdAt: bid.created_at,
    }));

  // Recent activity feed — shares the filtering/mapping rules used by
  // `/api/notifications` via fetchNotificationFeed, so this card and the
  // /notifications page no longer drift apart (previously the dashboard
  // ran its own unfiltered SELECT and could show social-type rows or
  // older read items that the dedicated page deliberately hid).
  const feedItems = await fetchNotificationFeed(user.id, { limit: 10 });
  const recentActivity =
    feedItems.length > 0
      ? feedItems.map((n) => ({
          id: n.id,
          type: n.type,
          message: n.message || n.title || 'Notification',
          timestamp: n.created_at,
        }))
      : [
          // Fallback: derive from jobs + bids if no notifications exist yet
          ...jobs.slice(0, 5).map((job) => ({
            id: `job-${job.id}`,
            type: 'job_posted',
            message: `Posted job: ${job.title || 'Untitled'}`,
            timestamp: job.created_at,
          })),
          ...allBids.slice(0, 5).map((bid) => ({
            id: `bid-${bid.id}`,
            type: 'bid_received',
            message: `Received bid for ${bid.job?.title || 'a job'}`,
            timestamp: bid.created_at,
          })),
        ]
          .sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )
          .slice(0, 10);

  // Fetch upcoming appointments from the appointments table
  const { data: appointmentsData } = await serverSupabase
    .from('appointments')
    .select(
      `
      id, title, appointment_date, start_time, end_time,
      location_type, status, notes,
      contractor:profiles!contractor_id(id, first_name, last_name)
    `
    )
    .eq('client_id', user.id)
    .gte('appointment_date', new Date().toISOString().split('T')[0])
    .in('status', ['scheduled', 'confirmed'])
    .order('appointment_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(5);

  // Supabase FK joins return arrays; extract first element
  const upcomingAppointments = (appointmentsData || []).map(
    (apt: Record<string, unknown>) => {
      const contractor = Array.isArray(apt.contractor)
        ? apt.contractor[0]
        : apt.contractor;
      return {
        id: apt.id as string,
        title: apt.title as string,
        date: apt.appointment_date as string,
        time: apt.start_time as string,
        endTime: apt.end_time as string | undefined,
        locationType: apt.location_type as string | undefined,
        status: apt.status as string,
        contractor: contractor
          ? { name: `${contractor.first_name} ${contractor.last_name}`.trim() }
          : undefined,
      };
    }
  );

  // Fetch saved/liked contractors count
  const { count: savedContractorsCount } = await serverSupabase
    .from('contractor_matches')
    .select('id', { count: 'exact', head: true })
    .eq('homeowner_id', user.id)
    .eq('action', 'like');

  // Aggregator extracted to ./lib/needs-you-aggregator.ts to keep
  // page.tsx under the 500-line MDC cap. Same heuristics as before:
  // pending bids, posted jobs with stale bid windows, unverified
  // properties.
  const needsYou = buildNeedsYouFeed({
    pendingBids,
    allBids,
    postedJobs,
    properties: properties as unknown as Parameters<
      typeof buildNeedsYouFeed
    >[0]['properties'],
  });

  // Prepare dashboard data for professional component
  const professionalDashboardData = {
    homeowner: {
      id: user.id,
      name: userDisplayName,
      avatar: homeownerProfile?.profile_image_url,
      location: '',
      email: user.email || '',
      role: user.role,
      postcode:
        typeof homeownerProfile?.postcode === 'string'
          ? homeownerProfile.postcode
          : undefined,
    },
    properties: properties.map((p) => ({
      id: String(p.id),
      property_name:
        typeof p.property_name === 'string' ? p.property_name : null,
      address: typeof p.address === 'string' ? p.address : null,
      photos: Array.isArray(p.photos) ? (p.photos as string[]) : undefined,
      property_type:
        typeof p.property_type === 'string' ? p.property_type : undefined,
    })),
    metrics: {
      totalSpent,
      heldInEscrow: totalHeldInEscrow,
      activeJobs: activeJobs.length,
      completedJobs: completedJobs.length,
      savedContractors: savedContractorsCount ?? 0,
    },
    activeJobs: jobsWithContractors,
    pendingBids,
    recentActivity,
    upcomingAppointments,
    recommendations,
    needsYou,
  };

  return (
    <ErrorBoundary>
      <OnboardingWrapper
        userType='homeowner'
        autoStart={!onboardingStatus.completed}
      >
        <DashboardClient data={professionalDashboardData} />
      </OnboardingWrapper>
    </ErrorBoundary>
  );
}
