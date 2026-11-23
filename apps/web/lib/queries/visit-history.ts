import { serverSupabase } from '@/lib/api/supabaseServer';
import type {
  VisitEvent,
  VisitRecord,
  VisitSlot,
} from '@/lib/scheduling/visit-history';

type Actor = { id: string; role: string; email?: string | null };
type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};
type Job = {
  id: string;
  title: string;
  homeowner_id: string;
  payer_user_id: string | null;
};
type Relation<T> = T | T[] | null;
type RawSlot = Omit<VisitSlot, 'respondent'> & { respondedBy?: string | null };
type HistoryRow = {
  id: number;
  appointment_id: string;
  kind: VisitEvent['kind'];
  previous_slot: RawSlot | null;
  slot: RawSlot;
  created_at: string;
};

function one<T>(row: Relation<T>) {
  return Array.isArray(row) ? row[0] : row;
}

function participant(row: Relation<Profile>) {
  const profile = one(row);
  return profile
    ? {
        id: profile.id,
        name: [profile.first_name, profile.last_name].filter(Boolean).join(' '),
      }
    : undefined;
}

/** Scope each appointment before reading any corresponding history. */
export async function readVisitRecords(
  actor: Actor,
  selector: { id: string } | { jobId: string }
) {
  if (!['homeowner', 'contractor'].includes(actor.role)) return [];
  let query = serverSupabase.from('appointments').select(`
    id,title,appointment_date,start_time,end_time,status,client_id,client_email,contractor_id,
    client_response,client_response_at,location_type,location_address,
    contractor:profiles!contractor_id(id,first_name,last_name),
    client:profiles!client_id(id,first_name,last_name),
    job:jobs!job_id(id,title,homeowner_id,payer_user_id)
  `);
  query =
    'id' in selector
      ? query.eq('id', selector.id)
      : query.eq('job_id', selector.jobId);
  if (actor.role === 'contractor') query = query.eq('contractor_id', actor.id);
  const { data, error } = await query
    .order('appointment_date', { ascending: false })
    .order('start_time', { ascending: false });
  if (error) throw error;

  const visits: VisitRecord[] = [];
  for (const row of data ?? []) {
    const job = one(row.job as Relation<Job>);
    const isClient = row.client_id === actor.id;
    const legacyClient =
      !row.client_id &&
      !!actor.email &&
      row.client_email?.toLowerCase() === actor.email.toLowerCase();
    const canRead =
      actor.role === 'contractor'
        ? row.contractor_id === actor.id
        : isClient ||
          legacyClient ||
          job?.homeowner_id === actor.id ||
          job?.payer_user_id === actor.id;
    if (!canRead) continue;
    visits.push({
      id: row.id,
      title: row.title,
      date: row.appointment_date,
      time: row.start_time,
      endTime: row.end_time,
      status: row.status,
      clientResponse: row.client_response,
      clientResponseAt: row.client_response_at,
      locationAddress: row.location_address,
      locationType: row.location_type,
      canRespond: actor.role === 'homeowner' && isClient,
      client: participant(row.client as Relation<Profile>),
      contractor: participant(row.contractor as Relation<Profile>),
      job: job ? { id: job.id, title: job.title } : undefined,
      history: [],
    });
  }
  if (visits.length === 0) return visits;

  const byId = new Map(visits.map((visit) => [visit.id, visit]));
  const { data: history, error: historyError } = await serverSupabase
    .from('appointment_visit_history')
    .select('id,appointment_id,kind,previous_slot,slot,created_at')
    .in(
      'appointment_id',
      visits.map((visit) => visit.id)
    )
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });
  if (historyError) throw historyError;

  for (const row of (history ?? []) as HistoryRow[]) {
    const visit = byId.get(row.appointment_id);
    if (!visit) continue;
    const nameSlot = ({ respondedBy, ...slot }: RawSlot): VisitSlot => ({
      ...slot,
      respondent:
        respondedBy && respondedBy === visit.client?.id
          ? visit.client.name
          : null,
    });
    visit.history?.push({
      id: row.id,
      kind: row.kind,
      slot: nameSlot(row.slot),
      previousSlot: row.previous_slot ? nameSlot(row.previous_slot) : null,
      recordedAt: row.created_at,
    });
  }
  return visits;
}
