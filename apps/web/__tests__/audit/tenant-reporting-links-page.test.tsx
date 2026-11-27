// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const mock = vi.hoisted(() => ({
  properties: vi.fn(),
  tokens: vi.fn(),
  renderedLinks: vi.fn(),
  theme: '',
}));
vi.mock('@/lib/auth', () => ({
  getCurrentUserFromCookies: async () => ({ id: 'owner', role: 'homeowner' }),
}));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: mock.theme }) }),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        order: table === 'properties' ? mock.properties : mock.tokens,
      };
      return query;
    },
    rpc: async () => ({ data: [], error: null }),
  },
}));
vi.mock('@/app/landlord/reporting-links/ReportingLinksClient', () => ({
  ReportingLinksClient: mock.renderedLinks,
}));
vi.mock('@/app/landlord/reporting-links/MintEditorialReportingLinks', () => ({
  MintEditorialReportingLinks: mock.renderedLinks,
}));

import Page from '@/app/landlord/reporting-links/page';

beforeEach(() => {
  vi.clearAllMocks();
  mock.properties.mockResolvedValue({ data: [], error: null });
  mock.tokens.mockResolvedValue({ data: [], error: null });
  mock.renderedLinks.mockReturnValue(null);
  mock.theme = '';
});

it.each(['', 'mint-editorial'])(
  'clarifies the owner scope on either theme (%s)',
  async (theme) => {
    mock.theme = theme;
    const html = renderToStaticMarkup(await Page());
    expect(html).toContain('your own reporting links');
    expect(html).toContain('href="/properties"');
    expect(mock.renderedLinks).toHaveBeenCalled();
  }
);

it.each(['properties', 'tokens'] as const)(
  'does not show a misleading empty list when %s fails',
  async (query) => {
    mock[query].mockResolvedValue({ data: null, error: 'internal detail' });
    const html = renderToStaticMarkup(await Page());
    expect(html).toContain('Reporting links could not be loaded');
    expect(html).toContain('Retry reporting links');
    expect(html).not.toContain('internal detail');
    expect(mock.renderedLinks).not.toHaveBeenCalled();
  }
);
