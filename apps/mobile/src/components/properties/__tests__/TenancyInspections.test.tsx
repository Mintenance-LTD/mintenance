import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { TrackedQueryClient as QueryClient } from '../../../__tests__/setup/TrackedQueryClient';
import { TenancyInspections } from '../../../screens/properties/components/TenancyInspections';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import { randomUUID } from 'expo-crypto';
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(),
}));
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'member', role: 'homeowner' } }),
}));
jest.mock('../../../utils/mobileApiClient', () => ({
  mobileApiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));
const folder = {
  id: 'folder',
  revision: 0,
  label: 'Tenancy 2026',
  starts_on: '2026-01-01',
  ends_on: null,
};
function show() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <TenancyInspections propertyId='property' />
    </QueryClientProvider>
  );
}
beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(randomUUID)
    .mockReturnValue('00000000-0000-4000-8000-000000000017');
  jest
    .mocked(mobileApiClient.get)
    .mockImplementation(async (url) =>
      url.includes('/inspections?')
        ? { items: [], canCreate: true, hasMore: false }
        : url.includes('room-photos')
          ? { photos: [] }
          : { items: [folder], canCreate: true, hasMore: false }
    );
  jest.mocked(mobileApiClient.post).mockResolvedValue({ id: 'new' });
});
it('preserves read-only permission', async () => {
  jest
    .mocked(mobileApiClient.get)
    .mockResolvedValue({ items: [folder], canCreate: false, hasMore: false });
  const ui = show();
  await ui.findByText(/Read-only/);
  expect(ui.queryByText('New tenancy folder')).toBeNull();
});
it('shows load failure without an empty success', async () => {
  jest.mocked(mobileApiClient.get).mockRejectedValue(new Error('offline'));
  const ui = show();
  await ui.findByText('Inspection records unavailable.');
  expect(ui.queryByText('No tenancy folders yet.')).toBeNull();
});
it('validates dates before sending a mutation', async () => {
  const ui = show();
  fireEvent.press(await ui.findByText('New tenancy folder'));
  fireEvent.changeText(ui.getByLabelText('Folder name'), 'Tenancy');
  fireEvent.changeText(
    ui.getByLabelText('Tenancy starts (YYYY-MM-DD)'),
    '2026-02-30'
  );
  fireEvent.press(ui.getByText('Create folder'));
  await ui.findByText(/Enter a name and valid dates/);
  expect(mobileApiClient.post).not.toHaveBeenCalled();
});
it('creates folders through the authenticated API', async () => {
  const ui = show();
  fireEvent.press(await ui.findByText('New tenancy folder'));
  fireEvent.changeText(ui.getByLabelText('Folder name'), 'Tenancy');
  fireEvent.changeText(
    ui.getByLabelText('Tenancy starts (YYYY-MM-DD)'),
    '2026-11-01'
  );
  fireEvent.press(ui.getByText('Create folder'));
  await waitFor(() =>
    expect(mobileApiClient.post).toHaveBeenCalledWith(
      '/api/properties/property/tenancies',
      { label: 'Tenancy', starts_on: '2026-11-01', ends_on: null }
    )
  );
});
it('creates a written report inside the chosen folder', async () => {
  const ui = show();
  await ui.findByText('New tenancy folder');
  fireEvent.press(ui.getByLabelText('Tenancy folder: Choose a tenancy'));
  fireEvent.press(ui.getByText(/Tenancy 2026 · 2026-01-01/));
  await ui.findByText('Create an inspection for this tenancy');
  fireEvent.press(ui.getByLabelText('Check-in inspection'));
  fireEvent.changeText(ui.getByLabelText('Report title'), 'Move-in');
  fireEvent.changeText(
    ui.getByLabelText('Inspection date (YYYY-MM-DD)'),
    '2026-10-30'
  );
  await waitFor(() =>
    expect(mobileApiClient.get).toHaveBeenCalledWith(
      '/api/properties/property/room-photos'
    )
  );
  fireEvent.changeText(ui.getByLabelText('Observations'), 'Clean kitchen');
  fireEvent.press(ui.getByText('Save shared report'));
  await waitFor(() =>
    expect(mobileApiClient.post).toHaveBeenCalledWith(
      '/api/properties/property/inspections',
      {
        folder_id: 'folder',
        title: 'Move-in',
        inspected_on: '2026-10-30',
        kind: 'check_in',
        notes: 'Clean kitchen',
        photo_ids: [],
        request_id: '00000000-0000-4000-8000-000000000017',
      }
    )
  );
});
it('retains failed form input for retry', async () => {
  jest.mocked(mobileApiClient.post).mockRejectedValue(new Error('offline'));
  const ui = show();
  fireEvent.press(await ui.findByText('New tenancy folder'));
  fireEvent.changeText(ui.getByLabelText('Folder name'), 'Retain me');
  fireEvent.changeText(
    ui.getByLabelText('Tenancy starts (YYYY-MM-DD)'),
    '2026-11-01'
  );
  fireEvent.press(ui.getByText('Create folder'));
  await ui.findByText(/Unable to save/);
  expect(ui.getByLabelText('Folder name').props.value).toBe('Retain me');
});
it('reuses the same report save request when the first response is lost', async () => {
  jest
    .mocked(mobileApiClient.post)
    .mockRejectedValueOnce(new Error('Lost response'));
  const ui = show();
  fireEvent.press(await ui.findByLabelText('Tenancy folder: Choose a tenancy'));
  fireEvent.press(ui.getByText(/Tenancy 2026 · 2026-01-01/));
  await ui.findByText('Create an inspection for this tenancy');
  fireEvent.press(ui.getByLabelText('Check-in inspection'));
  fireEvent.changeText(ui.getByLabelText('Report title'), 'Retry fixture');
  fireEvent.changeText(
    ui.getByLabelText('Inspection date (YYYY-MM-DD)'),
    '2026-11-24'
  );
  fireEvent.changeText(ui.getByLabelText('Observations'), 'Kitchen checked');
  fireEvent.press(ui.getByText('Save shared report'));
  await ui.findByText(/Unable to save/);
  jest
    .mocked(randomUUID)
    .mockReturnValue('00000000-0000-4000-8000-000000000018');
  fireEvent.press(ui.getByText('Save shared report'));
  await waitFor(() => expect(ui.queryByText('Save shared report')).toBeNull());
  const attempts = jest.mocked(mobileApiClient.post).mock.calls;
  expect(attempts).toHaveLength(2);
  expect(attempts[1]).toEqual(attempts[0]);
});

