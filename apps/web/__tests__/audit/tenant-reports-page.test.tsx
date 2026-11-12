// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
const mock = vi.hoisted(() => ({
  user: vi.fn(),
  order: vi.fn(),
  eq: vi.fn(),
  theme: '',
}));
vi.mock('@/lib/auth', () => ({ getCurrentUserFromCookies: mock.user }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: mock.theme }) }),
}));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: () => {
      const query = {
        select: () => query,
        eq: (...args: unknown[]) => {
          mock.eq(...args);
          return query;
        },
        order: mock.order,
      };
      return query;
    },
  },
}));
vi.mock('@/app/landlord/reports/TenantReportsClient', () => ({
  TenantReportsClient: () => null,
}));
vi.mock('@/app/landlord/reports/MintEditorialTenantReports', () => ({
  MintEditorialTenantReports: () => null,
}));
import Page from '@/app/landlord/reports/page';
beforeEach(() => {
  vi.clearAllMocks();
  mock.theme = '';
  mock.user.mockResolvedValue({ id: 'owner', role: 'homeowner' });
  mock.order.mockResolvedValue({ data: [], error: null });
});
it.each(['', 'mint-editorial'])(
  'passes the targeted report to the selected layout with owner-scoped data (%s)',
  async (theme) => {
    mock.theme = theme;
    const page = await Page({
      searchParams: Promise.resolve({ reportId: 'report-1' }),
    });
    expect(page.props).toMatchObject({
      initialReportId: 'report-1',
      reports: [],
    });
    expect(mock.eq).toHaveBeenCalledWith(
      'anonymous_report_tokens.owner_id',
      'owner'
    );
  }
);
it('shows recovery instead of an empty inbox on database failure', async () => {
  mock.order.mockResolvedValue({
    data: null,
    error: new Error('internal database detail'),
  });
  const html = renderToStaticMarkup(
    await Page({ searchParams: Promise.resolve({ reportId: 'report-1' }) })
  );
  expect(html).toContain('Reports could not be loaded');
  expect(html).toContain('/landlord/reports?reportId=report-1');
  expect(html).not.toContain('internal database detail');
});
it('preserves the targeted case through sign-in', async () => {
  mock.user.mockResolvedValue(null);
  await expect(
    Page({ searchParams: Promise.resolve({ reportId: 'report-1' }) })
  ).rejects.toThrow(
    'redirect:/login?redirect=%2Flandlord%2Freports%3FreportId%3Dreport-1'
  );
  expect(mock.order).not.toHaveBeenCalled();
});
