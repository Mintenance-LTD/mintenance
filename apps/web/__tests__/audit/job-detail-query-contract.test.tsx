import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

const s = vi.hoisted(() => ({
  theme: 'default',
  actor: 'owner',
  role: 'homeowner',
  noBids: false,
  missingContractor: false,
  tables: [] as string[],
  scopes: vi.fn(),
  detail: vi.fn(),
  sign: vi.fn(async (urls: string[]) => urls.map((url) => `signed:${url}`)),
}));
vi.mock('@/lib/auth', () => ({
  getCurrentUserFromCookies: async () =>
    s.actor ? { id: s.actor, role: s.role } : null,
}));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: s.theme }) }),
}));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));
vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('@/lib/api/job-storage', () => ({ resignJobStorageUrls: s.sign }));
vi.mock('@/lib/services/property-entry-secret', () => ({
  readPropertyEntryForDisplay: vi.fn(),
}));
vi.mock('@/components/properties/PropertyEntryUnavailableNotice', () => ({
  PropertyEntryUnavailableNotice: () => null,
}));
vi.mock('@/app/dashboard/components/HomeownerPageWrapper', () => ({
  HomeownerPageWrapper: ({ children }: React.PropsWithChildren) => (
    <div>{children}</div>
  ),
}));
vi.mock('@/app/jobs/[id]/components/JobDetailsProfessional', () => ({
  JobDetailsProfessional: (props: unknown) => {
    s.detail(props);
    return null;
  },
}));
vi.mock(
  '@/app/jobs/[id]/components/mint-editorial/MintEditorialJobDetailView',
  () => ({
    MintEditorialJobDetailView: (props: unknown) => {
      s.detail(props);
      return null;
    },
  })
);
vi.mock('@/app/jobs/[id]/components/JobViewTracker', () => ({
  JobViewTracker: () => null,
}));
vi.mock('@/app/jobs/[id]/components/ContractManagement', () => ({
  ContractManagement: () => null,
}));
vi.mock('@/app/jobs/[id]/components/HomeownerPhotoReview', () => ({
  HomeownerPhotoReview: () => null,
}));
vi.mock('@/app/jobs/[id]/components/RecommendedContractors', () => ({
  RecommendedContractors: () => null,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: (table: string) => {
      s.tables.push(table);
      // The current job layouts do not consume posts; any attempted lookup is
      // a regression, even if a future mock would otherwise accept its columns.
      if (table === 'contractor_posts')
        throw new Error('Unexpected unused portfolio query');
      const result = () => ({
        error: null,
        data:
          table === 'jobs'
            ? {
                id: 'job',
                homeowner_id: 'owner',
                payer_user_id: 'payer',
                status: 'posted',
                title: 'Repair',
                budget: 200,
              }
            : table === 'bids'
              ? s.noBids
                ? []
                : [
                    {
                      id: 'bid',
                      contractor_id: 'bidder',
                      status: 'pending',
                      amount: 180,
                      description: 'Repair proposal',
                      created_at: '2026-10-25T08:00:00Z',
                      contractor: s.missingContractor
                        ? null
                        : {
                            id: 'bidder',
                            first_name: 'Test',
                            last_name: 'Builder',
                            email: 'private@example.invalid',
                            phone: 'private-phone',
                          },
                      quote: {
                        id: 'quote',
                        subtotal: 150,
                        tax_amount: 30,
                        total_amount: 180,
                        line_items: [],
                      },
                    },
                  ]
              : table === 'job_attachments'
                ? [{ file_url: 'job-photo' }]
                : table === 'job_photos_metadata'
                  ? [{ photo_url: 'evidence-photo', photo_type: 'before' }]
                  : table === 'reviews'
                    ? [{ reviewee_id: 'bidder' }]
                    : null,
      });
      const q = {
        select: () => q,
        eq: (column: string, value: unknown) => {
          s.scopes(table, column, value);
          return q;
        },
        in: (column: string, value: unknown) => {
          s.scopes(table, column, value);
          return q;
        },
        neq: () => q,
        order: () => q,
        limit: () => q,
        single: async () => result(),
        maybeSingle: async () => result(),
        then: (
          resolve: (value: unknown) => unknown,
          reject: (error: unknown) => unknown
        ) => Promise.resolve(result()).then(resolve, reject),
      };
      return q;
    },
  },
}));
import Page from '@/app/jobs/[id]/page';

beforeEach(() => {
  s.theme = 'default';
  s.actor = 'owner';
  s.role = 'homeowner';
  s.noBids = false;
  s.missingContractor = false;
  s.tables = [];
  s.scopes.mockClear();
  s.detail.mockClear();
  s.sign.mockClear();
});
const load = () => Page({ params: Promise.resolve({ id: 'job' }) });

it.each(['default', 'mint-editorial'])(
  'preserves bid data and signed job photos without querying unused posts (%s)',
  async (theme) => {
    s.theme = theme;
    render(await load());
    expect(s.tables).not.toContain('contractor_posts');
    expect(s.scopes).toHaveBeenCalledWith('bids', 'job_id', 'job');
    expect(s.scopes).toHaveBeenCalledWith('reviews', 'reviewee_id', ['bidder']);
    const props = s.detail.mock.calls[0][0];
    expect(props.bids).toHaveLength(1);
    expect(props.bids[0]).toMatchObject({
      id: 'bid',
      amount: 180,
      description: 'Repair proposal',
      status: 'pending',
      quote: { totalAmount: 180 },
      contractor: { id: 'bidder', first_name: 'Test', email: '', phone: null },
    });
    expect(props.photos).toEqual(['signed:job-photo']);
    expect(s.sign).toHaveBeenCalledWith(['evidence-photo'], 'owner');
    expect(JSON.stringify(props)).not.toContain('private@example.invalid');
    expect(JSON.stringify(props)).not.toContain('private-phone');
  }
);

it.each(['default', 'mint-editorial'])(
  'renders an empty bid list without unnecessary contractor reads (%s)',
  async (theme) => {
    s.theme = theme;
    s.noBids = true;
    render(await load());
    expect(s.tables).not.toContain('contractor_posts');
    expect(s.tables).not.toContain('reviews');
    expect(s.detail.mock.calls[0][0].bids).toEqual([]);
  }
);

it('continues to omit bids with missing contractor relationships', async () => {
  s.missingContractor = true;
  render(await load());
  expect(s.detail.mock.calls[0][0].bids).toEqual([]);
});

it('allows the designated payer to view the same bids', async () => {
  s.actor = 'payer';
  render(await load());
  expect(s.detail.mock.calls[0][0].bids[0].id).toBe('bid');
});

it('blocks unrelated users before bidder data is read', async () => {
  s.actor = 'unrelated';
  await expect(load()).rejects.toThrow('redirect:/jobs');
  expect(s.tables).toEqual(['jobs']);
});

it.each([
  ['', 'homeowner'],
  ['actor', 'contractor'],
  ['actor', 'admin'],
])(
  'redirects other audiences before job reads (%s/%s)',
  async (actor, role) => {
    s.actor = actor;
    s.role = role;
    await expect(load()).rejects.toThrow('redirect:');
    expect(s.tables).toEqual([]);
  }
);
