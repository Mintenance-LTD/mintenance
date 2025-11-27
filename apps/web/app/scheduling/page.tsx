import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
import { PageHeader } from '@/components/layouts/PageHeader';
import { Calendar } from '@/components/Calendar/Calendar';
import { SchedulingKpiCards } from './components/SchedulingKpiCards';
import { fetchJobsWithRelations, fetchContractsForJobs, fetchMeetingsForUser } from '@/lib/queries/scheduling';

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

  const subscriptions = subscriptionsResult;

  // Transform jobs to calendar events
  // Create multiple events per job: posted date and scheduled date (if different)
  const jobEvents: Array<{
    id: string;
    title: string;
    date: Date | string; // Allow string for serialization
    type: 'job' | 'maintenance' | 'inspection';
    status?: string;
  }> = [];

  jobsWithContracts.forEach((jobWithContract) => {
    const job = jobWithContract;
    const contractor = Array.isArray(job.contractor) ? job.contractor[0] : job.contractor;
    const homeowner = Array.isArray(job.homeowner) ? job.homeowner[0] : job.homeowner;
    const contractorName = contractor
      ? `${contractor.first_name} ${contractor.last_name}`.trim()
      : null;
    const homeownerName = homeowner
      ? `${homeowner.first_name} ${homeowner.last_name}`.trim()
      : null;

    const postedDate = new Date(job.created_at);

    // Validate dates
    if (isNaN(postedDate.getTime())) {
      console.warn('Invalid posted date for job:', job.id, job.created_at);
      return; // Skip this job
    }

    // Only add posted date event if contractor has viewed the job (or if user is homeowner)
    // For contractors, only show "Posted" events for jobs they've actually viewed
    // Scheduled events will still appear for jobs with bids (handled separately)
    if (jobWithContract.isViewed || user.role === 'homeowner') {
      // Calculate days since posted
      const daysSincePosted = Math.floor((new Date().getTime() - postedDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysText = daysSincePosted === 0 ? 'Today' :
        daysSincePosted === 1 ? '1 day ago' :
          `${daysSincePosted} days ago`;

      // Add posted date event (use ISO string for proper serialization)
      jobEvents.push({
        id: `job-posted-${job.id}`,
        title: `Posted: ${job.title || 'Untitled Job'} (${daysText})`,
        date: postedDate.toISOString(), // Serialize as ISO string
        type: 'job' as const,
        status: job.status,
      });
    }

    // Determine the scheduled date - prefer scheduled_start_date, then contract start_date
    // Only use contract dates if contract is accepted or both parties have signed
    const contract = jobWithContract.contract;
    const isContractAccepted = contract && (
      contract.status === 'accepted' ||
      (contract.contractor_signed_at && contract.homeowner_signed_at)
    );

    let scheduledDate: Date | null = null;
    if (job.scheduled_start_date) {
      scheduledDate = new Date(job.scheduled_start_date);
    } else if (contract?.start_date && isContractAccepted) {
      scheduledDate = new Date(contract.start_date);
    }

    // If job has a scheduled date, add scheduled event
    // For contractors: show scheduled events if they've viewed the job OR if they have a bid on it
    // For homeowners: always show scheduled events
    const shouldShowScheduledEvent = user.role === 'homeowner' ||
      jobWithContract.isViewed ||
      jobWithContract.hasBid;

    if (scheduledDate && !isNaN(scheduledDate.getTime()) && shouldShowScheduledEvent) {
      // Create appropriate title based on user role
      let scheduledTitle = job.title || 'Job';
      if (user.role === 'homeowner' && contractorName) {
        scheduledTitle = `${job.title || 'Job'} with ${contractorName}`;
      } else if (user.role === 'contractor' && homeownerName) {
        scheduledTitle = `${job.title || 'Job'} for ${homeownerName}`;
      } else {
        scheduledTitle = job.title || 'Job';
      }

      // Add start date event
      jobEvents.push({
        id: `appointment-${job.id}`,
        title: scheduledTitle,
        date: scheduledDate.toISOString(), // Serialize as ISO string
        type: 'inspection' as const,
        status: job.status,
      });

      // If there's an end date, also add it (optional - for multi-day jobs)
      if (job.scheduled_end_date) {
        const endDate = new Date(job.scheduled_end_date);
        if (!isNaN(endDate.getTime()) && endDate.getTime() !== scheduledDate.getTime()) {
          jobEvents.push({
            id: `appointment-end-${job.id}`,
            title: `${scheduledTitle} (End)`,
            date: endDate.toISOString(),
            type: 'inspection' as const,
            status: job.status,
          });
        }
      } else if (contract?.end_date && isContractAccepted) {
        const endDate = new Date(contract.end_date);
        if (!isNaN(endDate.getTime()) && endDate.getTime() !== scheduledDate.getTime()) {
          jobEvents.push({
            id: `appointment-end-${job.id}`,
            title: `${scheduledTitle} (End)`,
            date: endDate.toISOString(),
            type: 'inspection' as const,
            status: job.status,
          });
        }
      }
    }
  });

  // Transform meetings to appointment calendar events
  const appointmentEvents = (meetings || []).map(meeting => {
    const contractor = Array.isArray(meeting.contractor) ? meeting.contractor[0] : meeting.contractor;
    const job = Array.isArray(meeting.job) ? meeting.job[0] : meeting.job;
    const contractorName = contractor
      ? `${contractor.first_name} ${contractor.last_name}`.trim()
      : 'Contractor';
    const jobTitle = job?.title || 'Meeting';
    const meetingTypeLabel = meeting.meeting_type === 'site_visit' ? 'Site Visit' :
      meeting.meeting_type === 'consultation' ? 'Consultation' :
        meeting.meeting_type === 'work_session' ? 'Work Session' : 'Meeting';

    const meetingDate = new Date(meeting.scheduled_datetime);
    if (isNaN(meetingDate.getTime())) {
      console.warn('Invalid meeting date:', meeting.id, meeting.scheduled_datetime);
      return null;
    }

    return {
      id: `meeting-${meeting.id}`,
      title: `${meetingTypeLabel}: ${jobTitle} with ${contractorName}`,
      date: meetingDate.toISOString(), // Serialize as ISO string
      type: 'inspection' as const,
      status: meeting.status,
    };
  }).filter(Boolean) as Array<{
    id: string;
    title: string;
    date: string;
    type: 'inspection';
    status?: string;
  }>;

  // Transform subscriptions to maintenance calendar events
  const maintenanceEvents = (subscriptions || []).map(sub => {
    const billingDate = new Date(sub.next_billing_date!);
    if (isNaN(billingDate.getTime())) {
      console.warn('Invalid billing date for subscription:', sub.id, sub.next_billing_date);
      return null;
    }

    return {
      id: `maintenance-${sub.id}`,
      title: (sub as any).name || 'Maintenance Service',
      date: billingDate.toISOString(), // Serialize as ISO string
      type: 'maintenance' as const,
    };
  }).filter(Boolean) as Array<{
    id: string;
    title: string;
    date: string;
    type: 'maintenance';
    status?: string;
  }>;

  // Combine all real events and sort by date
  const allEvents = [...jobEvents, ...appointmentEvents, ...maintenanceEvents].sort((a, b) => {
    const dateA = typeof a.date === 'string' ? new Date(a.date).getTime() : a.date.getTime();
    const dateB = typeof b.date === 'string' ? new Date(b.date).getTime() : b.date.getTime();
    return dateA - dateB;
  });

  // Debug: Log events to console (always log for now to debug)
  console.log('📅 Calendar Events Debug:', {
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

  // Shared content for both roles
  const PageContent = () => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 320px',
      gap: '24px',
      alignItems: 'start',
    }}>
      {/* Calendar - Left Side (Larger) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <Calendar events={allEvents} />
      </div>

      {/* Additional KPIs - Right Side (Narrower) */}
      <div>
        <SchedulingKpiCards />
      </div>
    </div>
  );

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
            <PageContent />
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
          <PageContent />
        </div>
      </main>
    </div>
  );
}


