import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
import { PageHeader } from '@/components/layouts/PageHeader';
import { PageContent } from './components/PageContent';
import { fetchJobsWithRelations, fetchContractsForJobs, fetchMeetingsForUser } from '@/lib/queries/scheduling';
import { logger } from '@mintenance/shared';
import {
  transformJobsToEvents,
  transformMeetingsToEvents,
  transformSubscriptionsToEvents,
  combineAndSortEvents,
} from './lib/event-transformer';
import type { JobWithContract, Meeting, SubscriptionWithName } from './lib/types';

export default async function SchedulingPage() {
  const user = await getCurrentUserFromCookies();

  if (!user) {
    redirect('/login?redirect=/scheduling');
  }

  if (user.role !== 'homeowner' && user.role !== 'contractor') {
    redirect('/login');
  }

  // Fetch jobs with optimized queries using joins (no N+1) - cached for 60s
  const jobs = await unstable_cache(
    async () => fetchJobsWithRelations(user.id, user.role as 'homeowner' | 'contractor'),
    [`jobs-${user.id}-${user.role}`],
    { revalidate: 60 }
  )();

  // For contractors, fetch which jobs they've viewed and which they've bid on (cached)
  let viewedJobIds: Set<string> = new Set();
  let bidJobIds: Set<string> = new Set();
  if (user.role === 'contractor') {
    // Fetch viewed jobs and bids in parallel with caching (60s revalidation)
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

  // Batch fetch contracts for all jobs in a single query
  const jobIds = jobs.map(job => job.id);
  const contractsMap = await fetchContractsForJobs(jobIds);

  // Attach contracts and metadata to jobs
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

  // Fetch subscriptions and meetings in parallel with caching
  const [subscriptionsResult, meetings] = await Promise.all([
    // Cached subscriptions query (300s revalidation - less frequently changing)
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
    // Cached meetings query (300s revalidation)
    unstable_cache(
      async () => fetchMeetingsForUser(user.id),
      [`meetings-${user.id}`],
      { revalidate: 300 }
    )(),
  ]);

  const subscriptions = subscriptionsResult as SubscriptionWithName[];

  // Transform all data to calendar events using extracted transformer functions
  const jobEvents = transformJobsToEvents(jobsWithContracts as JobWithContract[], {
    userId: user.id,
    userRole: user.role as 'homeowner' | 'contractor',
    viewedJobIds,
    bidJobIds,
  });

  const appointmentEvents = transformMeetingsToEvents((meetings || []) as Meeting[]);
  const maintenanceEvents = transformSubscriptionsToEvents(subscriptions || []);

  // Combine and sort all events
  const allEvents = combineAndSortEvents(jobEvents, appointmentEvents, maintenanceEvents);

  // Debug: Log events state
  logger.debug('[SchedulingPage] Calendar events state', {
    totalEvents: allEvents.length,
    jobEvents: jobEvents.length,
    appointmentEvents: appointmentEvents.length,
    maintenanceEvents: maintenanceEvents.length,
    jobsCount: jobs?.length || 0,
    jobsWithContractsCount: jobsWithContracts.length,
    events: allEvents.map(e => {
      const eventDate = typeof e.date === 'string' ? new Date(e.date) : e.date;
      const dateStr = typeof e.date === 'string' ? e.date : e.date.toISOString();
      const dateParts = dateStr.split('T')[0].split('-');
      return {
        id: e.id,
        title: e.title,
        dateISO: dateStr,
        dateLocal: eventDate.toLocaleDateString(),
        year: dateParts[0],
        month: dateParts[1],
        day: dateParts[2],
        type: e.type,
        status: 'status' in e ? e.status : undefined
      };
    }),
    scheduledJobs: jobsWithContracts.filter(j => {
      const hasScheduled = j.scheduled_start_date || j.contract?.start_date;
      return hasScheduled;
    }).map(j => ({
      id: j.id,
      title: j.title,
      scheduled_start_date: j.scheduled_start_date,
      contract_start_date: j.contract?.start_date,
      contract_status: j.contract?.status,
      contractor_signed: j.contract?.contractor_signed_at,
      homeowner_signed: j.contract?.homeowner_signed_at,
      status: j.status
    })),
    allJobs: jobsWithContracts.map(j => ({
      id: j.id,
      title: j.title,
      status: j.status,
      hasContract: !!j.contract,
      scheduled_start_date: j.scheduled_start_date,
    }))
  });

  // Get contractor/homeowner profiles with caching (300s revalidation - profiles change infrequently)
  const [contractorProfile, homeownerProfile] = await Promise.all([
    user.role === 'contractor'
      ? unstable_cache(
          async () => {
            const { data } = await serverSupabase
              .from('users')
              .select('first_name, last_name, company_name, profile_image_url, city, country')
              .eq('id', user.id)
              .single();
            return data;
          },
          [`contractor-profile-${user.id}`],
          { revalidate: 300 }
        )()
      : Promise.resolve(null),
    user.role === 'homeowner'
      ? unstable_cache(
          async () => {
            const { data } = await serverSupabase
              .from('users')
              .select('first_name, last_name, profile_image_url, email')
              .eq('id', user.id)
              .single();
            return data;
          },
          [`homeowner-profile-${user.id}`],
          { revalidate: 300 }
        )()
      : Promise.resolve(null),
  ]);

  const userDisplayName = user.first_name
    ? `${user.first_name} ${user.last_name}`.trim()
    : user.email;

  const homeownerDisplayName = homeownerProfile
    ? `${homeownerProfile.first_name} ${homeownerProfile.last_name}`.trim() || user.email
    : user.email;

  // Shared content for both roles - now extracted to client component

  if (user.role === 'contractor') {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <UnifiedSidebar
          userRole="contractor"
          userInfo={{
            name: userDisplayName,
            email: user.email,
            avatar: contractorProfile?.profile_image_url,
          }}
        />

        <main className="flex flex-col flex-1 ml-[240px]">
          <PageHeader
            title="Scheduling (Calendar)"
            showSearch={true}
            darkBackground={true}
            userName={userDisplayName}
            userAvatar={contractorProfile?.profile_image_url}
          />

          <div style={{ padding: '32px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
            <PageContent events={allEvents} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <UnifiedSidebar
        userRole="homeowner"
        userInfo={{
          name: homeownerDisplayName,
          email: homeownerProfile?.email || user.email,
          avatar: homeownerProfile?.profile_image_url,
        }}
      />

      <main className="flex flex-col flex-1 ml-[240px]">
        <PageHeader
          title="Scheduling (Calendar)"
          showSearch={true}
          darkBackground={true}
          userName={homeownerDisplayName}
          userAvatar={homeownerProfile?.profile_image_url}
        />

        <div style={{ padding: '32px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
          <PageContent events={allEvents} />
        </div>
      </main>
    </div>
  );
}


