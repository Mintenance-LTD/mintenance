import { serverSupabase } from '@/lib/api/supabaseServer';
import { activeVisitStatuses } from '@/lib/scheduling/visit-history';

async function ownedCalendarJobIds(userId: string) {
  const { data: jobs, error } = await serverSupabase
    .from('jobs')
    .select('id')
    .or(`homeowner_id.eq.${userId},payer_user_id.eq.${userId}`);
  if (error) throw new Error('Unable to load calendar ownership');
  return (jobs || []).map((job) => job.id);
}

/** Visits are separate from the contractual job start/end. Scope before reading. */
export async function fetchCalendarAppointments(
  userId: string,
  role: 'homeowner' | 'contractor'
) {
  let query = serverSupabase
    .from('appointments')
    .select(
      'id,title,job_id,appointment_date,start_time,end_time,status,client_response,job:jobs!job_id(status)'
    )
    .in('status', [...activeVisitStatuses, 'completed', 'no_show']);
  if (role === 'contractor') {
    query = query.eq('contractor_id', userId);
  } else {
    const ids = await ownedCalendarJobIds(userId);
    query = query.or(
      [
        `client_id.eq.${userId}`,
        ...(ids.length ? [`job_id.in.(${ids.join(',')})`] : []),
      ].join(',')
    );
  }
  const { data, error } = await query.order('appointment_date', {
    ascending: true,
  });
  if (error) throw new Error('Unable to load visit appointments');
  return data || [];
}
