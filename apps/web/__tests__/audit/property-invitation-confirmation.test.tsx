import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { PendingPropertyInvites } from '@/app/properties/components/PendingPropertyInvites';
const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  fetch: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
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
  expect(mocks.refresh).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: /Accept/ })).toBeDefined();
});
