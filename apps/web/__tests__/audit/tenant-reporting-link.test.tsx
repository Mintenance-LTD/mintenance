import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
const m = vi.hoisted(() => ({
  copy: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock('@/lib/utils/clipboard', () => ({ safeCopyToClipboard: m.copy }));
vi.mock('react-hot-toast', () => ({
  default: { success: m.success, error: m.error },
}));
vi.mock('@/lib/csrf-client', () => ({ getCsrfToken: vi.fn() }));
import { TenantReportingCard } from '@/app/properties/[id]/components/TenantReportingCard';
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
it('copies the separate reporting token used by the public endpoint', async () => {
  m.copy.mockResolvedValue(true);
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tokens: [
          {
            id: 'internal-row-id',
            token: 'public-report-token',
            property_id: 'property',
            label: 'Tenant link',
            is_active: true,
          },
        ],
      }),
    })
  );
  render(
    <TenantReportingCard propertyId='property' propertyName='Synthetic' />
  );
  fireEvent.click(
    await screen.findByRole('button', { name: 'Copy Tenant link' })
  );
  await waitFor(() =>
    expect(m.copy).toHaveBeenCalledWith(
      `${window.location.origin}/report/public-report-token`
    )
  );
  expect(m.success).toHaveBeenCalledWith('Link copied to clipboard');
});
it('does not copy an invalid URL when an older API response omits the token', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tokens: [
          {
            id: 'internal-row-id',
            property_id: 'property',
            label: 'Tenant link',
            is_active: true,
          },
        ],
      }),
    })
  );
  render(
    <TenantReportingCard propertyId='property' propertyName='Synthetic' />
  );
  fireEvent.click(
    await screen.findByRole('button', { name: 'Copy Tenant link' })
  );
  expect(m.copy).not.toHaveBeenCalled();
  expect(m.error).toHaveBeenCalledWith(
    'Reporting link unavailable. Reload and retry.'
  );
});
