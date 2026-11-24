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
it('restores the exact tenancy and its report list on a direct folder visit', async () => {
  request.mockImplementation((url: string) =>
    ok({
      items: url.includes('/tenancies?') ? [folder] : [],
      canCreate: false,
      hasMore: false,
    })
  );
  render(<TenancyInspections propertyId='property' initialFolderId='folder' />);
  expect(await screen.findByLabelText('Tenancy folder')).toHaveValue('folder');
  await screen.findByText('No inspections in this tenancy yet.');
  expect(request).toHaveBeenNthCalledWith(
    1,
    '/api/properties/property/tenancies?folder=folder',
    expect.anything()
  );
  expect(request).toHaveBeenNthCalledWith(
    2,
    '/api/properties/property/inspections?folder=folder&offset=0',
    expect.anything()
  );
});
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
  expect(
    screen.getByRole('link', { name: 'Back to tenancy folder' })
  ).toHaveAttribute('href', '/properties/property/tenancies/folder');
  expect(container.querySelector('script')).toBeNull();
  expect(screen.getByText('<script>untrusted</script>')).toBeDefined();
  expect(
    screen.getByRole('button', { name: 'Copy member-only link' })
  ).toBeDefined();
});

it('warns before leaving a changed report and records an outside-tenancy reason', async () => {
  const confirm = vi.fn(() => false);
  vi.stubGlobal('confirm', confirm);
  try {
    request.mockImplementation((url: string, options?: RequestInit) =>
      ok(
        options?.method === 'POST'
          ? { id: 'saved' }
          : url.includes('room-photos')
            ? { photos: [] }
            : {
                items: url.includes('/tenancies?') ? [folder] : [],
                canCreate: true,
                hasMore: false,
              }
      )
    );
    render(
      <>
        <a href='/properties/property?tab=manage&manage=records'>
          Back to property records
        </a>
        <TenancyInspections propertyId='property' initialFolderId='folder' />
      </>
    );
    await screen.findByRole('button', { name: 'New inspection' });
    fireEvent.click(
      screen.getByRole('button', { name: 'Create Check-out report' })
    );
    fireEvent.change(screen.getByLabelText('Report title'), {
      target: { value: 'After handover' },
    });
    fireEvent.change(screen.getByLabelText('Inspection date'), {
      target: { value: '2025-12-31' },
    });
    expect(
      screen.getByRole('button', { name: 'Save shared report' })
    ).toBeDisabled();
    expect(
      fireEvent.click(
        screen.getByRole('link', { name: 'Back to property records' })
      )
    ).toBe(false);
    expect(confirm).toHaveBeenCalledWith(
      expect.stringContaining('Leave without saving?')
    );
    expect(screen.getByLabelText('Report title')).toHaveValue('After handover');
    fireEvent.change(screen.getByLabelText('Reason for the date exception'), {
      target: { value: 'Agreed early handover' },
    });
    const save = screen.getByRole('button', { name: 'Save shared report' });
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        '/api/properties/property/inspections',
        expect.objectContaining({
          body: expect.stringContaining(
            '"date_exception_reason":"Agreed early handover"'
          ),
        })
      )
    );
  } finally {
    vi.unstubAllGlobals();
  }
});

it('uploads a photo on the inspection form and saves its returned identifier', async () => {
  const photo = {
    id: 'uploaded-photo',
    room_type: 'kitchen',
    file_name: 'Kitchen.png',
  };
  let uploaded = false;
  request.mockImplementation((url: string, options?: RequestInit) => {
    if (url.includes('/room-photos')) {
      if (options?.method === 'POST') {
        expect(options.body).toBeInstanceOf(FormData);
        expect((options.body as FormData).get('room_type')).toBe('kitchen');
        uploaded = true;
        return ok({ photos: [photo], uploaded: 1 });
      }
      return ok({ photos: uploaded ? [photo] : [] });
    }
    return ok(
      options?.method === 'POST'
        ? { id: 'saved' }
        : {
            items: url.includes('/tenancies?') ? [folder] : [],
            canCreate: true,
            hasMore: false,
          }
    );
  });
  render(<TenancyInspections propertyId='property' initialFolderId='folder' />);
  await screen.findByRole('button', { name: 'New inspection' });
  fireEvent.click(
    screen.getByRole('button', { name: 'Create Check-in report' })
  );
  fireEvent.change(screen.getByLabelText('Room for new photo'), {
    target: { value: 'kitchen' },
  });
  fireEvent.change(screen.getByLabelText('Choose a photo'), {
    target: {
      files: [new File(['test'], 'Kitchen.png', { type: 'image/png' })],
    },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Upload and attach' }));
  expect(
    await screen.findByRole('checkbox', { name: /Kitchen.png/ })
  ).toBeChecked();
  fireEvent.change(screen.getByLabelText('Report title'), {
    target: { value: 'Kitchen condition' },
  });
  fireEvent.change(screen.getByLabelText('Inspection date'), {
    target: { value: '2026-11-01' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save shared report' }));
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith(
      '/api/properties/property/inspections',
      expect.objectContaining({
        body: expect.stringContaining('"photo_ids":["uploaded-photo"]'),
      })
    )
  );
});

it('compares observations and links corrections while retaining the saved tenancy dates', async () => {
  request.mockImplementation(() =>
    ok({
      folder: { ...folder, starts_on: '2026-01-02' },
      report: {
        id: 'report',
        title: 'Check-out',
        kind: 'check_out',
        inspected_on: '2026-11-24',
        created_at: '2026-11-25T08:00:00Z',
        notes: 'Scuffed wall',
        tenancy_starts_on: '2026-01-01',
        corrected_by_report_id: 'correction',
      },
      checkIn: {
        id: 'check-in',
        inspected_on: '2026-11-01',
        notes: 'Clean wall',
      },
      canCreate: true,
      photos: [],
    })
  );
  render(<InspectionReportView propertyId='property' reportId='report' />);
  expect(
    await screen.findByRole('link', { name: 'View correction' })
  ).toHaveAttribute('href', '/properties/property/inspections/correction');
  expect(
    screen.queryByRole('link', { name: 'Correct this report' })
  ).toBeNull();
  expect(
    screen.getByRole('link', { name: 'Compare with check-in' })
  ).toHaveAttribute('href', '#compare-check-in');
  expect(screen.getByText('Clean wall')).toBeVisible();
  expect(screen.getAllByText('Scuffed wall')).toHaveLength(2);
  expect(
    screen.getByText('Tenancy dates when saved').parentElement
  ).toHaveTextContent('1 Jan 2026');
  expect(
    screen.getByText('Current tenancy dates').parentElement
  ).toHaveTextContent('2 Jan 2026');
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
