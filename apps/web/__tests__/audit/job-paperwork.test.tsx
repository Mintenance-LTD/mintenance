import { useSyncExternalStore } from 'react';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import PaperworkPage from '@/app/documents/page';
import AgreementPage from '@/app/documents/contracts/[contractId]/page';

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`Unexpected redirect to ${url}`);
  },
  useSearchParams: () =>
    new URLSearchParams(
      useSyncExternalStore(
        (subscribe) => {
          window.addEventListener('popstate', subscribe);
          return () => window.removeEventListener('popstate', subscribe);
        },
        () => window.location.search
      )
    ),
}));
vi.mock('@/lib/auth', () => ({
  getCurrentUserFromCookies: async () => ({
    id: 'homeowner',
    role: 'homeowner',
  }),
}));
vi.mock('@/lib/hooks/useCSRF', () => ({ useCSRF: () => ({}) }));
vi.mock('@/components/ui/confirm-dialog', () => ({
  useConfirm: () => vi.fn(),
}));
vi.mock('@/components/legal/ContractStartChoices', () => ({
  ContractStartChoices: () => null,
}));
vi.mock('@/components/legal/ContractCancellation', () => ({
  ContractCancellation: () => null,
}));

const selectedId = '10000000-0000-4000-8000-000000000001';
const newerId = '10000000-0000-4000-8000-000000000002';
const created = '2026-11-18T12:00:00Z';
const records = [
  {
    id: `contract-${selectedId}`,
    contract_id: selectedId,
    type: 'contract',
    name: 'Signed boiler agreement',
    status: 'accepted',
    href: `/documents/contracts/${selectedId}`,
  },
  {
    id: 'bid-1',
    type: 'bid',
    name: 'Boiler bid',
    status: 'accepted',
    href: '/jobs/job',
  },
  {
    id: 'payment-1',
    type: 'payment',
    name: 'Boiler payment',
    status: 'held',
    href: '/payments?paymentId=p',
  },
].map((record) => ({
  ...record,
  job_title: 'Boiler service',
  created_at: created,
  updated_at: created,
  amount: 120,
}));

const agreement = {
  id: selectedId,
  job_id: 'job',
  title: 'Signed boiler agreement',
  status: 'accepted',
  amount: 120,
  description: 'Service the boiler and record the pressure readings.',
  terms: { materials: 'A new washer is included.' },
  cancellation_deadline: created,
  contractor_signed_at: created,
  homeowner_signed_at: created,
  created_at: created,
  updated_at: created,
};

const replaceState = window.history.replaceState.bind(window.history);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.theme;
  replaceState(null, '', '/');
});

it.each(['default', 'mint-editorial'])(
  'opens the selected agreement and restores search, type and sort (%s)',
  async (theme) => {
    document.documentElement.dataset.theme = theme;
    replaceState(null, '', '/documents');
    vi.spyOn(window.history, 'replaceState').mockImplementation(
      (state, title, url) => {
        replaceState(state, title, url);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    );
    const fetcher = vi.fn(async (url: string) => {
      if (url === '/api/documents') {
        return Response.json({
          documents: records,
          counts: { contracts: 1, bids: 1, payments: 1, total: 3 },
        });
      }
      expect(url).toBe(`/api/contracts?contract_id=${selectedId}`);
      // A newer agreement first in the response must never replace the requested one.
      return Response.json({
        contracts: [
          { ...agreement, id: newerId, description: 'Newer draft terms' },
          agreement,
        ],
      });
    });
    vi.stubGlobal('fetch', fetcher);

    const hub = render(<PaperworkPage />);
    expect(
      screen.getByRole('heading', { name: 'Job paperwork' })
    ).toBeVisible();
    await screen.findByRole('link', { name: /Boiler bid/ });
    fireEvent.change(
      screen.getByRole('searchbox', { name: 'Search job paperwork' }),
      { target: { value: 'Boiler service' } }
    );
    fireEvent.click(screen.getByRole('button', { name: /^Contracts/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Newest First' }));
    fireEvent.click(screen.getByRole('button', { name: 'Oldest First' }));
    expect(screen.queryByRole('link', { name: /Boiler bid/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /Boiler payment/ })).toBeNull();

    const href = screen
      .getByRole('link', { name: /Signed boiler agreement/ })
      .getAttribute('href');
    const target = new URL(href!, 'https://example.test');
    expect(target.pathname).toBe(`/documents/contracts/${selectedId}`);
    const hubSearch = '?tab=contracts&q=Boiler+service&sort=oldest';
    expect(target.search).toBe(hubSearch);
    expect(window.location.search).toBe(hubSearch);
    hub.unmount();

    const view = render(
      await AgreementPage({
        params: Promise.resolve({ contractId: selectedId }),
        searchParams: Promise.resolve(Object.fromEntries(target.searchParams)),
      })
    );
    expect(await screen.findByText(agreement.description)).toBeVisible();
    expect(screen.getByText('A new washer is included.')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Signatures' })).toBeVisible();
    expect(screen.getAllByText(/^Signed \d/)).toHaveLength(2);
    expect(screen.queryByText('Newer draft terms')).toBeNull();
    const back = screen.getByRole('link', { name: 'Back to job paperwork' });
    expect(back).toHaveAttribute('href', `/documents${hubSearch}`);
    const returnHref = back.getAttribute('href');
    view.unmount();

    replaceState(null, '', returnHref);
    const restored = render(<PaperworkPage />);
    await within(restored.container).findByRole('link', {
      name: /Signed boiler agreement/,
    });
    expect(
      screen.getByRole('searchbox', { name: 'Search job paperwork' })
    ).toHaveValue('Boiler service');
    expect(screen.getByRole('button', { name: /^Contracts/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Oldest First' })).toBeVisible();
    expect(screen.queryByRole('link', { name: /Boiler payment/ })).toBeNull();
  }
);

it('shows an unavailable agreement without falling back to another contract', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        Response.json({ contracts: [{ ...agreement, id: newerId }] })
      )
  );
  render(
    await AgreementPage({
      params: Promise.resolve({ contractId: selectedId }),
      searchParams: Promise.resolve({
        redirect: 'https://example.invalid',
        tab: 'unknown',
      }),
    })
  );
  expect(
    await screen.findByText('This agreement is unavailable.')
  ).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'Signatures' })).toBeNull();
  expect(
    screen.getByRole('link', { name: 'Back to job paperwork' })
  ).toHaveAttribute('href', '/documents');
});
