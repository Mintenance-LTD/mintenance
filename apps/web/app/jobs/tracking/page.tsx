import { headers } from 'next/headers';
import Link from 'next/link';
import { getCurrentUserFromHeaders, getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import UnauthenticatedCard from '@/components/UnauthenticatedCard';
import { Button } from '@/components/ui/Button';
import { theme } from '@/lib/theme';
import { MessageCircle } from 'lucide-react';
import type { Metadata } from 'next';
import { TrackingHeader } from './components/TrackingHeader';
import { JobListItem } from './components/JobListItem';
import { StatusTimeline } from './components/StatusTimeline';
import { LatestUpdates } from './components/LatestUpdates';

export const metadata: Metadata = {
  title: 'Job Tracking | Mintenance',
  description: 'Monitor the real-time status and progress of your active home maintenance jobs.',
};

export default async function JobTrackingPage() {
  const headersList = await headers();
  let user = getCurrentUserFromHeaders(headersList as unknown as Headers);
  if (!user) {
    user = await getCurrentUserFromCookies();
  }

  if (!user) {
    return <UnauthenticatedCard />;
  }

  if (user.role === 'contractor') {
    const { redirect } = await import('next/navigation');
    redirect('/contractor/dashboard-enhanced');
  }

  const { data: jobsData } = await serverSupabase
    .from('jobs')
    .select(`
      id, title, status, budget, category, created_at, updated_at, contractor_id,
      contractor:users!jobs_contractor_id_fkey ( id, first_name, last_name, profile_image_url )
    `)
    .eq('homeowner_id', user.id)
    .in('status', ['posted', 'assigned', 'in_progress'])
    .order('created_at', { ascending: false });

  const jobs = jobsData || [];
  const selectedJobRaw = jobs[0];
  const selectedJob = selectedJobRaw ? {
    ...selectedJobRaw,
    contractor: Array.isArray(selectedJobRaw.contractor) ? selectedJobRaw.contractor[0] : selectedJobRaw.contractor
  } : undefined;

  /**
   * Calculate progress percentage from the job status.
   * Mapping: posted=0%, assigned=25%, in_progress=50%, review=75%, completed=100%
   */
  function getProgressFromStatus(status: string | null | undefined): number {
    switch (status) {
      case 'draft':
      case 'open':
      case 'posted':
        return 0;
      case 'assigned':
        return 25;
      case 'in_progress':
        return 50;
      case 'review':
        return 75;
      case 'completed':
        return 100;
      default:
        return 0;
    }
  }

  const progressPercent = selectedJob ? getProgressFromStatus(selectedJob.status) : 0;

  interface SenderData { id: string; first_name: string; last_name: string; profile_image_url?: string; }
  interface JobMessage { id: string; content: string; created_at: string; sender_id: string; sender?: SenderData | SenderData[]; }

  let messages: JobMessage[] = [];
  if (selectedJob) {
    const { data: messagesData } = await serverSupabase
      .from('messages')
      .select(`id, content, created_at, sender_id, sender:users!messages_sender_id_fkey ( id, first_name, last_name, profile_image_url )`)
      .or(`job_id.eq.${selectedJob.id}`)
      .order('created_at', { ascending: false })
      .limit(10);
    messages = messagesData || [];
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: theme.colors.backgroundSecondary }}>
      <TrackingHeader userProfileImageUrl={(user as unknown as { profile_image_url?: string }).profile_image_url} />

      <main style={{ padding: `${theme.spacing[6]} ${theme.spacing[6]} ${theme.spacing[8]}` }}>
        {/* Title Section */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: theme.spacing[4], marginBottom: theme.spacing[8] }}>
          <div style={{ display: 'flex', minWidth: '288px', flexDirection: 'column', gap: theme.spacing[2] }}>
            <h1 style={{ fontSize: theme.typography.fontSize['4xl'], fontWeight: theme.typography.fontWeight.bold, color: theme.colors.textPrimary, margin: 0 }}>
              Job Tracking
            </h1>
            <p style={{ fontSize: theme.typography.fontSize.base, color: theme.colors.textSecondary, margin: 0 }}>
              Monitor the real-time status and progress of your active home maintenance jobs.
            </p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: theme.spacing[8] }} className="lg:grid-cols-3">
          {/* Left Column: Job List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
            <h2 style={{ fontSize: theme.typography.fontSize.xl, fontWeight: theme.typography.fontWeight.bold, color: theme.colors.textPrimary, padding: `0 ${theme.spacing[2]}`, margin: 0 }}>
              Active Jobs ({jobs.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2] }}>
              {jobs.map((job, index) => (
                <JobListItem key={job.id} job={job} isSelected={index === 0} />
              ))}
            </div>
          </div>

          {/* Right Column: Job Details */}
          <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: theme.spacing[6] }}>
            {selectedJob ? (
              <>
                {/* Header Section */}
                <div style={{ backgroundColor: theme.colors.surface, padding: theme.spacing[6], borderRadius: '18px', border: `1px solid ${theme.colors.border}` }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }} className="sm:flex-row sm:items-center sm:justify-between">
                    <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[4] }}>
                      {selectedJob.contractor?.profile_image_url ? (
                        <div style={{ backgroundImage: `url(${selectedJob.contractor.profile_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', aspectRatio: '1', width: '56px', height: '56px', borderRadius: theme.borderRadius.full }} />
                      ) : (
                        <div style={{ backgroundColor: theme.colors.primary, aspectRatio: '1', width: '56px', height: '56px', borderRadius: theme.borderRadius.full, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                          {selectedJob.contractor ? (selectedJob.contractor.first_name?.[0] || 'C') : '?'}
                        </div>
                      )}
                      <div>
                        <h3 style={{ fontSize: theme.typography.fontSize['2xl'], fontWeight: theme.typography.fontWeight.bold, color: theme.colors.textPrimary, margin: 0 }}>{selectedJob.title}</h3>
                        <p style={{ fontSize: theme.typography.fontSize.base, color: theme.colors.textSecondary, margin: 0 }}>
                          by {selectedJob.contractor ? `${selectedJob.contractor.first_name} ${selectedJob.contractor.last_name}` : 'Unassigned'}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: theme.spacing[2], width: '100%' }} className="sm:w-auto">
                      <Link href={`/jobs/${selectedJob.id}`} style={{ textDecoration: 'none', flex: 1 }} className="sm:flex-none">
                        <Button variant="primary" size="sm" className="w-full sm:w-auto"><MessageCircle className="h-4 w-4" /><span style={{ whiteSpace: 'nowrap' }}>Message Contractor</span></Button>
                      </Link>
                      <Link href={`/jobs/${selectedJob.id}`} style={{ textDecoration: 'none', flex: 1 }} className="sm:flex-initial">
                        <Button variant="outline" size="sm" className="w-full sm:w-auto"><span style={{ whiteSpace: 'nowrap' }}>View Job Details</span></Button>
                      </Link>
                    </div>
                  </div>

                  {/* Progress Bar -- derived from job status */}
                  <div style={{ marginTop: theme.spacing[6] }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: theme.spacing[1] }}>
                      <span style={{ fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.medium, color: theme.colors.textPrimary }}>Overall Progress</span>
                      <span style={{ fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.medium, color: theme.colors.primary }}>{progressPercent}%</span>
                    </div>
                    <div style={{ width: '100%', backgroundColor: theme.colors.border, borderRadius: '10px', height: '10px' }}>
                      <div style={{ backgroundColor: theme.colors.primary, height: '10px', borderRadius: '10px', width: `${progressPercent}%`, transition: 'width 0.4s ease-in-out' }} />
                    </div>
                  </div>
                </div>

                {/* Status Timeline & Updates Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: theme.spacing[6] }} className="xl:grid-cols-5">
                  <StatusTimeline createdAt={selectedJob.created_at} updatedAt={selectedJob.updated_at} />

                  <div style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: theme.spacing[6] }}>
                    <LatestUpdates messages={messages} />

                    {/* Quick Info */}
                    <div style={{ backgroundColor: theme.colors.surface, padding: theme.spacing[6], borderRadius: '18px', border: `1px solid ${theme.colors.border}` }}>
                      <h4 style={{ fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing[4] }}>Quick Info</h4>
                      <dl style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3], margin: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <dt style={{ fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.medium, color: theme.colors.textSecondary, margin: 0 }}>Scheduled For</dt>
                          <dd style={{ fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.textSecondary, fontStyle: 'italic', margin: 0 }}>Not yet scheduled</dd>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <dt style={{ fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.medium, color: theme.colors.textSecondary, margin: 0 }}>Total Quote</dt>
                          <dd style={{ fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.textPrimary, margin: 0 }}>£{selectedJob.budget?.toFixed(2) || '0.00'}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ gridColumn: 'span 2', backgroundColor: theme.colors.surface, padding: theme.spacing[8], borderRadius: '18px', border: `1px solid ${theme.colors.border}`, textAlign: 'center' }}>
                <p style={{ fontSize: theme.typography.fontSize.base, color: theme.colors.textSecondary }}>No active jobs. Post your first job to start tracking!</p>
                <Link href="/jobs/create" style={{ textDecoration: 'none', display: 'inline-block', marginTop: theme.spacing[4] }}>
                  <Button variant="primary" size="sm">Post a Job</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
