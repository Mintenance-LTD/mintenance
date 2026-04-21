import { logger } from '@mintenance/shared';

export interface CalendarEvent {
  id: string;
  title: string;
  type: 'job' | 'appointment';
  date: string;
  startTime: string;
  endTime: string;
  client?: string;
  location?: string;
  status?: string;
}

export interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export type AvailabilityMap = Record<
  string,
  { enabled: boolean; start: string; end: string }
>;

export const DAY_NAMES = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

/**
 * Fetches jobs, appointments, and signed contract start/end dates, flattens
 * them into the single CalendarEvent shape the UI renders.
 *
 * Historical note (2026-04-20): the previous implementation fetched
 * `/api/contractor/jobs` — a route that does not exist — and read
 * `scheduled_date`, a column that does not exist. Both failures were
 * silently ignored, so the calendar showed zero job events for everyone.
 * It now calls the real `/api/contractor/my-jobs` handler and reads the
 * correct `scheduled_start_date` field.
 */
export async function fetchCalendarEvents(): Promise<CalendarEvent[]> {
  const jobEvents = await fetchJobEvents();
  const appointments = await fetchAppointmentEvents();
  const contractEvents = await fetchContractEvents();
  return [...jobEvents, ...appointments, ...contractEvents];
}

async function fetchJobEvents(): Promise<CalendarEvent[]> {
  try {
    const res = await fetch('/api/contractor/my-jobs?status=active', {
      credentials: 'include',
    });
    if (!res.ok) return [];
    const data = await res.json();
    const jobs = data.jobs || [];
    return jobs.map((job: Record<string, unknown>) => ({
      id: job.id as string,
      title: (job.title as string) || 'Untitled Job',
      type: 'job' as const,
      date:
        (job.scheduled_start_date as string) ||
        (job.created_at as string) ||
        new Date().toISOString(),
      startTime: (job.scheduled_time as string) || '09:00',
      endTime: '17:00',
      client: (job.homeowner_name as string) || '',
      location: (job.location as string) || '',
      status: job.status as string,
    }));
  } catch (error) {
    logger.error('Error fetching calendar job events', error, {
      service: 'contractor-calendar',
    });
    return [];
  }
}

async function fetchAppointmentEvents(): Promise<CalendarEvent[]> {
  try {
    const res = await fetch('/api/appointments', { credentials: 'include' });
    if (!res.ok) return [];
    const data = await res.json();
    const items = data.appointments || [];
    return items.map((a: Record<string, unknown>) => ({
      id: a.id as string,
      title: (a.title as string) || 'Appointment',
      type: 'appointment' as const,
      date:
        (a.scheduled_at as string) ||
        (a.date as string) ||
        new Date().toISOString(),
      startTime: (a.start_time as string) || '10:00',
      endTime: (a.end_time as string) || '11:00',
      client: (a.client_name as string) || '',
      location: (a.location as string) || '',
      status: a.status as string,
    }));
  } catch (error) {
    logger.error('Error fetching calendar appointment events', error, {
      service: 'contractor-calendar',
    });
    return [];
  }
}

async function fetchContractEvents(): Promise<CalendarEvent[]> {
  try {
    const res = await fetch('/api/contracts?status=accepted', {
      credentials: 'include',
    });
    if (!res.ok) return [];
    const data = await res.json();
    const contracts = data.contracts || [];
    return contracts.flatMap((c: Record<string, unknown>) => {
      const events: CalendarEvent[] = [];
      if (c.start_date) {
        events.push({
          id: `contract-start-${c.id}`,
          title: `${(c.title as string) || 'Contract'} — Start`,
          type: 'job',
          date: c.start_date as string,
          startTime: '09:00',
          endTime: '17:00',
          status: 'contract_start',
        });
      }
      if (c.end_date) {
        events.push({
          id: `contract-end-${c.id}`,
          title: `${(c.title as string) || 'Contract'} — Due`,
          type: 'job',
          date: c.end_date as string,
          startTime: '09:00',
          endTime: '17:00',
          status: 'contract_end',
        });
      }
      return events;
    });
  } catch (error) {
    logger.error('Error fetching calendar contract events', error, {
      service: 'contractor-calendar',
    });
    return [];
  }
}

export async function fetchSavedAvailability(): Promise<AvailabilityMap | null> {
  try {
    const res = await fetch('/api/contractor/availability', {
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = await res.json();
    const slots: AvailabilitySlot[] = data.availability || [];
    if (slots.length === 0) return null;

    const map: AvailabilityMap = {};
    DAY_NAMES.forEach((day, idx) => {
      const slot = slots.find((s) => s.dayOfWeek === idx);
      map[day] = slot
        ? {
            enabled: slot.isAvailable,
            start: slot.startTime,
            end: slot.endTime,
          }
        : { enabled: false, start: '09:00', end: '17:00' };
    });
    return map;
  } catch (error) {
    logger.error('Error fetching contractor availability', error, {
      service: 'contractor-calendar',
    });
    return null;
  }
}

export function getDaysInMonth(date: Date): (Date | null)[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  const days: (Date | null)[] = [];
  for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(year, month, day));
  }
  return days;
}

export function isToday(date: Date | null): boolean {
  if (!date) return false;
  const t = new Date();
  return (
    date.getDate() === t.getDate() &&
    date.getMonth() === t.getMonth() &&
    date.getFullYear() === t.getFullYear()
  );
}

export function getEventColor(type: string): string {
  switch (type) {
    case 'job':
      return 'bg-teal-50 text-teal-700 border-l-4 border-teal-600';
    case 'appointment':
      return 'bg-blue-50 text-blue-700 border-l-4 border-blue-600';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

export function getStatusColor(status?: string): string {
  switch (status) {
    case 'confirmed':
    case 'assigned':
      return 'bg-green-100 text-green-700';
    case 'pending':
      return 'bg-yellow-100 text-yellow-700';
    case 'cancelled':
      return 'bg-red-100 text-red-700';
    case 'in_progress':
      return 'bg-blue-100 text-blue-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}