it('requires evidence review before recording a clean check-out', async () => {
  const ui = show();
  await ui.findByText('New tenancy folder');
  fireEvent.press(ui.getByLabelText('Tenancy folder: Choose a tenancy'));
  fireEvent.press(ui.getByText(/Tenancy 2026 · 2026-01-01/));
  await ui.findByText('Create an inspection for this tenancy');
  fireEvent.press(ui.getByLabelText('Check-out inspection'));
  fireEvent.changeText(ui.getByLabelText('Report title'), 'Clean check-out');
  fireEvent.changeText(
    ui.getByLabelText('Inspection date (YYYY-MM-DD)'),
    '2026-11-24'
  );
  expect(
    ui.getByText(
      'This report has no observations or photos. Saved reports cannot be edited.'
    )
  ).toBeTruthy();
  fireEvent.press(ui.getByText('Save shared report'));
  expect(mobileApiClient.post).not.toHaveBeenCalled();
  fireEvent.press(ui.getByLabelText('No issues found'));
  fireEvent.press(ui.getByText('Save shared report'));
  await waitFor(() =>
    expect(mobileApiClient.post).toHaveBeenCalledWith(
      '/api/properties/property/inspections',
      expect.objectContaining({ kind: 'check_out', outcome: 'no_issues_found' })
    )
  );
});

