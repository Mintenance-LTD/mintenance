import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
vi.mock('@/app/dashboard/components/HomeownerPageWrapper', () => ({
  HomeownerPageWrapper: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
import {
  deriveCounts,
  MintEditorialFinancials,
} from '@/app/financials/MintEditorialFinancials';
import { HomeownerPageFinder } from '@/app/dashboard/components/mint-editorial/HomeownerPageFinder';
import {
  getStatusConfig,
  formatDateTime,
} from '@/app/jobs/[id]/components/contract/contractHelpers';
import { ukDateTimeToISO } from '@/lib/scheduling/uk-date-time';
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
it('counts releases by release year, retaining pence and separate payments on one job', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-16T12:00:00Z'));
  const counts = deriveCounts([
    {
      id: 'a',
      status: 'released',
      amount: 1.2,
      created_at: '2025-12-01',
      released_at: '2026-01-02',
    },
    {
      id: 'b',
      status: 'released',
      amount: 2.4,
      created_at: '2026-02-01',
      released_at: '2026-03-01',
    },
    {
      id: 'c',
      status: 'released',
      amount: 3,
      created_at: '2026-04-01',
      released_at: null,
    },
    { id: 'd', status: 'held', amount: 9 },
  ]);
  expect(counts.releasedThisYear).toBeCloseTo(3.6);
  expect(counts.releasedCount).toBe(2);
  expect(counts.avgJobCost).toBeCloseTo(2.2);
  expect(counts.heldTotal).toBe(9);
});
it('shows named tradespeople, accurate average wording and the export destination', () => {
  render(
    <MintEditorialFinancials
      stats={{
        totalSpent: 0,
        spentCount: 0,
        pendingPayments: 0,
        overduePayments: 0,
        activeSubscriptions: 0,
        overdueSubscriptions: 0,
        totalBudget: 0,
        jobCount: 0,
        pendingInvoices: 0,
        overdueInvoices: 0,
      }}
      subscriptions={[]}
      invoices={[]}
      payments={[
        {
          id: 'one',
          amount: 1.2,
          status: 'released',
          payee: { first_name: 'Test', last_name: 'Tradesperson' },
        },
        {
          id: 'two',
          amount: 2.4,
          status: 'released',
          payee: [{ company_name: 'QA Company' }],
        },
      ]}
    />
  );
  expect(screen.getByText('Test Tradesperson')).toBeVisible();
  expect(screen.getByText('QA Company')).toBeVisible();
  expect(screen.getByText('Average released payment')).toBeVisible();
  expect(screen.getByText('£1.80')).toBeVisible();
  expect(
    screen.getByRole('link', { name: 'View payments and export' })
  ).toHaveAttribute('href', '/payments');
});
it('finds homeowner finance by its common name', () => {
  render(<HomeownerPageFinder />);
  fireEvent.click(screen.getByText('Find a page'));
  fireEvent.change(screen.getByRole('searchbox'), {
    target: { value: 'finance' },
  });
  expect(
    screen.getByRole('link', { name: 'Finance and financials' })
  ).toHaveAttribute('href', '/financials');
});
it('labels the actual next signer from both account roles', () => {
  expect(getStatusConfig('pending_homeowner', 'contractor').label).toBe(
    'Awaiting Homeowner Signature'
  );
  expect(getStatusConfig('pending_homeowner', 'homeowner').label).toBe(
    'Awaiting Your Signature'
  );
  expect(getStatusConfig('pending_contractor', 'contractor').label).toBe(
    'Awaiting Your Signature'
  );
  expect(getStatusConfig('pending_contractor', 'homeowner').label).toBe(
    'Awaiting Contractor'
  );
});
it('keeps contractor contract times in UK winter and summer time', () => {
  expect(ukDateTimeToISO('2026-11-17T09:00')).toBe('2026-11-17T09:00:00.000Z');
  expect(ukDateTimeToISO('2026-07-17T09:00')).toBe('2026-07-17T08:00:00.000Z');
  expect(formatDateTime('2026-11-18T15:02:00Z')).toContain('15:02');
  expect(formatDateTime('2026-11-18T15:02:00Z')).toContain('GMT');
});
