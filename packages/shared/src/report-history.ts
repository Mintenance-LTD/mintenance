export interface ReportHistory {
  status: string;
  role: string;
  messages: {
    id: string;
    author_role: string;
    body: string;
    created_at: string;
  }[];
  hasMore: boolean;
  pageOffset: number;
  summary?: {
    category: string;
    description: string;
    created_at: string;
  } | null;
  summary_unavailable?: boolean;
  photos?: { url: string; slot: number }[];
  photos_unavailable?: boolean;
}

/** Reject an unconfirmed history response rather than implying an empty case. */
export function parseReportHistory(value: unknown): ReportHistory {
  const data = value as ReportHistory | null;
  if (
    !data ||
    typeof data.status !== 'string' ||
    typeof data.role !== 'string' ||
    !Number.isInteger(data.pageOffset) ||
    data.pageOffset < 0 ||
    typeof data.hasMore !== 'boolean' ||
    !Array.isArray(data.messages) ||
    data.messages.some(
      (message) =>
        !message ||
        typeof message.id !== 'string' ||
        typeof message.body !== 'string' ||
        typeof message.author_role !== 'string' ||
        typeof message.created_at !== 'string'
    ) ||
    (data.summary != null &&
      (typeof data.summary.category !== 'string' ||
        typeof data.summary.description !== 'string' ||
        typeof data.summary.created_at !== 'string'))
  ) {
    throw new Error('Case history could not be confirmed. Please refresh.');
  }
  return data;
}

export function reportHistoryDate(value: string): string {
  return Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleString('en-GB', { timeZone: 'Europe/London' })
    : 'Date unavailable';
}

export function reportStatusLabel(status: string): string {
  return (
    (
      {
        new: 'New',
        acknowledged: 'Acknowledged',
        converted: 'Marked converted',
        resolved: 'Resolved',
        dismissed: 'Dismissed',
      } as Record<string, string>
    )[status] || status
  );
}
