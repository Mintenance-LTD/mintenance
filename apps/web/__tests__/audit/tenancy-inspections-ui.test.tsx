import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TenancyInspections from '@/app/properties/[id]/components/TenancyInspections';
import InspectionReportView from '@/app/properties/[id]/inspections/[reportId]/report-view';
vi.mock('@/lib/csrf-client', () => ({
  getCsrfHeaders: async () => ({ 'x-csrf-token': 'test' }),
}));
const request = vi.fn();
const folder = {
  id: 'folder',
  revision: 0,
  label: 'Tenancy 2026',
  starts_on: '2026-01-01',
  ends_on: null,
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', request);
});
const ok = (body: unknown) =>
  Promise.resolve({ ok: true, json: async () => body });
it('keeps viewers out of creation forms', async () => {
  request.mockImplementation(() =>
    ok({ items: [folder], canCreate: false, hasMore: false })
  );
  render(<TenancyInspections propertyId='property' />);
  await screen.findByText(/You can read saved reports/);
  expect(
    screen.queryByRole('button', { name: 'New tenancy folder' })
  ).toBeNull();
});
it('does not show empty success when loading fails', async () => {
  request.mockResolvedValue({ ok: false, status: 503 });
  render(<TenancyInspections propertyId='property' />);
  await screen.findByRole('alert');
  expect(screen.queryByText('No tenancy folders yet.')).toBeNull();
});
it('creates a folder with explicit dates and CSRF', async () => {
  request.mockImplementation((_url: string, options?: RequestInit) =>
    ok(
      options?.method === 'POST'
        ? { id: 'new' }
        : { items: [folder], canCreate: true, hasMore: false }
    )
  );
  render(<TenancyInspections propertyId='property' />);
  fireEvent.click(
    await screen.findByRole('button', { name: 'New tenancy folder' })
  );
  fireEvent.change(screen.getByLabelText('Folder name'), {
    target: { value: 'New tenancy' },
  });
  fireEvent.change(screen.getByLabelText('Tenancy starts'), {
    target: { value: '2026-11-01' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Create folder' }));
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith(
      '/api/properties/property/tenancies',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-csrf-token': 'test' }),
        body: JSON.stringify({
          label: 'New tenancy',
          starts_on: '2026-11-01',
          ends_on: null,
        }),
      })
    )
  );
});
it('saves inspection with selected photo identifiers only', async () => {
  request.mockImplementation((url: string, options?: RequestInit) =>
    ok(
      options?.method === 'POST'
        ? { id: 'report' }
        : url.includes('room-photos')
          ? {
              photos: [
                {
                  id: 'photo',
                  room_type: 'kitchen',
                  file_name: 'Kitchen.jpg',
                  created_at: '2026-10-30T10:00:00Z',
                },
              ],
            }
          : {
              items: url.includes('/inspections') ? [] : [folder],
              canCreate: true,
              hasMore: false,
            }
    )
  );
  render(<TenancyInspections propertyId='property' />);
  await screen.findByRole('button', { name: 'New tenancy folder' });
  fireEvent.change(screen.getByLabelText('Tenancy folder'), {
    target: { value: 'folder' },
  });
  fireEvent.click(
    await screen.findByRole('button', { name: 'New inspection' })
  );
  fireEvent.change(screen.getByLabelText('Report title'), {
    target: { value: 'Move-in' },
  });
  fireEvent.change(screen.getByLabelText('Inspection date'), {
    target: { value: '2026-10-30' },
  });
  fireEvent.click(await screen.findByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Save shared report' }));
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith(
      '/api/properties/property/inspections',
      expect.objectContaining({
        body: JSON.stringify({
          folder_id: 'folder',
          title: 'Move-in',
          kind: 'check_in',
          inspected_on: '2026-10-30',
          notes: '',
          photo_ids: ['photo'],
        }),
      })
    )
  );
});
it('preserves deleted-photo history and escapes report notes', async () => {
  request.mockImplementation(() =>
    ok({
      folder,
      report: {
        id: 'report',
        title: 'Check-in',
        kind: 'check_in',
        inspected_on: '2026-10-30',
        created_at: '2026-10-30T10:00:00Z',
        notes: '<script>untrusted</script>',
      },
      photos: [
        {
          id: 'image',
          room_type: 'kitchen',
          file_name: 'Kitchen.jpg',
          uploaded_at: null,
          available: false,
        },
      ],
    })
  );
  const { container } = render(
    <InspectionReportView propertyId='property' reportId='report' />
  );
  await screen.findByText('Original photo deleted or unavailable.');
  expect(container.querySelector('script')).toBeNull();
  expect(screen.getByText('<script>untrusted</script>')).toBeDefined();
  expect(
    screen.getByRole('button', { name: 'Copy member-only link' })
  ).toBeDefined();
});

it('edits a folder using its current revision', async () => {
  request.mockImplementation((_url: string, options?: RequestInit) =>
    ok(
      options?.method === 'PATCH'
        ? { id: 'folder' }
        : { items: [folder], canCreate: true, hasMore: false }
    )
  );
  render(<TenancyInspections propertyId='property' />);
  await screen.findByRole('button', { name: 'New tenancy folder' });
  fireEvent.change(screen.getByLabelText('Tenancy folder'), {
    target: { value: 'folder' },
  });
  fireEvent.click(
    await screen.findByRole('button', { name: 'Edit tenancy folder' })
  );
  expect((screen.getByLabelText('Folder name') as HTMLInputElement).value).toBe(
    'Tenancy 2026'
  );
  fireEvent.change(screen.getByLabelText('Tenancy ends (optional)'), {
    target: { value: '2026-10-30' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save folder changes' }));
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith(
      '/api/properties/property/tenancies',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          label: 'Tenancy 2026',
          starts_on: '2026-01-01',
          ends_on: '2026-10-30',
          id: 'folder',
          revision: 0,
        }),
      })
    )
  );
});
