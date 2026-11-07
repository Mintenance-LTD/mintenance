// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ user: vi.fn(), read: vi.fn() }));
vi.mock('@/lib/auth', () => ({ getCurrentUserFromCookies: mocks.user }));
vi.mock('next/navigation', () => ({
  redirect: () => {
    throw new Error('login');
  },
  notFound: () => {
    throw new Error('not found');
  },
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: () => {
      const q = { select: () => q, eq: () => q, maybeSingle: mocks.read };
      return q;
    },
  },
}));
vi.mock('@/components/quotes/QuoteAmendmentReview', () => ({
  QuoteAmendmentReview: () => null,
}));
import Page from '@/app/jobs/[id]/amendments/page';
const params = { params: Promise.resolve({ id: 'job' }) };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue({ id: 'homeowner' });
  mocks.read.mockResolvedValue({
    data: {
      id: 'job',
      homeowner_id: 'homeowner',
      payer_user_id: 'payer',
      contractor_id: 'contractor',
    },
    error: null,
  });
});
it.each(['homeowner', 'payer', 'contractor'])(
  'lets the %s open the review',
  async (id) => {
    mocks.user.mockResolvedValue({ id });
    expect((await Page(params)).props.jobId).toBe('job');
  }
);
it('requires sign-in before reading the job', async () => {
  mocks.user.mockResolvedValue(null);
  await expect(Page(params)).rejects.toThrow('login');
  expect(mocks.read).not.toHaveBeenCalled();
});
it('does not expose review to a nonparticipant', async () => {
  mocks.user.mockResolvedValue({ id: 'outsider' });
  await expect(Page(params)).rejects.toThrow('not found');
});
it('distinguishes unavailable and absent jobs', async () => {
  mocks.read.mockResolvedValue({ data: null, error: { message: 'Offline' } });
  await expect(Page(params)).rejects.toThrow('Could not load');
  mocks.read.mockResolvedValue({ data: null, error: null });
  await expect(Page(params)).rejects.toThrow('not found');
});
