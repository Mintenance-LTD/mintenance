import { headers } from 'next/headers';
import { getCurrentUserFromHeaders, getCurrentUserFromCookies } from '@/lib/auth';
import UnauthenticatedCard from '@/components/UnauthenticatedCard';
import { OnboardingWrapper } from '@/components/onboarding/OnboardingWrapper';
import { DashboardClient } from './components/DashboardClient';
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

  const totalSpent = kpiData.jobsData.totalRevenue;

  // Get contractor information for jobs
  const jobsWithContractors = await Promise.all(
    activeJobs.map(async (job) => {
      // Fetch job photos/attachments
      const { data: jobPhotos } = await serverSupabase
        .from('job_attachments')
        .select('file_url, file_type')
        .eq('job_id', job.id)
        .eq('file_type', 'image')
        .order('uploaded_at', { ascending: false })
        .limit(1);

      const photoUrl = jobPhotos && jobPhotos.length > 0 ? jobPhotos[0].file_url : null;

      if (!job.contractor_id) {
        // Get bid count for jobs without contractors
        const { count } = await serverSupabase
          .from('bids')
          .select('*', { count: 'exact', head: true })
          .eq('job_id', job.id);

        return {
          id: job.id,
          title: job.title || 'Untitled Job',
          status: job.status,
          budget: job.budget || 0,
          category: typeof job.category === 'string' ? job.category : undefined,
          progress: 0,
          bidsCount: count || 0,
          scheduledDate: typeof job.scheduled_date === 'string' ? job.scheduled_date : undefined,
          photoUrl,
        };
      }

      // Get contractor details
      const { data: contractor } = await serverSupabase
        .from('users')
        .select('first_name, last_name, profile_image_url')
        .eq('id', job.contractor_id)
        .single();

      // Get job progress
      const { data: progressData } = await serverSupabase
        .from('job_progress')
        .select('progress_percentage')
        .eq('job_id', job.id)
        .single();

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
        progress: progressData?.progress_percentage ? parseFloat(progressData.progress_percentage.toString()) : 0,
        bidsCount: 0,
        scheduledDate: typeof job.scheduled_date === 'string' ? job.scheduled_date : undefined,
        photoUrl,
      };
    })
  );

  // Prepare timeline events
  const recentActivity = [
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
    recentActivity,
  };

  return (
    <OnboardingWrapper
      userType="homeowner"
      autoStart={!onboardingStatus.completed}
    >
      {/* Use the new dashboard with Airbnb-style search */}
      <DashboardClient data={professionalDashboardData} />
    </OnboardingWrapper>
  );
}
