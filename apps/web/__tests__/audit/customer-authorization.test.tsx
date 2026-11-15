import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const s = vi.hoisted(() => ({
  actor: 'contractor-a',
  role: 'contractor',
  customer: 'customer-a',
  failJobs: false,
  failPayments: false,
  customers: vi.fn(),
  queries: [] as Array<{
    table: string;
    filters: Record<string, unknown>;
    projection: string;
  }>,
}));
vi.mock('@/lib/auth', () => ({
  getCurrentUserFromCookies: async () =>
    s.role ? { id: s.actor, role: s.role } : null,
}));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: 'mint-editorial' }) }),
}));
vi.mock('next/navigation', () => ({
  redirect: () => {
    throw Error('redirect');
  },
  notFound: () => {
    throw Error('not found');
  },
}));
vi.mock(
  '@/app/contractor/(dashboard)/customers/components/MintEditorialCustomersView',
  () => ({
    MintEditorialCustomersView: (props: unknown) => {
      s.customers(props);
      return <div>Customer summary</div>;
    },
  })
);
vi.mock('next/image', () => ({ default: () => null }));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: (table: string) => {
      const entry = {
        table,
        filters: {} as Record<string, unknown>,
        projection: '',
      };
      s.queries.push(entry);
      const jobs = [
        {
          id: 'job-a',
          contractor_id: 'contractor-a',
          homeowner_id: 'customer-a',
          homeowner: {
            id: 'customer-a',
            first_name: 'Synthetic',
            email: 'private@example.invalid',
          },
          title: 'Assigned garden',
          status: 'completed',
          created_at: '2026-11-01',
          budget: 999,
        },
        {
          id: 'job-b',
          contractor_id: 'contractor-b',
          homeowner_id: 'customer-a',
          homeowner: {
            id: 'customer-a',
            first_name: 'Synthetic',
            email: 'private@example.invalid',
          },
          title: 'Other contractor private job',
          status: 'completed',
          created_at: '2026-11-02',
          budget: 888,
        },
      ];
      const payments = [
        {
          id: 'payment-a',
          job_id: 'job-a',
          payee_id: 'contractor-a',
          status: 'released',
          amount: '12.50',
        },
        {
          id: 'held',
          job_id: 'job-a',
          payee_id: 'contractor-a',
          status: 'held',
          amount: 700,
        },
        {
          id: 'other',
          job_id: 'job-b',
          payee_id: 'contractor-b',
          status: 'released',
          amount: 900,
        },
      ];
      const result = () => {
        if (
          (table === 'jobs' && s.failJobs) ||
          (table === 'escrow_transactions' && s.failPayments)
        )
          return { data: null, error: { code: 'TEST' } };
        const rows =
          table === 'jobs'
            ? jobs
            : table === 'escrow_transactions'
              ? payments
              : [];
        const data = rows.filter((row) =>
          Object.entries(entry.filters).every(([k, v]) =>
            Array.isArray(v)
              ? v.includes((row as Record<string, unknown>)[k])
              : (row as Record<string, unknown>)[k] === v
          )
        );
        return {
          data:
            table === 'profiles'
              ? {
                  id: s.customer,
                  first_name: 'Synthetic',
                  last_name: 'Customer',
                  email: 'private@example.invalid',
                }
              : data,
          error: null,
        };
      };
      const q = {
        select: (v: string) => {
          entry.projection = v;
          return q;
        },
        eq: (k: string, v: unknown) => {
          entry.filters[k] = v;
          return q;
        },
        in: (k: string, v: unknown) => {
          entry.filters[k] = v;
          return q;
        },
        order: () => q,
        not: () => q,
        range: () => q,
        or: () => q,
        limit: () => q,
        single: async () => result(),
        then: (resolve: (v: unknown) => unknown) =>
          Promise.resolve(result()).then(resolve),
      };
      return q;
    },
  },
}));
import CustomersPage from '@/app/contractor/(dashboard)/customers/page';
import Page from '@/app/contractor/(dashboard)/customers/[id]/page';
const page = (id = 'customer-a') => Page({ params: Promise.resolve({ id }) });
beforeEach(() => {
  s.actor = 'contractor-a';
  s.role = 'contractor';
  s.failJobs = false;
  s.failPayments = false;
  s.queries = [];
  s.customers.mockClear();
});
it('denies an unrelated contractor before fetching any customer contact or financial data', async () => {
  s.actor = 'contractor-stranger';
  await expect(page()).rejects.toThrow('not found');
  expect(s.queries.map((q) => q.table)).toEqual(['jobs']);
  expect(s.queries[0].filters).toEqual({
    contractor_id: s.actor,
    homeowner_id: 'customer-a',
  });
});
it('does not grant customer contact access merely from a bid or conversation', async () => {
  await expect(page('unassigned-customer')).rejects.toThrow('not found');
  expect(s.queries.map((q) => q.table)).toEqual(['jobs']);
});
it('fails closed when relationship lookup fails', async () => {
  s.failJobs = true;
  await expect(page()).rejects.toThrow('Report data could not be loaded');
  expect(s.queries.map((q) => q.table)).toEqual(['jobs']);
});
it.each(['', 'homeowner', 'admin'])(
  'rejects a non-contractor before all queries (%s)',
  async (role) => {
    s.role = role;
    await expect(page()).rejects.toThrow('redirect');
    expect(s.queries).toEqual([]);
  }
);
it('shows only assigned work and released gross payments, never budgets or another contractor escrow', async () => {
  render(await page());
  expect(screen.getByText('Assigned garden')).toBeInTheDocument();
  expect(
    screen.queryByText('Other contractor private job')
  ).not.toBeInTheDocument();
  expect(screen.getByText(/12.50 released/)).toBeInTheDocument();
  const financial = s.queries.find((q) => q.table === 'escrow_transactions');
  expect(financial?.filters).toEqual({
    payee_id: 'contractor-a',
    job_id: ['job-a'],
    status: ['released', 'completed'],
  });
  expect(s.queries[0].table).toBe('jobs');
  expect(s.queries[1].table).toBe('profiles');
});
it('does not substitute a budget when payment history is unavailable', async () => {
  s.failPayments = true;
  await expect(page()).rejects.toThrow(
    'Released customer payments unavailable'
  );
});

it.each([
  ['contractor-a', 12.5],
  ['contractor-b', 900],
])(
  'uses the same released payment definition on the customer list for %s',
  async (actor, total) => {
    s.actor = actor;
    render(await CustomersPage());
    expect(s.customers).toHaveBeenCalledWith(
      expect.objectContaining({
        customers: [expect.objectContaining({ id: 'customer-a', ltv: total })],
      })
    );
    expect(s.queries.some((q) => q.table === 'bids')).toBe(false);
  }
);
