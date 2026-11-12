import React from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import TenancyInspections from '@/app/properties/[id]/components/TenancyInspections';
import RoomPhotoGallery from '@/app/properties/[id]/components/RoomPhotoGallery';
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast }));
vi.mock('@/lib/csrf-client', () => ({
  getCsrfHeaders: async () => ({ 'x-csrf-token': 'test' }),
}));
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));
const request = vi.fn();
const folder = {
  id: 'folder',
  revision: 0,
  label: 'Tenancy 2026',
  starts_on: '2026-01-01',
  ends_on: null,
};
const photo = {
  id: 'photo',
  room_type: 'kitchen',
  file_name: 'Kitchen.png',
  photo_url: '/kitchen.png',
  created_at: '2026-10-30T10:00:00Z',
};
const response = (body: unknown, status = 200) => ({
  ok: status < 400,
  status,
  json: async () => body,
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
beforeEach(() => {
  vi.clearAllMocks();
  request.mockReset();
  vi.stubGlobal('fetch', request);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
function inspectionReads(canCreate = true) {
  request.mockImplementation(async (url: string, options?: RequestInit) => {
    if (options?.method) return response({ id: 'saved' });
    return response(
      url.includes('room-photos')
        ? { photos: [photo] }
        : {
            items: url.includes('/inspections') ? [] : [folder],
            canCreate,
            hasMore: false,
          }
    );
  });
}
async function selectFolder() {
  await screen.findByRole('option', { name: /Tenancy 2026/ });
  fireEvent.change(screen.getByLabelText('Tenancy folder'), {
    target: { value: 'folder' },
  });
  await screen.findByRole('button', { name: 'New inspection' });
}
it.each([
  ['Check-in', 'check_in'],
  ['Routine inspection', 'routine'],
  ['Check-out', 'check_out'],
])(
  'opens and saves the %s shortcut with the correct tenancy and type',
  async (label, kind) => {
    inspectionReads();
    render(<TenancyInspections propertyId='property' />);
    expect(
      await screen.findByRole('button', { name: `Create ${label} report` })
    ).toBeDisabled();
    await selectFolder();
    fireEvent.click(
      screen.getByRole('button', { name: `Create ${label} report` })
    );
    expect(screen.getByLabelText('Inspection type')).toHaveValue(kind);
    fireEvent.change(screen.getByLabelText('Report title'), {
      target: { value: 'Condition record' },
    });
    fireEvent.change(screen.getByLabelText('Inspection date'), {
      target: { value: '2026-11-12' },
    });
    fireEvent.click(await screen.findByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Save shared report' }));
    await waitFor(() =>
      expect(
        request.mock.calls.some(([, options]) => options?.method === 'POST')
      ).toBe(true)
    );
    const [, options] = request.mock.calls.find(
      ([, options]) => options?.method === 'POST'
    )!;
    expect(options.headers['x-csrf-token']).toBe('test');
    expect(JSON.parse(options.body)).toMatchObject({
      folder_id: 'folder',
      title: 'Condition record',
      kind,
      inspected_on: '2026-11-12',
      photo_ids: ['photo'],
    });
  }
);
it('keeps written observations when changing inspection type and lets the user cancel', async () => {
  inspectionReads();
  render(<TenancyInspections propertyId='property' />);
  await selectFolder();
  fireEvent.click(
    screen.getByRole('button', { name: 'Create Check-in report' })
  );
  fireEvent.change(screen.getByLabelText('Observations'), {
    target: { value: 'Existing notes' },
  });
  fireEvent.click(
    screen.getByRole('button', { name: 'Create Check-out report' })
  );
  expect(screen.getByLabelText('Observations')).toHaveValue('Existing notes');
  expect(screen.getByLabelText('Inspection type')).toHaveValue('check_out');
  fireEvent.click(screen.getByRole('button', { name: 'Cancel report' }));
  expect(screen.queryByLabelText('Report title')).toBeNull();
  expect(request.mock.calls.some(([, options]) => options?.method)).toBe(false);
});
it('keeps inspection shortcuts disabled for read-only members', async () => {
  inspectionReads(false);
  render(<TenancyInspections propertyId='property' />);
  await screen.findByRole('option', { name: /Tenancy 2026/ });
  fireEvent.change(screen.getByLabelText('Tenancy folder'), {
    target: { value: 'folder' },
  });
  await screen.findByText('No inspections in this tenancy yet.');
  for (const label of ['Check-in', 'Routine inspection', 'Check-out'])
    expect(
      screen.getByRole('button', { name: `Create ${label} report` })
    ).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'New inspection' })).toBeNull();
});
it('does not dismiss an inspection draft after an unconfirmed save and blocks duplicate submissions', async () => {
  const pending = deferred<ReturnType<typeof response>>();
  inspectionReads();
  const read = request.getMockImplementation()!;
  request.mockImplementation((url, options) =>
    options?.method ? pending.promise : read(url, options)
  );
  render(<TenancyInspections propertyId='property' />);
  await selectFolder();
  fireEvent.click(
    screen.getByRole('button', { name: 'Create Routine inspection report' })
  );
  fireEvent.change(screen.getByLabelText('Report title'), {
    target: { value: 'Retained draft' },
  });
  fireEvent.change(screen.getByLabelText('Inspection date'), {
    target: { value: '2026-11-12' },
  });
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Save shared report' })
    ).toBeEnabled()
  );
  const form = screen.getByLabelText('Report title').closest('form')!;
  fireEvent.submit(form);
  fireEvent.submit(form);
  expect(screen.getByLabelText('Report title')).toBeDisabled();
  expect(
    screen.getByRole('button', { name: 'Create Check-in report' })
  ).toBeDisabled();
  await waitFor(() =>
    expect(
      request.mock.calls.filter(([, options]) => options?.method)
    ).toHaveLength(1)
  );
  await act(async () => pending.resolve(response({})));
  expect(await screen.findByRole('alert')).toHaveTextContent('not confirmed');
  expect(screen.getByLabelText('Report title')).toHaveValue('Retained draft');
});
it('resets the selected tenancy and draft when the property changes', async () => {
  inspectionReads();
  const view = render(<TenancyInspections propertyId='property' />);
  await selectFolder();
  fireEvent.click(
    screen.getByRole('button', { name: 'Create Check-in report' })
  );
  fireEvent.change(screen.getByLabelText('Report title'), {
    target: { value: 'Private old draft' },
  });
  view.rerender(<TenancyInspections propertyId='another' />);
  await screen.findByRole('option', { name: /Tenancy 2026/ });
  expect(screen.getByLabelText('Tenancy folder')).toHaveValue('');
  expect(screen.queryByDisplayValue('Private old draft')).toBeNull();
});
it('does not close the folder form when the server does not confirm its save', async () => {
  inspectionReads();
  const read = request.getMockImplementation()!;
  request.mockImplementation((url, options) =>
    options?.method ? Promise.resolve(response({})) : read(url, options)
  );
  render(<TenancyInspections propertyId='property' />);
  fireEvent.click(
    await screen.findByRole('button', { name: 'New tenancy folder' })
  );
  fireEvent.change(screen.getByLabelText('Folder name'), {
    target: { value: 'New folder' },
  });
  fireEvent.change(screen.getByLabelText('Tenancy starts'), {
    target: { value: '2026-11-12' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Create folder' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('not confirmed');
  expect(screen.getByLabelText('Folder name')).toHaveValue('New folder');
});
function selectFiles(files: File[]) {
  fireEvent.change(screen.getByLabelText('Choose room photos'), {
    target: { files },
  });
}
async function kitchen() {
  await screen.findByAltText('Kitchen.png');
  fireEvent.click(screen.getByRole('button', { name: 'Kitchen', exact: true }));
}
it('filters all-room albums by room and date and resets the date when changing rooms', async () => {
  request.mockResolvedValue(
    response({
      photos: [
        photo,
        { ...photo, id: 'bed', room_type: 'bedroom', file_name: 'Bedroom.png' },
        {
          ...photo,
          id: 'older',
          file_name: 'Older.png',
          created_at: '2026-10-29T10:00:00Z',
        },
      ],
    })
  );
  render(<RoomPhotoGallery propertyId='property' />);
  await screen.findByAltText('Kitchen.png');
  expect(screen.getAllByRole('img')).toHaveLength(3);
  fireEvent.change(screen.getByLabelText('Upload date (UTC)'), {
    target: { value: '2026-10-29' },
  });
  expect(screen.getAllByRole('img')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Bedroom', exact: true }));
  expect(screen.getByAltText('Bedroom.png')).toBeDefined();
  expect(screen.queryByAltText('Older.png')).toBeNull();
  fireEvent.click(
    screen.getByRole('button', { name: 'All rooms', exact: true })
  );
  expect(screen.getAllByRole('img')).toHaveLength(3);
  expect(screen.queryByRole('button', { name: /Upload photos to/ })).toBeNull();
});
it('uploads to the selected room with CSRF, locks room changes and refreshes after confirmation', async () => {
  const pending = deferred<ReturnType<typeof response>>();
  let uploaded = false;
  request.mockImplementation(async (_url, options) =>
    options?.method === 'POST'
      ? pending.promise
      : response({
          photos: uploaded
            ? [photo, { ...photo, id: 'new', file_name: 'New.png' }]
            : [photo],
        })
  );
  render(<RoomPhotoGallery propertyId='property' />);
  await kitchen();
  selectFiles([new File(['image'], 'New.png', { type: 'image/png' })]);
  selectFiles([new File(['image'], 'New.png', { type: 'image/png' })]);
  await waitFor(() =>
    expect(
      request.mock.calls.filter(([, options]) => options?.method === 'POST')
    ).toHaveLength(1)
  );
  const [, options] = request.mock.calls.find(
    ([, options]) => options?.method === 'POST'
  )!;
  expect(options.body.get('room_type')).toBe('kitchen');
  expect(options.body.getAll('photos')).toHaveLength(1);
  expect(options.headers['x-csrf-token']).toBe('test');
  expect(
    screen.getByRole('button', { name: 'Bedroom', exact: true })
  ).toBeDisabled();
  uploaded = true;
  await act(async () =>
    pending.resolve(
      response({ uploaded: 1, photos: [{ id: 'new', room_type: 'kitchen' }] })
    )
  );
  await screen.findByAltText('New.png');
  expect(toast.success).toHaveBeenCalledWith('1 photo uploaded');
  expect(
    screen.getByRole('button', { name: 'Bedroom', exact: true })
  ).toBeEnabled();
});
it('rejects unsupported, oversized and excessive photo selections before sending', async () => {
  request.mockResolvedValue(response({ photos: [photo] }));
  render(<RoomPhotoGallery propertyId='property' />);
  await kitchen();
  selectFiles([new File(['text'], 'notes.txt', { type: 'text/plain' })]);
  const oversized = new File(['x'], 'large.png', { type: 'image/png' });
  Object.defineProperty(oversized, 'size', { value: 6 * 1024 * 1024 });
  selectFiles([oversized]);
  selectFiles(
    Array.from(
      { length: 11 },
      () => new File(['x'], 'photo.png', { type: 'image/png' })
    )
  );
  expect(toast.error).toHaveBeenCalledTimes(3);
  expect(
    request.mock.calls.some(([, options]) => options?.method === 'POST')
  ).toBe(false);
});
it.each([
  response({ error: { message: 'denied' } }, 403),
  response({ uploaded: 1, photos: [] }),
])(
  'does not report success for a rejected or unconfirmed photo upload',
  async (result) => {
    request.mockImplementation(async (_url, options) =>
      options?.method === 'POST' ? result : response({ photos: [photo] })
    );
    render(<RoomPhotoGallery propertyId='property' />);
    await kitchen();
    selectFiles([new File(['x'], 'new.png', { type: 'image/png' })]);
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(typeof toast.error.mock.calls[0][0]).toBe('string');
    expect(toast.success).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Upload photos to Kitchen' })
      ).toBeEnabled()
    );
  }
);
it('requires deletion confirmation and keeps the photo after a failed deletion', async () => {
  request.mockImplementation(async (_url, options) =>
    options?.method === 'DELETE'
      ? response({}, 502)
      : response({ photos: [photo] })
  );
  const confirm = vi.fn().mockReturnValue(false);
  vi.stubGlobal('confirm', confirm);
  render(<RoomPhotoGallery propertyId='property' />);
  await kitchen();
  fireEvent.click(screen.getByRole('button', { name: 'Delete Kitchen.png' }));
  expect(
    request.mock.calls.some(([, options]) => options?.method === 'DELETE')
  ).toBe(false);
  confirm.mockReturnValue(true);
  fireEvent.click(screen.getByRole('button', { name: 'Delete Kitchen.png' }));
  await waitFor(() =>
    expect(toast.error).toHaveBeenCalledWith('Failed to delete photo')
  );
  expect(screen.getByAltText('Kitchen.png')).toBeDefined();
  expect(toast.success).not.toHaveBeenCalled();
});
it('does not carry a room selection or an old upload result into another property', async () => {
  const pending = deferred<ReturnType<typeof response>>();
  request.mockImplementation(async (url, options) =>
    options?.method === 'POST'
      ? pending.promise
      : response({ photos: url.includes('/another/') ? [] : [photo] })
  );
  const view = render(<RoomPhotoGallery propertyId='property' />);
  await kitchen();
  selectFiles([new File(['x'], 'new.png', { type: 'image/png' })]);
  await waitFor(() =>
    expect(
      request.mock.calls.some(([, options]) => options?.method === 'POST')
    ).toBe(true)
  );
  view.rerender(<RoomPhotoGallery propertyId='another' />);
  await screen.findByText(
    'No room photos yet. Choose a room to upload photos.'
  );
  await act(async () =>
    pending.resolve(
      response({ uploaded: 1, photos: [{ id: 'new', room_type: 'kitchen' }] })
    )
  );
  expect(screen.getByLabelText('Room')).toHaveValue('');
  expect(toast.success).not.toHaveBeenCalled();
  expect(
    request.mock.calls.filter(([url]) => url.includes('/another/'))
  ).toHaveLength(1);
});
