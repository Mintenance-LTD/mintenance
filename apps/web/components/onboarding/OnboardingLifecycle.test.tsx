import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from '@testing-library/react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { OnboardingWrapper, DashboardOnboarding } from './OnboardingWrapper';
import { EarlyAccessSummary } from './EarlyAccessSummary';
import { ReplayQuickTour } from './ReplayQuickTour';
const { put, push } = vi.hoisted(() => ({ put: vi.fn(), push: vi.fn() }));
vi.mock('@/lib/csrf-client', () => ({ fetchWithCsrf: put }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({ user: null }),
}));
const dashboard = (id = 'alice') => (
  <OnboardingWrapper userId={id}>
    <DashboardOnboarding />
  </OnboardingWrapper>
);
beforeEach(() => {
  localStorage.clear();
  put.mockReset().mockResolvedValue({ ok: false });
  push.mockReset();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) =>
      url === '/api/subscriptions/status'
        ? {
            ok: true,
            json: async () => ({
              role: 'homeowner',
              earlyAccess: { eligible: true },
            }),
          }
        : { ok: false }
    )
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('remembers independent dismissals after remount even offline, without hiding another account or benefits details', async () => {
  const first = render(dashboard());
  fireEvent.click(
    await screen.findByRole('button', { name: 'Dismiss getting started' })
  );
  expect(screen.queryByText('Make yourself at home')).toBeNull();
  expect(screen.queryByText('Account progress unavailable')).toBeNull();
  fireEvent.click(
    await screen.findByRole('button', {
      name: 'Dismiss early-user benefits notice',
    })
  );
  expect(
    screen.queryByRole('region', { name: 'Early-user benefits' })
  ).toBeNull();
  first.unmount();
  const reload = render(dashboard());
  await waitFor(() => expect(put).toHaveBeenCalledTimes(4));
  expect(screen.queryByText('Make yourself at home')).toBeNull();
  expect(
    screen.queryByRole('region', { name: 'Early-user benefits' })
  ).toBeNull();
  reload.unmount();
  const other = render(dashboard('bob'));
  expect(await screen.findByText('Make yourself at home')).toBeTruthy();
  expect(
    await screen.findByRole('region', { name: 'Early-user benefits' })
  ).toBeTruthy();
  other.unmount();
  render(<EarlyAccessSummary userId='alice' role='homeowner' />);
  expect(await screen.findByText('View your benefits')).toBeTruthy();
});
it.each(['completed', 'skipped'])(
  'respects %s account progress on a fresh browser',
  async (status) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => ({
        ok: true,
        json: async () =>
          url === '/api/subscriptions/status'
            ? { role: 'homeowner', earlyAccess: { eligible: true } }
            : {
                progress: [
                  'intro-homeowner',
                  'notice-early-access-homeowner',
                ].map((journey) => ({
                  journey,
                  platform: 'web',
                  status,
                  step: 0,
                })),
              },
      }))
    );
    render(dashboard());
    await waitFor(() => expect(localStorage.length).toBe(2));
    expect(screen.queryByText('Make yourself at home')).toBeNull();
    expect(
      screen.queryByRole('region', { name: 'Early-user benefits' })
    ).toBeNull();
  }
);
it('finishing the tour removes the introduction but preserves the benefits notice', async () => {
  render(dashboard());
  fireEvent.click(await screen.findByRole('button', { name: 'Quick tour' }));
  fireEvent.click(await screen.findByRole('button', { name: /take a look/ }));
  while (screen.queryByRole('button', { name: 'Next' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByRole('button', { name: 'Finish tour' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.queryByText('Make yourself at home')).toBeNull();
  expect(
    await screen.findByRole('region', { name: 'Early-user benefits' })
  ).toBeTruthy();
});
it.each(['homeowner', 'contractor', 'team-member'] as const)(
  'replays the correct %s tour from Help',
  async (audience) => {
    render(<ReplayQuickTour userId='alice' audience={audience} />);
    fireEvent.click(screen.getByRole('button', { name: 'Replay quick tour' }));
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(
        audience === 'homeowner'
          ? '/dashboard'
          : '/contractor/dashboard-enhanced'
      )
    );
    expect(JSON.parse(put.mock.calls[0][1].body)).toMatchObject({
      journey: `intro-${audience}`,
      status: 'in_progress',
      step: 0,
    });
  }
);
