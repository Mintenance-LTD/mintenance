import React from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import TenancyInspections from '@/app/properties/[id]/components/TenancyInspections';
import VisitResponses from '@/app/appointments/response/page';

vi.mock('@/lib/csrf-client', () => ({
  getCsrfHeaders: async () => ({ 'x-csrf-token': 'test' }),
}));
vi.mock('@/components/property-operations/OperationsPage', () => ({
  OperationsPage: ({
    children,
    action,
  }: {
    children: React.ReactNode;
    action: React.ReactNode;
  }) => (
    <main>
      {action}
      {children}
    </main>
  ),
}));
const request = vi.fn();
const response = (status: number, data: unknown = {}) => ({
  ok: status < 400,
  status,
  json: async () => data,
});
const originalFolder = {
  id: 'folder',
  revision: 0,
  label: 'Original tenancy',
  starts_on: '2026-01-01',
  ends_on: null,
};
const originalVisit = {
  id: 'visit',
  title: 'Original visit',
  date: '2026-11-10',
  time: '09:00:00',
  endTime: '10:00:00',
  clientResponse: 'pending',
  canRespond: true,
};
beforeEach(() => {
  request.mockReset();
  vi.stubGlobal('fetch', request);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
async function editFolder() {
  render(<TenancyInspections propertyId='property' />);
  await screen.findByRole('button', { name: 'New tenancy folder' });
  fireEvent.change(screen.getByLabelText('Tenancy folder'), {
    target: { value: 'folder' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Edit tenancy folder' }));
}

it('preserves tenancy edits across a temporary save failure and list retry', async () => {
  let failSave = true;
  request.mockImplementation(async (url: string, options?: RequestInit) =>
    options?.method === 'PATCH'
      ? response(failSave ? 503 : 200, { id: 'folder' })
      : response(200, {
          items: url.includes('/inspections') ? [] : [originalFolder],
          canCreate: true,
          hasMore: false,
        })
  );
  await editFolder();
  fireEvent.change(screen.getByLabelText('Folder name'), {
    target: { value: 'My unsaved tenancy name' },
  });
  fireEvent.change(screen.getByLabelText('Tenancy ends (optional)'), {
    target: { value: '2026-12-31' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save folder changes' }));
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await screen.findByLabelText('Folder name');
  expect(screen.getByLabelText('Folder name')).toHaveValue(
    'My unsaved tenancy name'
  );
  expect(screen.getByLabelText('Tenancy ends (optional)')).toHaveValue(
    '2026-12-31'
  );
  expect(
    request.mock.calls.filter(([, o]) => o?.method === 'PATCH')
  ).toHaveLength(1);
  failSave = false;
  fireEvent.click(screen.getByRole('button', { name: 'Save folder changes' }));
  await waitFor(() =>
    expect(
      request.mock.calls.filter(([, o]) => o?.method === 'PATCH')
    ).toHaveLength(2)
  );
  const payload = JSON.parse(
    request.mock.calls.filter(([, o]) => o?.method === 'PATCH')[1][1].body
  );
  expect(payload).toMatchObject({
    label: 'My unsaved tenancy name',
    ends_on: '2026-12-31',
    revision: 0,
  });
});

it('reloads a conflicted tenancy and saves only with the newly reviewed revision', async () => {
  let current = { ...originalFolder };
  const patches: number[] = [];
  request.mockImplementation(async (url: string, options?: RequestInit) => {
    if (options?.method === 'PATCH') {
      const payload = JSON.parse(options.body as string);
      patches.push(payload.revision);
      return response(payload.revision === current.revision ? 200 : 409, {
        id: 'folder',
      });
    }
    return response(200, {
      items: url.includes('/inspections') ? [] : [{ ...current }],
      canCreate: true,
      hasMore: false,
    });
  });
  await editFolder();
  current = { ...current, label: 'Updated elsewhere', revision: 1 };
  fireEvent.click(screen.getByRole('button', { name: 'Save folder changes' }));
  await screen.findByText(/This folder changed/);
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await waitFor(() =>
    expect(screen.queryByLabelText('Folder name')).not.toBeInTheDocument()
  );
  await screen.findByRole('option', { name: /Updated elsewhere/ });
  expect(patches).toEqual([0]);
  fireEvent.change(screen.getByLabelText('Tenancy folder'), {
    target: { value: 'folder' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Edit tenancy folder' }));
  expect(screen.getByLabelText('Folder name')).toHaveValue('Updated elsewhere');
  fireEvent.click(screen.getByRole('button', { name: 'Save folder changes' }));
  await waitFor(() => expect(patches).toEqual([0, 1]));
});

it('requires a fresh visit after conflict, then submits the changed time once', async () => {
  let current = { ...originalVisit };
  const posts: Array<{ start: string }> = [];
  request.mockImplementation(async (_url: string, options?: RequestInit) => {
    if (options?.method === 'POST') {
      const payload = JSON.parse(options.body as string);
      posts.push(payload);
      if (payload.start !== current.time) return response(409);
      current = { ...current, clientResponse: 'confirmed' };
      return response(200);
    }
    return response(200, { appointments: [{ ...current }] });
  });
  render(<VisitResponses />);
  const confirm = await screen.findByRole('button', { name: 'Confirm visit' });
  current = { ...current, time: '11:00:00', endTime: '12:00:00' };
  fireEvent.click(confirm);
  await screen.findByRole('alert');
  expect(screen.getByRole('button', { name: 'Confirm visit' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Refresh visits' }));
  await screen.findByText(/11:00–12:00/);
  expect(posts).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Confirm visit' }));
  await screen.findByText('Visit confirmed');
  expect(posts.map((p) => p.start)).toEqual(['09:00:00', '11:00:00']);
});

it('removes stale response actions while refreshing and after a failed reload', async () => {
  let finishRefresh!: (value: ReturnType<typeof response>) => void;
  request
    .mockResolvedValueOnce(response(200, { appointments: [originalVisit] }))
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishRefresh = resolve;
        })
    )
    .mockResolvedValueOnce(response(200, { appointments: [] }));
  render(<VisitResponses />);
  await screen.findByRole('button', { name: 'Confirm visit' });
  fireEvent.click(screen.getByRole('button', { name: 'Refresh visits' }));
  await screen.findByText('Loading visits…');
  expect(
    screen.queryByRole('button', { name: 'Confirm visit' })
  ).not.toBeInTheDocument();
  await act(async () => finishRefresh(response(503)));
  await screen.findByRole('alert');
  expect(
    screen.queryByRole('button', { name: 'Confirm visit' })
  ).not.toBeInTheDocument();
  expect(
    screen.queryByText('Your next visit will appear here')
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Refresh visits' }));
  await screen.findByText('Your next visit will appear here');
});

it('ignores a late response from an aborted visit read', async () => {
  let finishOld!: (value: ReturnType<typeof response>) => void;
  request
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishOld = resolve;
        })
    )
    .mockResolvedValue(
      response(200, {
        appointments: [{ ...originalVisit, title: 'Current visit' }],
      })
    );
  render(
    <React.StrictMode>
      <VisitResponses />
    </React.StrictMode>
  );
  await screen.findByText('Current visit');
  await act(async () =>
    finishOld(response(200, { appointments: [originalVisit] }))
  );
  expect(screen.getByText('Current visit')).toBeInTheDocument();
  expect(screen.queryByText('Original visit')).not.toBeInTheDocument();
});
