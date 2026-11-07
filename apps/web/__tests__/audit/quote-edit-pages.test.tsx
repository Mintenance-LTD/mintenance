// @vitest-environment node
import { beforeEach, it, expect, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ user: vi.fn(), read: vi.fn(), eq: vi.fn() }));
vi.mock('@/lib/auth', () => ({ getCurrentUserFromCookies: mocks.user }));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('notFound');
  },
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined }),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: () => {
      const q = {
        select: () => q,
        eq: (...args: unknown[]) => {
          mocks.eq(...args);
          return q;
        },
        single: mocks.read,
        maybeSingle: mocks.read,
      };
      return q;
    },
  },
}));
vi.mock(
  '@/app/contractor/(dashboard)/quotes/[id]/edit/components/EditQuoteClient',
  () => ({ EditQuoteClient: () => null })
);
vi.mock(
  '@/app/contractor/(dashboard)/quotes/[id]/components/QuoteDetailsClient',
  () => ({ QuoteDetailsClient: () => null })
);
vi.mock(
  '@/app/contractor/(dashboard)/quotes/[id]/components/MintEditorialQuoteDetailView',
  () => ({ MintEditorialQuoteDetailView: () => null })
);
import EditPage from '@/app/contractor/(dashboard)/quotes/[id]/edit/page';
import DetailPage from '@/app/contractor/(dashboard)/quotes/[id]/page';
vi.mock(
  '@/app/contractor/(dashboard)/quotes/[id]/history/QuoteHistoryClient',
  () => ({ QuoteHistoryClient: () => null })
);
import HistoryPage from '@/app/contractor/(dashboard)/quotes/[id]/history/page';
const params = { params: Promise.resolve({ id: 'quote' }) };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue({ id: 'actor', role: 'contractor' });
  mocks.read.mockResolvedValue({
    data: { id: 'quote', status: 'draft', updated_at: '2026-11-06T12:00:00Z' },
    error: null,
  });
});
it.each([EditPage, DetailPage, HistoryPage])(
  'scopes the server-rendered quote to the current contractor',
  async (page) => {
    const result = await page(params);
    expect(result.props.quote.id).toBe('quote');
    expect(mocks.eq.mock.calls).toContainEqual(['id', 'quote']);
    expect(mocks.eq.mock.calls).toContainEqual(['contractor_id', 'actor']);
  }
);
it.each(['sent', 'accepted', 'viewed', 'rejected', 'expired'])(
  'redirects a direct %s edit link to read-only details',
  async (status) => {
    mocks.read.mockResolvedValue({
      data: { id: 'quote', status },
      error: null,
    });
    await expect(EditPage(params)).rejects.toThrow(
      'redirect:/contractor/quotes/quote'
    );
  }
);
it('does not query for a signed-out or non-contractor user', async () => {
  for (const user of [null, { id: 'actor', role: 'homeowner' }]) {
    mocks.user.mockResolvedValue(user);
    await expect(EditPage(params)).rejects.toThrow('redirect:/login');
  }
  expect(mocks.read).not.toHaveBeenCalled();
});
it('does not disguise a loading failure as a missing quote', async () => {
  mocks.read.mockResolvedValue({ data: null, error: { message: 'offline' } });
  await expect(EditPage(params)).rejects.toThrow('Could not load quote');
});
it('redirects a missing or unowned quote to the list', async () => {
  mocks.read.mockResolvedValue({ data: null, error: null });
  await expect(EditPage(params)).rejects.toThrow('redirect:/contractor/quotes');
});
it('keeps history behind contractor authentication', async () => {
  for (const user of [null, { id: 'actor', role: 'homeowner' }]) {
    mocks.user.mockResolvedValue(user);
    await expect(HistoryPage(params)).rejects.toThrow('redirect:/login');
  }
  expect(mocks.read).not.toHaveBeenCalled();
});
it('routes history load failures to the error boundary and absent quotes to not-found', async () => {
  mocks.read.mockResolvedValue({ data: null, error: { message: 'offline' } });
  await expect(HistoryPage(params)).rejects.toThrow(
    'Could not load quote history'
  );
  mocks.read.mockResolvedValue({ data: null, error: null });
  await expect(HistoryPage(params)).rejects.toThrow('notFound');
});
