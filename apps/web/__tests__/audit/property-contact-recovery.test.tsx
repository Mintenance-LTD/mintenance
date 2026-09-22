import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import TenantContacts from '@/app/properties/[id]/components/TenantContacts';
import TeamAccess from '@/app/properties/[id]/components/TeamAccess';
const m = vi.hoisted(() => ({
  fetch: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({
  default: { error: m.error, success: m.success },
}));
vi.mock('@/lib/csrf-client', () => ({ getCsrfToken: async () => 'test' }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', m.fetch);
});
it.each([
  { Component: TenantContacts, records: 'tenants' },
  { Component: TeamAccess, records: 'members' },
])(
  'offers recovery instead of an empty $records list after failure',
  async ({ Component, records }) => {
    m.fetch
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ [records]: [] }),
      });
    render(<Component propertyId='property' />);
    fireEvent.click(
      await screen.findByRole('button', { name: `Retry ${records}` })
    );
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(m.fetch).toHaveBeenCalledTimes(2);
  }
);
it('preserves tenant input and avoids false success when the saved record is missing', async () => {
  m.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ tenants: [] }),
  });
  render(<TenantContacts propertyId='property' />);
  fireEvent.click(await screen.findByRole('button', { name: 'Add tenant' }));
  fireEvent.change(screen.getByLabelText('Tenant name'), {
    target: { value: 'Synthetic tenant' },
  });
  m.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ tenant: null }),
  });
  fireEvent.click(
    screen.getByRole('button', { name: 'Add Tenant', exact: true })
  );
  await waitFor(() => expect(m.error).toHaveBeenCalled());
  expect((screen.getByLabelText('Tenant name') as HTMLInputElement).value).toBe(
    'Synthetic tenant'
  );
  expect(m.success).not.toHaveBeenCalled();
});
