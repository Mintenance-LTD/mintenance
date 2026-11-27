import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { expect, it, vi } from 'vitest';
import DisputesLayout from '@/app/disputes/layout';
import { getCurrentUserFromCookies } from '@/lib/auth';

vi.mock('@/lib/auth', () => ({ getCurrentUserFromCookies: vi.fn() }));
vi.mock('@/app/contractor/components/ContractorAccountShell', () => ({
  ContractorAccountShell: ({ children }: { children: ReactNode }) => (
    <div data-testid='contractor-navigation'>{children}</div>
  ),
}));
vi.mock('@/app/dashboard/components/HomeownerPageWrapper', () => ({
  HomeownerPageWrapper: ({ children }: { children: ReactNode }) => (
    <div data-testid='homeowner-navigation'>{children}</div>
  ),
}));

it.each(['contractor', 'homeowner'] as const)(
  'uses the signed-in %s navigation without changing dispute content',
  async (role) => {
    vi.mocked(getCurrentUserFromCookies).mockResolvedValue({
      id: 'qa-user',
      email: 'qa@example.test',
      role,
    } as NonNullable<Awaited<ReturnType<typeof getCurrentUserFromCookies>>>);
    const view = render(
      await DisputesLayout({ children: <h1>Case details</h1> })
    );
    expect(screen.getByTestId(role + '-navigation')).toHaveTextContent(
      'Case details'
    );
    expect(
      screen.queryByTestId(
        (role === 'contractor' ? 'homeowner' : 'contractor') + '-navigation'
      )
    ).toBeNull();
    view.unmount();
  }
);
