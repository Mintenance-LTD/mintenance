import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import BidSubmissionPage from '@/app/contractor/(dashboard)/bid/[jobId]/page';
import { MintEditorialContractorShell } from '@/app/contractor/components/mint-editorial/MintEditorialContractorShell';

const { tableData, query } = vi.hoisted(() => ({
  tableData: new Map<string, unknown[]>(),
  query: vi.fn(),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: query },
}));
vi.mock('@/lib/auth', () => ({
  getCurrentUserFromCookies: async () => ({
    id: 'contractor',
    role: 'contractor',
  }),
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/contractor/quotes',
  redirect: (href: string) => {
    throw Error(href);
  },
  notFound: () => {
    throw Error('Not found');
  },
}));
vi.mock('@/components/notifications/NotificationBell', () => ({
  NotificationBell: () => null,
}));
vi.mock(
  '@/app/contractor/components/mint-editorial/MintEditorialContractorSidebar',
  () => ({ MintEditorialContractorSidebar: () => null })
);
vi.mock(
  '@/app/contractor/components/mint-editorial/MintEditorialContractorTopNav',
  () => ({ MintEditorialContractorTopNav: () => null })
);
vi.mock('@/lib/services/payment/FeeCalculationService', () => ({
  FeeCalculationService: { resolveContractorTier: async () => 'basic' },
}));
vi.mock(
  '@/app/contractor/(dashboard)/bid/[jobId]/components/BidSubmissionClient2025',
  () => ({
    BidSubmissionClient2025: () => <button>Update Bid</button>,
  })
);

beforeEach(() => {
  const job = {
    id: 'job-120',
    title: 'Test maintenance',
    status: 'assigned',
    contractor_id: 'contractor',
    homeowner_id: 'customer',
  };
  const bid = {
    id: 'bid-id',
    amount: 1.2,
    status: 'accepted',
    quote_id: 'quote-id',
    message: 'Agreed bid',
  };
  tableData.set('jobs', [job]);
  tableData.set('bids', [bid]);
  tableData.set('current_contractor_quotes', [{ total_amount: 1.2 }]);
  tableData.set('contracts', [
    {
      id: 'contract-id',
      contractor_id: 'contractor',
      homeowner_id: 'customer',
      quote_id: 'quote-id',
      amount: 1.2,
      status: 'draft',
    },
  ]);
  query.mockImplementation((table: string) => {
    const rows = tableData.get(table) ?? [];
    const chain = {
      select: () => chain,
      eq: () => chain,
      not: () => chain,
      single: async () => ({ data: rows[0] ?? null, error: null }),
      maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
      limit: async () => ({ data: rows, error: null }),
    };
    return chain;
  });
});
afterEach(() => {
  cleanup();
  tableData.clear();
  vi.clearAllMocks();
});

const viewBid = () =>
  BidSubmissionPage({ params: Promise.resolve({ jobId: 'job-120' }) });

it('shows a signed, funded bid as a read-only record with the exact job link', async () => {
  tableData.set('contracts', [
    {
      ...(tableData.get('contracts')![0] as object),
      homeowner_signed_at: '2026-11-24',
    },
  ]);
  tableData.set('escrow_transactions', [{ job_id: 'job-120' }]);
  render(await viewBid());
  expect(screen.getByText('accepted · Read-only record')).toBeInTheDocument();
  expect(screen.getByText('£1.20')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'View job' })).toHaveAttribute(
    'href',
    '/contractor/jobs/job-120'
  );
  expect(screen.queryByRole('button', { name: 'Update Bid' })).toBeNull();
  expect(screen.queryByRole('link', { name: /amendments/i })).toBeNull();
});

it('offers the separate amendments flow only for an eligible accepted bid', async () => {
  render(await viewBid());
  expect(
    screen.getByRole('link', { name: /quote amendments/i })
  ).toHaveAttribute('href', '/contractor/quotes/quote-id/history');
  cleanup();
  tableData.set('escrow_transactions', [{ job_id: 'job-120' }]);
  render(await viewBid());
  expect(screen.queryByRole('link', { name: /amendments/i })).toBeNull();
});

it.each(['bid', 'bids', 'My Bids'])(
  'finds marketplace bids for “%s”',
  (search) => {
    render(
      <MintEditorialContractorShell contractorName='Test contractor'>
        <div />
      </MintEditorialContractorShell>
    );
    fireEvent.click(screen.getByText('Find a page'));
    fireEvent.change(screen.getByLabelText('Search contractor pages'), {
      target: { value: search },
    });
    expect(
      screen.getByRole('link', { name: 'Marketplace bids' })
    ).toHaveAttribute('href', '/contractor/bid');
  }
);
