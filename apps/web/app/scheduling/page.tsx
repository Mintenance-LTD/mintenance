import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { redirect } from 'next/navigation';
import { HomeownerLayoutShell } from '../dashboard/components/HomeownerLayoutShell';
import { ContractorLayoutShell } from '@/app/contractor/components/ContractorLayoutShell';
import { Calendar } from '@/components/Calendar/Calendar';
import { theme } from '@/lib/theme';

export default async function SchedulingPage() {
  const user = await getCurrentUserFromCookies();

  if (!user) {
    redirect('/login?redirect=/scheduling');
  }

  // Fetch ALL jobs for this user (homeowner or contractor)
  // Also fetch contractor/homeowner info for jobs with scheduled dates
  // Note: scheduled_date column doesn't exist, only scheduled_start_date and scheduled_end_date

  // Filter by role
  let jobs: any[] = [];
  
  if (user.role === 'homeowner') {
    // Homeowners see all their jobs - simplified query without joins
    const { data: homeownerJobs, error: homeownerError } = await serverSupabase
      .from('jobs')
      .select(`
        id, 
        title, 
        status, 
        scheduled_start_date,
        scheduled_end_date,
        created_at,
        contractor_id,
        homeowner_id
      `)
      .eq('homeowner_id', user.id)
      .order('created_at', { ascending: false });
    
    if (homeownerError) {
      console.error('Error fetching homeowner jobs:', JSON.stringify(homeownerError, null, 2));
    }
    
    // Fetch contractor/homeowner info separately
    const homeownerJobsWithUsers = await Promise.all((homeownerJobs || []).map(async (job) => {
      const [contractorData, homeownerData] = await Promise.all([
        job.contractor_id ? serverSupabase
          .from('users')
          .select('id, first_name, last_name')
          .eq('id', job.contractor_id)
          .single() : { data: null },
        job.homeowner_id ? serverSupabase
          .from('users')
          .select('id, first_name, last_name')
          .eq('id', job.homeowner_id)
          .single() : { data: null },
      ]);
      
      return {
        ...job,
        contractor: contractorData.data || null,
        homeowner: homeownerData.data || null,
      };
    }));
    
    jobs = homeownerJobsWithUsers;
  } else if (user.role === 'contractor') {
    // Contractors see:
    // 1. Jobs where they're assigned (contractor_id = user.id)
    // 2. Jobs where they have bids (may have scheduling info)
    
    // Get assigned jobs - simplified query without joins to avoid relationship issues
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
        homeowner_id
      `)
      .eq('contractor_id', user.id)
      .order('created_at', { ascending: false });
    
    if (assignedError) {
      console.error('Error fetching assigned jobs:', JSON.stringify(assignedError, null, 2));
    }
    
    // Fetch contractor/homeowner info separately if needed
    const assignedJobsWithUsers = await Promise.all((assignedJobs || []).map(async (job) => {
      const [contractorData, homeownerData] = await Promise.all([
        job.contractor_id ? serverSupabase
          .from('users')
          .select('id, first_name, last_name')
          .eq('id', job.contractor_id)
          .single() : { data: null },
        job.homeowner_id ? serverSupabase
          .from('users')
          .select('id, first_name, last_name')
          .eq('id', job.homeowner_id)
          .single() : { data: null },
      ]);
      
      return {
        ...job,
        contractor: contractorData.data || null,
        homeowner: homeownerData.data || null,
      };
    }));
    
    // Get jobs where contractor has bids
    const { data: bids, error: bidsError } = await serverSupabase
      .from('bids')
      .select('job_id')
      .eq('contractor_id', user.id);
    
    if (bidsError) {
      console.error('Error fetching bids:', bidsError);
    }
    
    const bidJobIds = bids?.map(b => b.job_id).filter(Boolean) || [];
    
    let bidJobs: any[] = [];
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
          homeowner_id
        `)
        .in('id', bidJobIds)
        .order('created_at', { ascending: false });
      
      if (bidJobsError) {
        console.error('Error fetching jobs with bids:', JSON.stringify(bidJobsError, null, 2));
      }
      
      // Fetch contractor/homeowner info separately
      const bidJobsWithUsers = await Promise.all((jobsWithBids || []).map(async (job) => {
        const [contractorData, homeownerData] = await Promise.all([
          job.contractor_id ? serverSupabase
            .from('users')
            .select('id, first_name, last_name')
            .eq('id', job.contractor_id)
            .single() : { data: null },
          job.homeowner_id ? serverSupabase
            .from('users')
            .select('id, first_name, last_name')
            .eq('id', job.homeowner_id)
            .single() : { data: null },
        ]);
        
        return {
          ...job,
          contractor: contractorData.data || null,
          homeowner: homeownerData.data || null,
        };
      }));
      
      bidJobs = bidJobsWithUsers;
    }
    
    // Combine and deduplicate by job id
    const allJobsMap = new Map();
    (assignedJobsWithUsers || []).forEach(job => allJobsMap.set(job.id, job));
    (bidJobs || []).forEach(job => {
      if (!allJobsMap.has(job.id)) {
        allJobsMap.set(job.id, job);
      }
    });
    
    jobs = Array.from(allJobsMap.values());
    
    console.log('Contractor jobs debug:', {
      assignedJobsCount: assignedJobs?.length || 0,
      assignedJobs: assignedJobs?.map(j => ({ id: j.id, title: j.title })) || [],
      bidsCount: bids?.length || 0,
      bidJobIds: Array.from(bidJobIds),
      bidJobIdsCount: bidJobIds.length,
      bidJobsCount: bidJobs.length,
      bidJobs: bidJobs.map(j => ({ id: j.id, title: j.title })),
      totalJobsCount: jobs.length,
      jobs: jobs.map(j => ({ id: j.id, title: j.title, hasBid: j.hasBid, isViewed: j.isViewed })),
      userId: user.id,
    });
  } else {
    // Unknown role, redirect
    redirect('/login');
  }

  // For contractors, fetch which jobs they've viewed and which they've bid on
  let viewedJobIds: Set<string> = new Set();
  let bidJobIds: Set<string> = new Set();
  if (user.role === 'contractor') {
    // Fetch viewed jobs
    const { data: jobViews } = await serverSupabase
      .from('job_views')
      .select('job_id')
      .eq('contractor_id', user.id);
    viewedJobIds = new Set((jobViews || []).map(v => v.job_id));
    
    // Fetch jobs with bids
    const { data: bids } = await serverSupabase
      .from('bids')
      .select('job_id')
      .eq('contractor_id', user.id);
    bidJobIds = new Set((bids || []).map(b => b.job_id));
  }

  // Fetch contracts for jobs to get contract dates if job doesn't have scheduled dates
  const jobsWithContracts = await Promise.all(
    (jobs || []).map(async (job) => {
      try {
        const { data: contractData } = await serverSupabase
          .from('contracts')
          .select('start_date, end_date, status, contractor_signed_at, homeowner_signed_at')
          .eq('job_id', job.id)
          .single();

        return {
          ...job,
          contract: contractData,
          isViewed: user.role === 'contractor' ? viewedJobIds.has(job.id) : true, // Homeowners always see their jobs
          hasBid: user.role === 'contractor' ? bidJobIds.has(job.id) : false,
        };
      } catch {
        return {
          ...job,
          contract: null,
          isViewed: user.role === 'contractor' ? viewedJobIds.has(job.id) : true, // Homeowners always see their jobs
          hasBid: user.role === 'contractor' ? bidJobIds.has(job.id) : false,
        };
      }
    })
  );

  // Fetch active subscriptions with next billing dates (maintenance events)
  const { data: subscriptions } = await serverSupabase
    .from('subscriptions')
    .select('id, name, next_billing_date, status, created_at')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .not('next_billing_date', 'is', null)
    .order('next_billing_date', { ascending: true });

  // Fetch contractor-homeowner meetings/appointments
  // Try to fetch from contractor_meetings table if it exists
  let meetings: any[] = [];
  try {
    const { data: meetingsData } = await serverSupabase
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
      .or(`homeowner_id.eq.${user.id},contractor_id.eq.${user.id}`)
      .in('status', ['scheduled', 'confirmed'])
      .order('scheduled_datetime', { ascending: true });
    
    meetings = meetingsData || [];
  } catch (error) {
    // Table might not exist, that's okay - we'll just use jobs with scheduled dates
    console.log('contractor_meetings table not found, using jobs scheduled_date instead');
  }

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

  // Get contractor profile if user is contractor
  let contractorProfile = null;
  if (user.role === 'contractor') {
    const { data: contractor } = await serverSupabase
      .from('users')
      .select('first_name, last_name, company_name, profile_image_url, city, country')
      .eq('id', user.id)
      .single();
    contractorProfile = contractor;
  }

  // Use appropriate layout based on user role
  const LayoutShell = user.role === 'contractor' ? ContractorLayoutShell : HomeownerLayoutShell;
  const layoutProps = user.role === 'contractor' 
    ? { contractor: contractorProfile, email: user.email || '', userId: user.id }
    : { currentPath: '/scheduling' };

  return (
    <LayoutShell {...layoutProps}>
      <div style={{ 
        maxWidth: '1440px', 
        padding: `${theme.spacing.lg} ${theme.spacing.lg} ${theme.spacing.lg} ${theme.spacing.sm}`,
        minHeight: '400px'
      }}>
        <h1 style={{
          fontSize: theme.typography.fontSize['3xl'],
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.textPrimary,
          marginBottom: theme.spacing[6],
        }}>
          Scheduling
        </h1>

        <Calendar events={allEvents} />

        {/* Legend */}
        <div style={{
          marginTop: theme.spacing[6],
          display: 'flex',
          gap: theme.spacing[6],
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
            <div style={{
              width: '12px',
              height: '12px',
              backgroundColor: '#3B82F6',
              borderRadius: theme.borderRadius.sm,
            }} />
            <span style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
            }}>
              Jobs
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
            <div style={{
              width: '12px',
              height: '12px',
              backgroundColor: '#10B981',
              borderRadius: theme.borderRadius.sm,
            }} />
            <span style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
            }}>
              Maintenance
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
            <div style={{
              width: '12px',
              height: '12px',
              backgroundColor: '#F59E0B',
              borderRadius: theme.borderRadius.sm,
            }} />
            <span style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
            }}>
              Appointments & Inspections
            </span>
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}


