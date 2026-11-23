const evidenceSeparator = '\n\nEvidence:\n';

export function disputeStatement(description: string | null | undefined) {
  const index = description?.lastIndexOf(evidenceSeparator) ?? -1;
  return description?.slice(0, index === -1 ? undefined : index).trim() || null;
}

export const formatDisputeDate = (value: string, includeTime = true) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    dateStyle: includeTime ? 'medium' : 'long',
    ...(includeTime && { timeStyle: 'short' }),
  }).format(new Date(value));

export interface DisputeHistoryEntry {
  id: string;
  title: string;
  at: string | null;
  reason?: string | null;
  description?: string | null;
  evidence?: true;
}

interface Milestones {
  reason?: string | null;
  description?: string | null;
  createdAt?: string | null;
  evidenceCount: number;
  status?: string | null;
  resolvedAt?: string | null;
  resolution?: string | null;
  mediationRequestedAt?: string | null;
  mediationCompletedAt?: string | null;
}

const statusLabels: Record<string, string> = {
  open: 'Dispute opened',
  under_review: 'Dispute moved to review',
  escalated: 'Dispute escalated',
  resolved: 'Dispute resolved',
  closed: 'Dispute closed',
};

export function buildDisputeHistory(
  record: Milestones,
  changes: { id: number; status: string; changed_at: string }[],
  schedules: {
    id: string;
    created_at: string;
    new_values: { scheduledAt?: string } | null;
  }[]
): DisputeHistoryEntry[] {
  const items: DisputeHistoryEntry[] = [];
  const statement = disputeStatement(record.description);
  if (record.createdAt || record.reason || statement) {
    items.push({
      id: 'submitted',
      title:
        record.reason || statement ? 'Original statement' : 'Dispute opened',
      at: record.createdAt ?? null,
      reason: record.reason,
      description: statement === record.reason ? null : statement,
    });
  }
  if (record.evidenceCount) {
    items.push({
      id: 'evidence',
      title: 'Evidence submitted with the dispute',
      at: record.createdAt ?? null,
      evidence: true,
    });
  }
  if (record.mediationRequestedAt) {
    items.push({
      id: 'requested',
      title: 'Mediation requested',
      at: record.mediationRequestedAt,
    });
  }
  for (const schedule of schedules) {
    const slot = schedule.new_values?.scheduledAt;
    items.push({
      id: `schedule-${schedule.id}`,
      title: 'Mediation scheduled',
      at: schedule.created_at,
      description:
        slot && Number.isFinite(Date.parse(slot))
          ? `Appointment ${formatDisputeDate(slot)} UK time`
          : null,
    });
  }
  if (record.mediationCompletedAt) {
    items.push({
      id: 'completed',
      title: 'Mediation completed',
      at: record.mediationCompletedAt,
    });
  }
  const finalStatus = record.status === 'closed' ? 'closed' : 'resolved';
  const finalChange = changes
    .filter((change) => change.status === finalStatus)
    .at(-1);
  for (const change of changes) {
    items.push({
      id: `status-${change.id}`,
      title:
        statusLabels[change.status] ??
        `Case status changed to ${change.status.replace(/_/g, ' ')}`,
      at:
        change.id === finalChange?.id
          ? (record.resolvedAt ?? change.changed_at)
          : change.changed_at,
      description: change.id === finalChange?.id ? record.resolution : null,
    });
  }
  if (record.resolvedAt && !finalChange) {
    items.push({
      id: 'resolved',
      title: statusLabels[finalStatus],
      at: record.resolvedAt,
      description: record.resolution,
    });
  }
  return items.sort((a, b) => {
    if (!a.at || !b.at) return Number(!!a.at) - Number(!!b.at);
    return Date.parse(a.at) - Date.parse(b.at);
  });
}
