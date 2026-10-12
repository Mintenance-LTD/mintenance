import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ login: vi.fn() }));
vi.mock('@/lib/stripe', () => ({
  stripe: { accounts: { createLoginLink: mocks.login } },
}));
vi.mock('@/lib/env', () => ({ getAppUrl: () => 'https://example.test' }));
import { createDashboardLoginLink } from '@/lib/stripe/connect/onboarding';
beforeEach(() => vi.clearAllMocks());

it('returns the provider dashboard link on success', async () => {
  mocks.login.mockResolvedValue({
    url: 'https://connect.stripe.com/express/synthetic',
  });
  await expect(createDashboardLoginLink('acct_fixture')).resolves.toEqual({
    url: 'https://connect.stripe.com/express/synthetic',
  });
});

it.each(['testmode', 'livemode'])(
  'reports %s mismatch safely without falling back to another key',
  async (mode) => {
    mocks.login.mockRejectedValue({
      type: 'StripeInvalidRequestError',
      message: `The account acct_fixture can only be used with ${mode} keys.`,
    });
    await expect(
      createDashboardLoginLink('acct_fixture')
    ).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining('payment environment'),
    });
    expect(mocks.login).toHaveBeenCalledTimes(1);
  }
);

it('does not misclassify unrelated provider failures as configuration errors', async () => {
  const failure = new Error('provider unavailable');
  mocks.login.mockRejectedValue(failure);
  await expect(createDashboardLoginLink('acct_fixture')).rejects.toBe(failure);
});

it('reports inaccessible stored accounts as a connection problem', async () => {
  mocks.login.mockRejectedValue({
    type: 'StripePermissionError',
    code: 'account_invalid',
    message: 'No access to account',
  });
  await expect(createDashboardLoginLink('acct_fixture')).rejects.toMatchObject({
    statusCode: 409,
    message: expect.stringContaining('connected payout account'),
  });
});
