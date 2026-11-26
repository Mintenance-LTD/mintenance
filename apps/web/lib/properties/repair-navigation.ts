import { queueReturnParams } from '@/lib/reports/conversation-navigation';

export function propertyRepairHref(propertyId: string, jobId: string) {
  return `/properties/${encodeURIComponent(propertyId)}/repairs/${encodeURIComponent(jobId)}`;
}

export function propertyRepairQueueHref(
  propertyId: string,
  jobId: string,
  queueSearch: URLSearchParams
) {
  const params = new URLSearchParams({ from: 'queue' });
  for (const [key, value] of queueReturnParams(queueSearch)) {
    params.set(key, value);
  }
  return `${propertyRepairHref(propertyId, jobId)}?${params}`;
}

export function propertyRepairQueueReturn(queueSearch: URLSearchParams) {
  const query = queueReturnParams(queueSearch).toString();
  return `/properties/work-queue${query ? `?${query}` : ''}`;
}
