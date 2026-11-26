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

export function queueReturnParams(values: URLSearchParams) {
  const params = new URLSearchParams();
  const scope = values.get('scope');
  if (scope === 'mine' || scope === 'unassigned') params.set('scope', scope);
  const property = values.get('property');
  if (property && /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(property))
    params.set('property', property);
  const priority = values.get('priority');
  if (priority === '0' || priority === '1' || priority === '2')
    params.set('priority', priority);
  const person = values.get('person')?.trim().slice(0, 100);
  if (person) params.set('person', person);
  const sort = values.get('sort');
  if (sort === 'due' || sort === 'property' || sort === 'person')
    params.set('sort', sort);
  const offset = Number(values.get('offset'));
  if (Number.isInteger(offset) && offset > 0 && offset <= 100000)
    params.set('offset', String(offset));
  return params;
}

export function queueReportFocus(reportId: string) {
  return `queue-report-${encodeURIComponent(reportId)}`;
}

export function reportReturnLink(
  origin: ReportConversationOrigin,
  reportId: string,
  queueSearch?: string
) {
  const back = reportConversationReturn[origin];
  if (origin === 'tenant-reports') {
    return {
      ...back,
      href: back.href + '?reportId=' + encodeURIComponent(reportId),
    };
  }
  if (origin !== 'action-queue' || queueSearch === undefined) return back;
  const query = queueReturnParams(new URLSearchParams(queueSearch)).toString();
  return {
    ...back,
    href: `${back.href}${query ? `?${query}` : ''}#${queueReportFocus(reportId)}`,
  };
}

export function reportConversationHref(
  reportId: string,
  origin: ReportConversationOrigin = 'action-queue',
  queueSearch?: URLSearchParams
): string {
  const path = `/maintenance/reports/${encodeURIComponent(reportId)}`;
  if (origin === 'action-queue' && queueSearch) {
    const params = queueReturnParams(queueSearch);
    params.set('from', 'action-queue');
    return `${path}?${params}`;
  }
  return origin === 'action-queue' ? path : `${path}?from=${origin}`;
}
