import React from 'react';
import { Share } from 'react-native';
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
function show(initialReportId?: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <TenancyInspections
        propertyId='property'
        initialReportId={initialReportId}
      />
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

const originalReport = {
  id: 'source-report',
  folder_id: folder.id,
  title: 'Original check-in',
  inspected_on: '2026-11-25',
  created_at: '2026-11-25T12:00:00Z',
  kind: 'check_in',
  notes: 'Original observations',
};

it('opens an exact report, preserves its source and reuses the request on a linked correction retry', async () => {
  const revised = {
    ...originalReport,
    id: 'corrected-report',
    title: 'Corrected check-in',
    notes: 'Revised observations',
    corrects_report_id: originalReport.id,
  };
  jest.mocked(mobileApiClient.get).mockImplementation(async (url) => {
    if (url.endsWith('/room-photos')) return { photos: [] };
    return {
      folder,
      canCreate: true,
      photos: [],
      report: url.endsWith(revised.id) ? revised : originalReport,
    };
  });
  jest
    .mocked(mobileApiClient.post)
    .mockRejectedValueOnce(new Error('Lost response'))
    .mockResolvedValueOnce({ id: revised.id });
  const ui = show(originalReport.id);
  fireEvent.press(await ui.findByText('Correct this report'));
  expect(ui.getByLabelText('Observations').props.value).toBe(
    originalReport.notes
  );
  fireEvent.changeText(ui.getByLabelText('Report title'), revised.title);
  fireEvent.changeText(ui.getByLabelText('Observations'), revised.notes);
  fireEvent.press(await ui.findByText('Save linked correction'));
  await ui.findByText(/Unable to save/);
  fireEvent.press(ui.getByText('Save linked correction'));
  await ui.findByText('View previous version');
  const attempts = jest.mocked(mobileApiClient.post).mock.calls;
  expect(attempts).toHaveLength(2);
  expect(attempts[1]).toEqual(attempts[0]);
  expect(attempts[0]?.[1]).toMatchObject({
    folder_id: folder.id,
    corrects_report_id: originalReport.id,
    title: revised.title,
    notes: revised.notes,
    kind: originalReport.kind,
  });
  fireEvent.press(ui.getByText('View previous version'));
  await ui.findByText(originalReport.notes);
});

it('withholds the correction action from a report viewer', async () => {
  jest.mocked(mobileApiClient.get).mockResolvedValue({
    folder,
    canCreate: false,
    photos: [],
    report: originalReport,
  });
  const ui = show(originalReport.id);
  await ui.findByText(originalReport.title);
  expect(ui.queryByText('Correct this report')).toBeNull();
});

it('shares the exact report at the configured web origin and leaves PDF export available', async () => {
  const saved = process.env.EXPO_PUBLIC_WEB_URL;
  process.env.EXPO_PUBLIC_WEB_URL = 'https://preview.example.test/some-base-path';
  try {
    jest.mocked(mobileApiClient.get).mockResolvedValue({
      folder,
      canCreate: false,
      photos: [],
      report: originalReport,
    });
    const ui = show(originalReport.id);
    fireEvent.press(await ui.findByText('Share member-only report link'));
    expect(Share.share).toHaveBeenCalledWith({
      message: 'https://preview.example.test/properties/property/inspections/' + originalReport.id,
    });
    expect(ui.getByText('Download PDF')).toBeTruthy();
  } finally {
    if (saved === undefined) delete process.env.EXPO_PUBLIC_WEB_URL;
    else process.env.EXPO_PUBLIC_WEB_URL = saved;
  }
});
