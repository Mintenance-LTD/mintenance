import { appointmentLocalTime } from '@/lib/utils/appointment-local-time';
import { appointmentTime } from './appointment-display';

export const activeVisitStatuses = [
  'scheduled',
  'confirmed',
  'rescheduled',
  'in_progress',
];
export const closedVisitStatuses = ['completed', 'cancelled', 'no_show'];

export interface VisitSlot {
  date: string;
  start: string;
  end: string;
  status: string;
  response: string;
  responseAt?: string | null;
  respondent?: string | null;
}

export interface VisitEvent {
  id: number;
  kind: 'scheduled' | 'rescheduled' | 'response' | 'status';
  previousSlot: VisitSlot | null;
  slot: VisitSlot;
  recordedAt: string;
}

export interface VisitRecord {
  id: string;
  title: string;
  date: string;
  time: string;
  endTime: string;
  status: string;
  clientResponse: string;
  locationAddress?: string | null;
  locationType?: string | null;
  clientResponseAt?: string | null;
  canRespond: boolean;
  client?: { id: string; name: string };
  contractor?: { id: string; name: string };
  job?: { id: string; title: string };
  history?: VisitEvent[];
}

export function visitHref(id: string, role?: 'homeowner' | 'contractor') {
  return `${role === 'contractor' ? '/contractor' : ''}/appointments/${encodeURIComponent(id)}`;
}

export function visitIsPast(
  visit: Pick<VisitRecord, 'status' | 'date'> & { endTime?: string },
  now = new Date()
) {
  const { date, time } = appointmentLocalTime(now);
  const end =
    visit.endTime?.length === 5
      ? `${visit.endTime}:00`
      : visit.endTime?.slice(0, 8);
  return (
    closedVisitStatuses.includes(visit.status) ||
    visit.date < date ||
    (visit.date === date && !!end && end <= time)
  );
}

export function canRespondToVisit(visit: VisitRecord) {
  return (
    visit.canRespond &&
    ['scheduled', 'confirmed', 'rescheduled'].includes(visit.status) &&
    !visitIsPast(visit)
  );
}

export function currentVisitSlot(visit: VisitRecord): VisitSlot {
  return {
    date: visit.date,
    start: visit.time,
    end: visit.endTime,
    status: visit.status,
    response: visit.clientResponse,
    responseAt: visit.clientResponseAt,
    respondent: visit.client?.name,
  };
}

export function formatVisitSlot(slot: VisitSlot) {
  const date = new Date(`${slot.date}T12:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/London',
  });
  return `${date} · ${appointmentTime(slot.start, slot.end)} UK time`;
}

export function visitResponseLabel(slot: VisitSlot) {
  if (slot.response === 'confirmed')
    return `Confirmed by ${slot.respondent || 'the client'}`;
  if (slot.response === 'change_requested')
    return `Different time requested by ${slot.respondent || 'the client'}`;
  return 'Client confirmation not recorded';
}

export function visitStatusLabel(slot: VisitSlot) {
  switch (slot.status) {
    case 'cancelled':
      return 'Visit cancelled';
    case 'completed':
      return 'Visit completed';
    case 'no_show':
      return 'Missed visit';
    case 'in_progress':
      return 'Visit in progress';
    case 'rescheduled':
      return 'Visit rescheduled';
    case 'confirmed':
      return 'Visit marked confirmed';
    default:
      return 'Scheduled visit';
  }
}

export function visitEventLabel(event: VisitEvent) {
  if (event.kind === 'rescheduled') return 'Visit rescheduled';
  if (event.kind === 'response') return visitResponseLabel(event.slot);
  return visitStatusLabel(event.slot);
}
