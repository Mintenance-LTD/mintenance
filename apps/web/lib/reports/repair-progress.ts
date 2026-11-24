import { serverSupabase } from '@/lib/api/supabaseServer';
import type { ReportRepairProgress } from '@mintenance/shared';

export async function readReportRepairProgress(
  jobId: string,
  propertyId: string
): Promise<ReportRepairProgress | null> {
  const job = await serverSupabase
    .from('jobs')
    .select('created_at,started_at,completed_at,status,homeowner_id')
    .eq('id', jobId)
    .eq('property_id', propertyId)
    .maybeSingle();
  if (job.error) throw job.error;
  if (!job.data?.created_at) return null;

  const visit = await serverSupabase
    .from('appointments')
    .select('appointment_date,start_time,end_time')
    .eq('job_id', jobId)
    .eq('client_id', job.data.homeowner_id)
    .eq('client_response', 'confirmed')
    .in('status', [
      'scheduled',
      'confirmed',
      'rescheduled',
      'in_progress',
      'completed',
    ])
    .order('appointment_date', { ascending: false })
    .order('start_time', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    createdAt: job.data.created_at,
    startedAt: job.data.started_at,
    completedAt: job.data.status === 'completed' ? job.data.completed_at : null,
    confirmedVisit: visit.data
      ? {
          date: visit.data.appointment_date,
          start: visit.data.start_time,
          end: visit.data.end_time,
        }
      : null,
    visitUnavailable: !!visit.error,
  };
}
