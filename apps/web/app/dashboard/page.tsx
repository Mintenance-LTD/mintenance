import { headers } from 'next/headers';
import { getCurrentUserFromHeaders, getCurrentUserFromCookies } from '@/lib/auth';
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

  const {
    activeJobs,
    completedJobs,
    postedJobs,
    awaitingBids,
    scheduledJobs,
  } = filterJobsByStatus(jobs);

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
    ? `${homeownerProfile.first_name} ${homeownerProfile.last_name}`.trim() || user.email
    : user.email;

  // Calculate total spent from actual payments (escrow transactions), not job budgets
  const totalSpent = payments.length > 0
    ? payments
        .filter((p: { status?: string }) => p.status === 'released' || p.status === 'held' || p.status === 'completed')
        .reduce((sum: number, p: { amount?: number }) => sum + (Number(p.amount) || 0), 0)
    : kpiData.jobsData.totalRevenue; // Fallback to budget sum if no payment records

  // PERFORMANCE FIX: Batch queries instead of N+1
  // Collect all job and contractor IDs
  const jobIds = activeJobs.map(j => j.id);
  const contractorIds = activeJobs
    .map(j => j.contractor_id)
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
  const { data: allContractors } = contractorIds.length > 0
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

  // Create lookup maps for O(1) access
  const photoMap = new Map<string, string>();
  allJobPhotos?.forEach(photo => {
    if (!photoMap.has(photo.job_id)) {
      photoMap.set(photo.job_id, photo.file_url);
    }
  });

  const bidCountMap = new Map<string, number>();
  allBidCounts?.forEach(bid => {
    const current = bidCountMap.get(bid.job_id) || 0;
    bidCountMap.set(bid.job_id, current + 1);
  });

  const contractorMap = new Map(
    allContractors?.map(c => [c.id, c]) || []
  );

  const progressMap = new Map(
    allJobProgress?.map(p => [p.job_id, p.progress_percentage]) || []
  );

  // Map data in memory (no more queries!)
  const jobsWithContractors = activeJobs.map(job => {
    const contractor = job.contractor_id ? contractorMap.get(job.contractor_id) : undefined;
    const progress = progressMap.get(job.id);
    const photoUrl = photoMap.get(job.id) || null;
    const bidsCount = bidCountMap.get(job.id) || 0;

    return {
      id: job.id,
      title: job.title || 'Untitled Job',
      status: job.status,
      budget: job.budget || 0,
      category: typeof job.category === 'string' ? job.category : undefined,
      contractor: contractor ? {
        name: `${contractor.first_name} ${contractor.last_name}`.trim(),
        image: contractor.profile_image_url,
      } : undefined,
      progress: progress ? parseFloat(progress.toString()) : 0,
      bidsCount: job.contractor_id ? 0 : bidsCount,
      scheduledDate: typeof job.scheduled_date === 'string' ? job.scheduled_date : undefined,
      photoUrl,
    };
  });

  // Prepare pending bids for the "Bids Received" section
  const pendingBids = allBids
    .filter((bid) => bid.status === 'pending')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)
    .map((bid) => ({
      id: bid.id,
      amount: Number(bid.amount || bid.total_amount || 0),
      jobId: bid.job?.id || '',
      jobTitle: bid.job?.title || 'Untitled Job',
      contractorName: bid.contractor
        ? `${bid.contractor.first_name || ''} ${bid.contractor.last_name || ''}`.trim() || 'Contractor'
        : 'Contractor',
      contractorImage: bid.contractor?.profile_image_url || undefined,
      createdAt: bid.created_at,
    }));

  // Fetch real notifications for recent activity
  const { data: notifications } = await serverSupabase
    .from('notifications')
    .select('id, type, title, message, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  const recentActivity = (notifications && notifications.length > 0)
    ? notifications.map((n: { id: string; type?: string; title?: string; message?: string; created_at: string }) => ({
        id: n.id,
        type: n.type || 'info',
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
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);

  // Fetch upcoming appointments from the appointments table
  const { data: appointmentsData } = await serverSupabase
    .from('appointments')
    .select(`
      id, title, appointment_date, start_time, end_time,
      location_type, status, notes,
      contractor:profiles!contractor_id(id, first_name, last_name)
    `)
    .eq('client_id', user.id)
    .gte('appointment_date', new Date().toISOString().split('T')[0])
    .in('status', ['scheduled', 'confirmed'])
    .order('appointment_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(5);

  // Supabase FK joins return arrays; extract first element
  const upcomingAppointments = (appointmentsData || []).map((apt: Record<string, unknown>) => {
    const contractor = Array.isArray(apt.contractor) ? apt.contractor[0] : apt.contractor;
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
  });

  // Prepare dashboard data for professional component
  const professionalDashboardData = {
    homeowner: {
      id: user.id,
      name: userDisplayName,
      avatar: homeownerProfile?.profile_image_url,
      location: '',
      email: user.email || '',
    },
    metrics: {
      totalSpent,
      activeJobs: activeJobs.length,
      completedJobs: completedJobs.length,
      savedContractors: 0, // TODO: Add saved contractors feature
    },
    activeJobs: jobsWithContractors,
    pendingBids,
    recentActivity,
    upcomingAppointments,
    recommendations,
  };

  return (
    <ErrorBoundary>
      <OnboardingWrapper
        userType="homeowner"
        autoStart={!onboardingStatus.completed}
      >
        <DashboardClient data={professionalDashboardData} />
      </OnboardingWrapper>
    </ErrorBoundary>
  );
}
