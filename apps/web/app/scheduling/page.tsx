import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { redirect } from 'next/navigation';
import { HomeownerLayoutShell } from '../dashboard/components/HomeownerLayoutShell';
import { Calendar } from '@/components/Calendar/Calendar';
import { theme } from '@/lib/theme';

export default async function SchedulingPage() {
  const user = await getCurrentUserFromCookies();

  if (!user) {
    redirect('/login?redirect=/scheduling');
  }

  // Fetch ALL jobs for this homeowner (not just scheduled ones)
  // Also fetch contractor info for jobs with scheduled dates
  const { data: jobs } = await serverSupabase
    .from('jobs')
    .select(`
      id, 
      title, 
      status, 
      scheduled_date, 
      created_at,
      contractor_id,
      contractor:users!jobs_contractor_id_fkey (
        id,
        first_name,
        last_name
      )
    `)
    .eq('homeowner_id', user.id)
    .order('created_at', { ascending: false }); // Most recent first for easier debugging

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

  (jobs || []).forEach(job => {
    const contractor = Array.isArray(job.contractor) ? job.contractor[0] : job.contractor;
    const contractorName = contractor 
      ? `${contractor.first_name} ${contractor.last_name}`.trim()
      : null;
    
    const postedDate = new Date(job.created_at);
    const scheduledDate = job.scheduled_date ? new Date(job.scheduled_date) : null;
    
    // Validate dates
    if (isNaN(postedDate.getTime())) {
      console.warn('Invalid posted date for job:', job.id, job.created_at);
      return; // Skip this job
    }
    
    // Calculate days since posted
    const daysSincePosted = Math.floor((new Date().getTime() - postedDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysText = daysSincePosted === 0 ? 'Today' :
                     daysSincePosted === 1 ? '1 day ago' :
                     `${daysSincePosted} days ago`;
    
    // Always add posted date event (use ISO string for proper serialization)
    jobEvents.push({
      id: `job-posted-${job.id}`,
      title: `Posted: ${job.title || 'Untitled Job'} (${daysText})`,
      date: postedDate.toISOString(), // Serialize as ISO string
      type: 'job' as const,
      status: job.status,
    });
    
    // If job has scheduled_date and contractor, add appointment event
    if (scheduledDate && !isNaN(scheduledDate.getTime()) && job.contractor_id && contractorName) {
      jobEvents.push({
        id: `appointment-${job.id}`,
        title: `Meeting: ${job.title || 'Job'} with ${contractorName}`,
        date: scheduledDate.toISOString(), // Serialize as ISO string
        type: 'inspection' as const,
        status: job.status,
      });
    } else if (scheduledDate && !isNaN(scheduledDate.getTime()) && !job.contractor_id) {
      // Scheduled but no contractor yet
      jobEvents.push({
        id: `job-scheduled-${job.id}`,
        title: `Scheduled: ${job.title || 'Untitled Job'}`,
        date: scheduledDate.toISOString(), // Serialize as ISO string
        type: 'job' as const,
        status: job.status,
      });
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

  // Debug: Log events to console (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('📅 Calendar Events Debug:', {
      totalEvents: allEvents.length,
      jobEvents: jobEvents.length,
      appointmentEvents: appointmentEvents.length,
      maintenanceEvents: maintenanceEvents.length,
      jobsCount: jobs?.length || 0,
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
          type: e.type
        };
      })
    });
  }

  return (
    <HomeownerLayoutShell currentPath="/scheduling">
      <div style={{ 
        maxWidth: '1440px', 
        margin: '0 auto', 
        padding: theme.spacing.lg,
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
    </HomeownerLayoutShell>
  );
}


