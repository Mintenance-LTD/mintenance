import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TenancyInspections } from '../../../screens/properties/components/TenancyInspections';
import { mobileApiClient } from '../../../utils/mobileApiClient';
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
  fireEvent.press(ui.getByText('Tenancy 2026 · 2026-01-01'));
  fireEvent.press(await ui.findByText('New inspection'));
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
  fireEvent.press(ui.getByText('Save shared report'));
  await waitFor(() =>
    expect(mobileApiClient.post).toHaveBeenCalledWith(
      '/api/properties/property/inspections',
      {
        folder_id: 'folder',
        title: 'Move-in',
        inspected_on: '2026-10-30',
        kind: 'check_in',
        notes: '',
        photo_ids: [],
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

it('edits the selected tenancy with optimistic revision', async () => {
  jest.mocked(mobileApiClient.patch).mockResolvedValue({ id: 'folder' });
  const ui = show();
  await ui.findByText('New tenancy folder');
  fireEvent.press(ui.getByLabelText('Tenancy folder: Choose a tenancy'));
  fireEvent.press(ui.getByText('Tenancy 2026 · 2026-01-01'));
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
