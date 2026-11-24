const tabs = ['all', 'contracts', 'bids', 'payments'] as const;
const sorts = ['newest', 'oldest', 'amount-high', 'amount-low'] as const;

export type PaperworkTab = (typeof tabs)[number];
export type PaperworkSort = (typeof sorts)[number];

export interface PaperworkFilters {
  tab: PaperworkTab;
  sort: PaperworkSort;
  query: string;
}

export const paperworkSearchLimit = 200;

export function readPaperworkFilters(
  params: Pick<URLSearchParams, 'get'>
): PaperworkFilters {
  const tab = params.get('tab');
  const sort = params.get('sort');
  return {
    tab: tabs.find((value) => value === tab) ?? 'all',
    sort: sorts.find((value) => value === sort) ?? 'newest',
    query: params.get('q')?.slice(0, paperworkSearchLimit) ?? '',
  };
}

export function paperworkHref(filters?: PaperworkFilters, contractId?: string) {
  const path = contractId
    ? `/documents/contracts/${encodeURIComponent(contractId)}`
    : '/documents';
  if (!filters) return path;

  const params = new URLSearchParams();
  if (filters.tab !== 'all') params.set('tab', filters.tab);
  if (filters.query)
    params.set('q', filters.query.slice(0, paperworkSearchLimit));
  if (filters.sort !== 'newest') params.set('sort', filters.sort);
  return params.size ? `${path}?${params}` : path;
}
