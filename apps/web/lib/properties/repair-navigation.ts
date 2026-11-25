export function propertyRepairHref(propertyId: string, jobId: string) {
  return `/properties/${encodeURIComponent(propertyId)}/repairs/${encodeURIComponent(jobId)}`;
}
