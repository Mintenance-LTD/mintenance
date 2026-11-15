export function canViewBidJob(
  job: {
    status: string;
    contractor_id?: string | null;
    archived_at?: string | null;
  },
  hasOwnBid: boolean
): boolean {
  return (
    hasOwnBid ||
    (!job.archived_at && !job.contractor_id && job.status === 'posted')
  );
}

export function formatJobBudget(value: unknown): string {
  const amount =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value)
        : NaN;
  return Number.isFinite(amount) && amount > 0
    ? new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
      }).format(amount)
    : 'Not specified';
}

/** Legacy jobs contain both text lists and structured requirements. */
export function requirementLines(value: unknown, depth = 0): string[] {
  if (depth > 4 || value == null) return [];
  if (typeof value === 'string')
    return value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  if (Array.isArray(value))
    return value.flatMap((item) => requirementLines(item, depth + 1));
  if (typeof value === 'number')
    return Number.isFinite(value) ? [String(value)] : [];
  if (typeof value === 'boolean') return [value ? 'Yes' : 'No'];
  if (typeof value === 'object')
    return Object.entries(value).flatMap(([key, item]) => {
      const details = requirementLines(item, depth + 1);
      const label = key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
      return details.length ? [`${label}: ${details.join('; ')}`] : [];
    });
  return [];
}
