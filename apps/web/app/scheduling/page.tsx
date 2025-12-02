import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { fetchJobsWithRelations, fetchContractsForJobs, fetchMeetingsForUser } from '@/lib/queries/scheduling';
import {
  transformJobsToEvents,
  transformMeetingsToEvents,
  transformSubscriptionsToEvents,
  combineAndSortEvents,
} from './lib/event-transformer';
import { SchedulingClient2025 } from './components/SchedulingClient2025';
import type { JobWithContract, Meeting, SubscriptionWithName } from './lib/types';

export default async function SchedulingPage2025() {
  const user = await getCurrentUserFromCookies();

  if (!user) {
    redirect('/login?redirect=/scheduling');
  }

  if (user.role !== 'homeowner' && user.role !== 'contractor') {
    redirect('/login');
  }

  // Fetch jobs
  const jobs = await unstable_cache(
    async () => fetchJobsWithRelations(user.id, user.role as 'homeowner' | 'contractor'),
    [`jobs-${user.id}-${user.role}`],
    { revalidate: 60 }
  )();

  // For contractors, fetch viewed jobs and bids
  let viewedJobIds: Set<string> = new Set();
  let bidJobIds: Set<string> = new Set();
  if (user.role === 'contractor') {
    const [jobViewsResult, bidsResult] = await Promise.all([
      unstable_cache(
        async () => {
          const { data } = await serverSupabase
            .from('job_views')
            .select('job_id')
            .eq('contractor_id', user.id);
          return data || [];
        },
        [`job-views-${user.id}`],
        { revalidate: 60 }
      )(),
      unstable_cache(
        async () => {
          const { data } = await serverSupabase
            .from('bids')
            .select('job_id')
            .eq('contractor_id', user.id);
          return data || [];
        },
        [`bids-${user.id}`],
        { revalidate: 60 }
      )(),
    ]);

    viewedJobIds = new Set((jobViewsResult || []).map(v => v.job_id));
    bidJobIds = new Set((bidsResult || []).map(b => b.job_id));
  }

  // Fetch contracts
  const jobIds = jobs.map(job => job.id);
  const contractsMap = await fetchContractsForJobs(jobIds);

  // Attach contracts to jobs
  const jobsWithContracts = jobs.map((job) => {
    const contractor = Array.isArray(job.contractor) ? job.contractor[0] : job.contractor;
    const homeowner = Array.isArray(job.homeowner) ? job.homeowner[0] : job.homeowner;

    return {
      ...job,
      contractor: contractor || null,
      homeowner: homeowner || null,
      contract: contractsMap.get(job.id) || null,
      isViewed: user.role === 'contractor' ? viewedJobIds.has(job.id) : true,
      hasBid: user.role === 'contractor' ? bidJobIds.has(job.id) : false,
    };
  });

  // Fetch subscriptions and meetings
  const [subscriptionsResult, meetings] = await Promise.all([
    unstable_cache(
      async () => {
        const { data } = await serverSupabase
          .from('subscriptions')
          .select('id, name, next_billing_date, status, created_at')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .not('next_billing_date', 'is', null)
          .order('next_billing_date', { ascending: true });
        return data || [];
      },
      [`subscriptions-${user.id}`],
      { revalidate: 300 }
    )(),
    unstable_cache(
      async () => fetchMeetingsForUser(user.id),
      [`meetings-${user.id}`],
      { revalidate: 300 }
    )(),
  ]);

  const subscriptions = subscriptionsResult as SubscriptionWithName[];

  // Transform to events
  const jobEvents = transformJobsToEvents(jobsWithContracts as JobWithContract[], {
    userId: user.id,
    userRole: user.role as 'homeowner' | 'contractor',
    viewedJobIds,
    bidJobIds,
  });

  const appointmentEvents = transformMeetingsToEvents((meetings || []) as Meeting[]);
  const maintenanceEvents = transformSubscriptionsToEvents(subscriptions || []);

  // Combine all events
  const allEvents = combineAndSortEvents(jobEvents, appointmentEvents, maintenanceEvents);

  const userDisplayName = user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`.trim()
    : user.email;

  // Fetch user profile
  const { data: userProfile } = await serverSupabase
    .from('users')
    .select('profile_image_url, email')
    .eq('id', user.id)
    .single();

  return (
    <SchedulingClient2025
      events={allEvents}
      userInfo={{
        id: user.id,
        name: userDisplayName,
        email: userProfile?.email || user.email,
        avatar: userProfile?.profile_image_url,
        role: user.role,
      }}
    />
  );
}