it('edits the selected tenancy with optimistic revision', async () => {
  jest.mocked(mobileApiClient.patch).mockResolvedValue({ id: 'folder' });
  const ui = show();
  await ui.findByText('New tenancy folder');
  fireEvent.press(ui.getByLabelText('Tenancy folder: Choose a tenancy'));
  fireEvent.press(ui.getByText(/Tenancy 2026 · 2026-01-01/));
  fireEvent.press(ui.getByText('Edit tenancy folder'));
  fireEvent.changeText(
    ui.getByLabelText('Tenancy ends (optional, YYYY-MM-DD)'),
    '2026-10-30'
  );
  fireEvent.press(ui.getByText('Save folder changes'));
  await waitFor(() =>
    expect(mobileApiClient.patch).toHaveBeenCalledWith(
      '/api/properties/property/tenancies',
      {
        label: 'Tenancy 2026',
        starts_on: '2026-01-01',
        ends_on: '2026-10-30',
        id: 'folder',
        revision: 0,
      }
    )
  );
});

it('keeps inspection shortcuts disabled until a tenancy is selected and preserves a draft when changing kind', async () => {
  const ui = show();
  await ui.findByText('New tenancy folder');
  fireEvent.press(ui.getByLabelText('Check-out inspection'));
  expect(ui.queryByLabelText('Report title')).toBeNull();
  fireEvent.press(ui.getByLabelText('Tenancy folder: Choose a tenancy'));
  fireEvent.press(ui.getByText(/Tenancy 2026 · 2026-01-01/));
  await ui.findByText('Create an inspection for this tenancy');
  fireEvent.press(ui.getByLabelText('Check-in inspection'));
  fireEvent.changeText(ui.getByLabelText('Report title'), 'Keep my draft');
  fireEvent.changeText(
    ui.getByLabelText('Inspection date (YYYY-MM-DD)'),
    '2026-11-12'
  );
  fireEvent.press(ui.getByLabelText('Inspection type: Check-in'));
  fireEvent.press(ui.getAllByText('Check-out').slice(-1)[0]);
  expect(ui.getByLabelText('Report title').props.value).toBe('Keep my draft');
  fireEvent.changeText(ui.getByLabelText('Observations'), 'Clean kitchen');
  fireEvent.press(ui.getByText('Save shared report'));
  await waitFor(() =>
    expect(mobileApiClient.post).toHaveBeenCalledWith(
      '/api/properties/property/inspections',
      expect.objectContaining({
        folder_id: 'folder',
        kind: 'check_out',
        title: 'Keep my draft',
      })
    )
  );
});
it('selects a newly saved folder so inspection shortcuts become available', async () => {
  const ui = show();
  fireEvent.press(await ui.findByText('New tenancy folder'));
  fireEvent.changeText(ui.getByLabelText('Folder name'), 'New tenancy');
  fireEvent.changeText(
    ui.getByLabelText('Tenancy starts (YYYY-MM-DD)'),
    '2026-11-01'
  );
  fireEvent.press(ui.getByText('Create folder'));
  await ui.findByText('Create an inspection for this tenancy');
  expect(mobileApiClient.get).toHaveBeenCalledWith(
    '/api/properties/property/inspections?folder=new&offset=0'
  );
  expect(
    ui.getByLabelText('Check-in inspection').props.accessibilityState.disabled
  ).toBe(false);
});
it('keeps shortcuts disabled for a selected read-only tenancy', async () => {
  jest
    .mocked(mobileApiClient.get)
    .mockImplementation(async (url) =>
      url.includes('/inspections?')
        ? { items: [], canCreate: false, hasMore: false }
        : { items: [folder], canCreate: false, hasMore: false }
    );
  const ui = show();
  fireEvent.press(await ui.findByLabelText('Tenancy folder: Choose a tenancy'));
  fireEvent.press(ui.getByText(/Tenancy 2026 · 2026-01-01/));
  await ui.findByText(/View saved reports below/);
  fireEvent.press(ui.getByLabelText('Check-out inspection'));
  expect(ui.queryByLabelText('Report title')).toBeNull();
});
