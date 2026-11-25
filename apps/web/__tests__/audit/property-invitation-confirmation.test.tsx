import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { PendingPropertyInvites } from '@/app/properties/components/PendingPropertyInvites';
const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  fetch: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}));
vi.mock('react-hot-toast', () => ({
  default: { success: mocks.success, error: mocks.error },
}));
vi.mock('@/lib/csrf-client', () => ({ getCsrfHeaders: async () => ({}) }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', mocks.fetch);
});
it('preserves the invitation when a successful HTTP response does not confirm the requested change', async () => {
  mocks.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      invites: [
        {
          id: 'invite',
          propertyId: 'property',
          propertyName: 'Synthetic property',
          role: 'manager',
        },
      ],
    }),
  });
  render(<PendingPropertyInvites />);
  const accept = await screen.findByRole('button', { name: /Accept/ });
  mocks.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      success: true,
      status: 'accepted',
      propertyId: 'another-property',
    }),
  });
  fireEvent.click(accept);
  await waitFor(() => expect(mocks.error).toHaveBeenCalled());
  expect(mocks.success).not.toHaveBeenCalled();
  expect(mocks.push).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: /Accept/ })).toBeDefined();
});

it('only shows a compact review link on the Properties page', async () => {
  mocks.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      invites: [
        {
          id: 'invite',
          propertyId: 'property',
          propertyName: 'Synthetic property',
          role: 'viewer',
        },
      ],
    }),
  });
  render(<PendingPropertyInvites compact />);
  expect(
    await screen.findByRole('link', { name: '1 pending invitation' })
  ).toHaveAttribute('href', '/properties/invitations');
  expect(screen.queryByText('Synthetic property')).toBeNull();
  expect(screen.queryByRole('button', { name: /Accept/ })).toBeNull();
});

it('accepts the focused property invitation and returns to the exact report', async () => {
  mocks.fetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        invites: [
          {
            id: 'elsewhere',
            propertyId: 'other',
            propertyName: 'Other property',
            role: 'manager',
          },
          {
            id: 'invite',
            propertyId: 'property',
            propertyName: 'Synthetic property',
            role: 'viewer',
          },
        ],
      }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        status: 'accepted',
        propertyId: 'property',
        role: 'viewer',
      }),
    });
  render(<PendingPropertyInvites propertyId='property' reportId='report' />);
  const accept = await screen.findByRole('button', {
    name: 'Accept and open report',
  });
  expect(screen.queryByText('Other property')).toBeNull();
  expect(screen.getByText(/A Free homeowner account can join/)).toBeVisible();
  fireEvent.click(accept);
  await waitFor(() =>
    expect(mocks.push).toHaveBeenCalledWith(
      '/properties/property/inspections/report'
    )
  );
});
