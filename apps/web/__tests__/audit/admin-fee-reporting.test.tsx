import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
vi.mock('@/components/ui/Icon', () => ({ Icon: () => null }));
vi.mock('@/components/ui/Button', () => ({
  Button: ({ children }: { children: React.ReactNode }) => (
    <button>{children}</button>
  ),
}));
vi.mock('@/components/ui/Card.unified', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/admin/AdminMetricCard', () => ({
  AdminMetricCard: ({
    label,
    value,
    subtitle,
  }: {
    label: string;
    value: string;
    subtitle: string;
  }) => (
    <section data-testid={`metric-${label}`}>
      <h3>{label}</h3>
      <span>{value}</span>
      <p>{subtitle}</p>
    </section>
  ),
}));
import { FeeTransferManagementClient } from '@/app/admin/payments/fees/components/FeeTransferManagementClient';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe('admin fee reporting financial uncertainty', () => {
  it('shows unknown revenue and derives pending and held amounts from their actual records', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            transfers: [
              {
                id: 'pending',
                amount: 10,
                status: 'pending',
                net_revenue: null,
                stripe_processing_fee: null,
                created_at: '2026-09-15T00:00:00Z',
                jobs: { title: 'Pending job' },
              },
              {
                id: 'held',
                amount: 20,
                status: 'held',
                net_revenue: 18,
                stripe_processing_fee: 2,
                created_at: '2026-09-15T00:00:00Z',
                metadata: { processingFeeStatus: 'estimated' },
                jobs: { title: 'Held job' },
              },
            ],
          })
        )
      )
    );
    render(<FeeTransferManagementClient />);
    await screen.findByText('Pending job');
    expect(
      within(screen.getByTestId('metric-Pending Transfers')).getByText('£10.00')
    ).toBeTruthy();
    expect(
      within(screen.getByTestId('metric-On Hold')).getByText('£20.00')
    ).toBeTruthy();
    expect(
      within(screen.getByTestId('metric-Unreconciled Net Revenue')).getByText(
        'Pending reconciliation'
      )
    ).toBeTruthy();
    expect(screen.getByText('Estimate: £18.00')).toBeTruthy();
  });
  it('does not present a legacy number without provider provenance as confirmed revenue', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            transfers: [
              {
                id: 'legacy',
                amount: 12,
                status: 'held',
                net_revenue: 10.3,
                stripe_processing_fee: 1.7,
                created_at: '2026-09-15T00:00:00Z',
                jobs: { title: 'Legacy job' },
              },
            ],
          })
        )
      )
    );
    render(<FeeTransferManagementClient />);
    expect(await screen.findByText('Unverified: £10.30')).toBeTruthy();
    expect(
      within(screen.getByTestId('metric-Unreconciled Net Revenue')).getByText(
        'Processing costs are estimates or unverified'
      )
    ).toBeTruthy();
  });
});
