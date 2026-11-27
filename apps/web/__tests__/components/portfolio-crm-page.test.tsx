import { beforeEach, describe, expect, it, vi } from 'vitest';
import PortfolioPage from '../../app/portfolio/page';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  redirect: vi.fn((href: string) => {
    throw new Error('redirect:' + href);
  }),
}));
vi.mock('@/lib/auth', () => ({ getCurrentUserFromCookies: mocks.getUser }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('../../app/portfolio/portfolio-workspace', () => ({
  PortfolioWorkspace: () => null,
}));

const orgId = 'd6c0469a-fd05-4480-981b-a1b9ca70d349';

describe('Agency CRM page entry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({
      id: 'owner',
      role: 'homeowner',
      first_name: 'Test',
      email: 'unit@example.test',
    });
  });

  it('opens the same Portfolio workspace in CRM mode for the exact selected organisation', async () => {
    const result = await PortfolioPage({
      searchParams: Promise.resolve({ view: 'crm', orgId }),
    });
    expect(result.props).toMatchObject({
      crm: true,
      targetOrgId: orgId,
      user: { id: 'owner' },
    });
  });

  it('keeps the CRM destination when sign-in is required', async () => {
    mocks.getUser.mockResolvedValue(null);
    await expect(
      PortfolioPage({ searchParams: Promise.resolve({ view: 'crm' }) })
    ).rejects.toThrow('redirect:/login?redirect=%2Fportfolio%3Fview%3Dcrm');
  });

  it('preserves a valid agency ID through the CRM sign-in redirect', async () => {
    mocks.getUser.mockResolvedValue(null);
    await expect(
      PortfolioPage({ searchParams: Promise.resolve({ view: 'crm', orgId }) })
    ).rejects.toThrow(
      'redirect:/login?redirect=' +
        encodeURIComponent('/portfolio?view=crm&orgId=' + orgId)
    );
  });

  it('does not route a contractor through the agency staff workspace', async () => {
    mocks.getUser.mockResolvedValue({ id: 'tradie', role: 'contractor' });
    await expect(
      PortfolioPage({ searchParams: Promise.resolve({ view: 'crm' }) })
    ).rejects.toThrow('redirect:/contractor/portfolio');
  });
});
