import { isValidUUID } from '@/lib/validation/uuid';

export const workspaceViews = [
  'all',
  'attention',
  'awaiting',
  'active',
  'done',
  'cancelled',
  'draft',
  'archived',
] as const;

export type WorkspaceView = (typeof workspaceViews)[number];

export interface WorkspaceFilters {
  view: WorkspaceView;
  category: string;
  query: string;
}

export interface WorkspaceScope {
  propertyId?: string;
  category?: string;
}

export function readWorkspaceFilters(
  params: Pick<URLSearchParams, 'get'>
): WorkspaceFilters {
  const view =
    workspaceViews.find((value) => value === params.get('view')) ?? 'all';
  return {
    view,
    category:
      params.get('jobCategory')?.slice(0, 100) ||
      params.get('category')?.slice(0, 100) ||
      'all',
    query: params.get('q')?.slice(0, 120) ?? '',
  };
}

export function workspaceHref(
  filters: WorkspaceFilters,
  scope: WorkspaceScope = {}
) {
  const params = new URLSearchParams();
  if (scope.propertyId && isValidUUID(scope.propertyId))
    params.set('property_id', scope.propertyId);
  if (scope.category) params.set('category', scope.category.slice(0, 100));
  if (filters.view !== 'all') params.set('view', filters.view);
  if (filters.category !== (scope.category || 'all'))
    params.set('jobCategory', filters.category.slice(0, 100));
  if (filters.query) params.set('q', filters.query.slice(0, 120));
  return params.size ? `/jobs?${params}` : '/jobs';
}

export function workspaceJobHref(id: string, listHref: string) {
  const query = listHref.startsWith('/jobs?')
    ? listHref.slice('/jobs?'.length)
    : '';
  return `/jobs/${encodeURIComponent(id)}${query ? '?' + new URLSearchParams({ fromJobs: query }) : ''}`;
}

/** Build a list link from known filter keys. Never use a supplied destination URL. */
export function returnToWorkspace(raw: string | string[] | undefined) {
  if (typeof raw !== 'string' || raw.length > 1600) return '/jobs';
  const params = new URLSearchParams(raw);
  return workspaceHref(readWorkspaceFilters(params), {
    propertyId: params.get('property_id') ?? undefined,
    category: params.get('category') ?? undefined,
  });
}
