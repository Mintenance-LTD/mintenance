import { visitHref } from '@/lib/scheduling/visit-history';
import { isValidUUID } from '@/lib/validation/uuid';
import type { FeedNotification } from './feed';

export function isVisitRecordLink(url?: string | null): boolean {
  const match = url?.match(/^\/(?:contractor\/)?appointments\/([^/]+)$/);
  return !!match && isValidUUID(match[1]);
}

export function resolveVisitAlert<T extends FeedNotification>(
  row: T,
  role?: string
): T {
  const id = row.metadata?.appointmentId;
  if (
    !['appointment_scheduled', 'appointment_update'].includes(row.type) ||
    typeof id !== 'string' ||
    !isValidUUID(id) ||
    (role !== 'contractor' && role !== 'homeowner')
  )
    return row;

  const href = visitHref(id, role);
  return { ...row, action_url: href, link: href };
}
