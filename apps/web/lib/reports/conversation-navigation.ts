export const reportConversationReturn = {
  'tenant-reports': {
    href: '/landlord/reports',
    label: 'Back to tenant reports',
  },
  emergencies: {
    href: '/maintenance/emergencies',
    label: 'Back to emergency reports',
  },
  'action-queue': {
    href: '/properties/work-queue',
    label: 'Back to action queue',
  },
} as const;

export type ReportConversationOrigin = keyof typeof reportConversationReturn;

export function reportConversationHref(
  reportId: string,
  origin: ReportConversationOrigin = 'action-queue'
): string {
  const path = `/maintenance/reports/${encodeURIComponent(reportId)}`;
  return origin === 'action-queue' ? path : `${path}?from=${origin}`;
}
