import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import {
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { RecurringMaintenance } from '../components/RecurringMaintenance';

const mockApi = {
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
};
const mockAccount: { user: { id: string } | null } = { user: { id: 'owner' } };
jest.mock('../../../utils/mobileApiClient', () => ({
  mobileApiClient: {
    get: (...args: unknown[]) => mockApi.get(...args),
    post: (...args: unknown[]) => mockApi.post(...args),
    patch: (...args: unknown[]) => mockApi.patch(...args),
    delete: (...args: unknown[]) => mockApi.delete(...args),
  },
}));
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => mockAccount,
}));
jest.mock('../../../utils/scheduleRequestKey', () => ({
  scheduleRequest: async () => ({ key: 'request', complete: async () => {} }),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
const row = {
  id: 'schedule',
  property_id: 'property',
  title: 'Boiler service',
  category: 'heating',
  frequency: 'annual',
  next_due_date: '2030-01-01',
  is_active: true,
  updated_at: '2026-11-01T12:00:00Z',
};
const clients: QueryClient[] = [];
const failure = (statusCode: number) =>
  Object.assign(new Error('Save failed'), { statusCode });
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
function setup(onAccessDenied?: () => void) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: 1, retryDelay: 0 },
    },
  });
  clients.push(client);
  const node = (id = 'property', editable = true) => (
    <QueryClientProvider client={client}>
      <RecurringMaintenance
        propertyId={id}
        editable={editable}
        onAccessDenied={onAccessDenied}
      />
    </QueryClientProvider>
  );
  return { ...render(node()), node };
}
beforeEach(() => {
  Object.values(mockApi).forEach((fn) => fn.mockReset());
  mockAccount.user = { id: 'owner' };
  mockApi.get.mockResolvedValue({ schedules: [row] });
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => {
  onlineManager.setOnline(true);
  clients.splice(0).forEach((c) => c.clear());
  jest.restoreAllMocks();
});

it('preserves a stale draft through failed reload and saves only after explicit latest review', async () => {
  mockApi.patch.mockRejectedValueOnce(failure(409));
  const view = setup();
  fireEvent.press(await view.findByLabelText('Edit Boiler service'));
  fireEvent.changeText(view.getByLabelText('Schedule title'), 'My draft');
  fireEvent.press(view.getByText('Save Changes'));
  await view.findByText(/Your draft is retained/);
  expect(view.getByText('Save Changes')).toBeDisabled();
  expect(view.getByLabelText('Pause Boiler service')).toBeDisabled();
  mockApi.get.mockRejectedValueOnce(new Error('offline'));
  fireEvent.press(view.getByLabelText('Refresh schedules'));
  await view.findByLabelText('Retry loading schedules');
  const latest = {
    ...row,
    title: 'Current service',
    updated_at: '2026-11-02T12:00:00Z',
  };
  mockApi.get.mockResolvedValue({ schedules: [latest] });
  fireEvent.press(view.getByLabelText('Retry loading schedules'));
  await view.findByText('Current service');
  expect(view.getByLabelText('Schedule title').props.value).toBe('My draft');
  expect(view.getByText('Save Changes')).toBeDisabled();
  await waitFor(() =>
    expect(
      view.getByLabelText('Discard draft and edit latest Current service')
    ).not.toBeDisabled()
  );
  fireEvent.press(
    view.getByLabelText('Discard draft and edit latest Current service')
  );
  mockApi.patch.mockResolvedValueOnce({
    schedule: { ...latest, updated_at: '2026-11-03T12:00:00Z' },
  });
  fireEvent.press(view.getByText('Save Changes'));
  await waitFor(() => expect(mockApi.patch).toHaveBeenCalledTimes(2));
  await waitFor(() =>
    expect(view.queryByLabelText('Schedule title')).toBeNull()
  );
  expect(mockApi.patch.mock.calls[1][1].expected_updated_at).toBe(
    latest.updated_at
  );
});

it('uses one lock for pause, save and removal and checks the returned revision', async () => {
  const pending = deferred<unknown>();
  mockApi.patch.mockReturnValueOnce(pending.promise);
  const view = setup();
  fireEvent.press(await view.findByLabelText('Edit Boiler service'));
  fireEvent.press(view.getByLabelText('Pause Boiler service'));
  fireEvent.press(view.getByLabelText('Pause Boiler service'));
  fireEvent.press(view.getByText('Save Changes'));
  fireEvent.press(view.getByLabelText('Remove Boiler service'));
  await waitFor(() => expect(mockApi.patch).toHaveBeenCalledTimes(1));
  expect(view.getByLabelText('Schedule title').props.editable).toBe(false);
  expect(view.getByLabelText('Refresh schedules')).toBeDisabled();
  expect(mockApi.delete).not.toHaveBeenCalled();
  expect(mockApi.patch.mock.calls[0][1]).toMatchObject({
    expected_updated_at: row.updated_at,
    is_active: false,
  });
  await act(async () =>
    pending.resolve({ schedule: { ...row, is_active: false } })
  );
  await view.findByText(/Refresh schedules before another action/);
  expect(view.getByLabelText('Pause Boiler service')).toBeDisabled();
});

it('does not run a delayed delete confirmation after management permission changes', async () => {
  const view = setup();
  fireEvent.press(await view.findByLabelText('Remove Boiler service'));
  const buttons = (Alert.alert as jest.Mock).mock.calls.find(
    (call) => call[0] === 'Delete Schedule'
  )[2];
  view.rerender(view.node('property', false));
  await act(async () =>
    buttons.find((b: { text: string }) => b.text === 'Delete').onPress()
  );
  expect(mockApi.delete).not.toHaveBeenCalled();
  expect(view.queryByLabelText('Remove Boiler service')).toBeNull();
});

it('ignores old-account save results and does not clear the next account draft', async () => {
  const pending = deferred<unknown>();
  mockApi.patch.mockReturnValueOnce(pending.promise);
  const view = setup();
  fireEvent.press(await view.findByLabelText('Edit Boiler service'));
  fireEvent.press(view.getByText('Save Changes'));
  await waitFor(() => expect(mockApi.patch).toHaveBeenCalledTimes(1));
  mockAccount.user = { id: 'another' };
  view.rerender(view.node());
  fireEvent.press(await view.findByLabelText('Edit Boiler service'));
  fireEvent.changeText(
    view.getByLabelText('Schedule title'),
    'Next account draft'
  );
  await act(async () =>
    pending.resolve({
      schedule: { ...row, updated_at: '2026-11-03T12:00:00Z' },
    })
  );
  expect(view.getByLabelText('Schedule title').props.value).toBe(
    'Next account draft'
  );
  expect(Alert.alert).not.toHaveBeenCalled();
});

it('notifies the property page of revoked access and does not restore editing from a read-only reload', async () => {
  mockApi.patch.mockRejectedValueOnce(failure(403));
  const onAccessDenied = jest.fn();
  const view = setup(onAccessDenied);
  fireEvent.press(await view.findByLabelText('Pause Boiler service'));
  await view.findByText(/Access unavailable/);
  expect(onAccessDenied).toHaveBeenCalledTimes(1);
  expect(view.queryByLabelText('Pause Boiler service')).toBeNull();
  expect(view.getByLabelText('Add recurring schedule')).toBeDisabled();
  await waitFor(() =>
    expect(view.getByLabelText('Refresh schedules')).not.toBeDisabled()
  );
  const reload = deferred<unknown>();
  mockApi.get.mockClear().mockReturnValueOnce(reload.promise);
  fireEvent.press(view.getByLabelText('Refresh schedules'));
  await waitFor(() => expect(mockApi.get).toHaveBeenCalledTimes(1));
  await act(async () => reload.resolve({ schedules: [row] }));
  await waitFor(() =>
    expect(view.getByLabelText('Refresh schedules')).not.toBeDisabled()
  );
  expect(view.queryByLabelText('Pause Boiler service')).toBeNull();
  expect(view.getByLabelText('Add recurring schedule')).toBeDisabled();
});

it('aborts favourite-contractor loading when the property changes and ignores the old result', async () => {
  const pending = deferred<unknown>();
  const view = setup();
  fireEvent.press(await view.findByLabelText('Edit Boiler service'));
  fireEvent.press(view.getByText('Notify my chosen favourite only'));
  mockApi.get.mockImplementation((url) =>
    url.endsWith('recurring-contractors')
      ? pending.promise
      : Promise.resolve({ schedules: [] })
  );
  fireEvent.press(view.getByText('Load previously hired contractors'));
  const options = mockApi.get.mock.calls.find((call) =>
    call[0].endsWith('recurring-contractors')
  )[1];
  view.rerender(view.node('another'));
  await view.findByText('No recurring schedules yet');
  expect(options.signal.aborted).toBe(true);
  await act(async () =>
    pending.resolve({ contractors: [{ id: 'old', name: 'Old contractor' }] })
  );
  expect(view.queryByText('Old contractor')).toBeNull();
  expect(Alert.alert).not.toHaveBeenCalled();
});

it('keeps validation failures editable and does not send again while the first edit is pending', async () => {
  mockApi.patch.mockRejectedValueOnce(failure(400));
  const view = setup();
  fireEvent.press(await view.findByLabelText('Edit Boiler service'));
  fireEvent.changeText(view.getByLabelText('Schedule title'), 'My valid draft');
  fireEvent.press(view.getByText('Save Changes'));
  fireEvent.press(view.getByText(/Saving|Save Changes/));
  await waitFor(() =>
    expect(view.getByText('Save Changes')).not.toBeDisabled()
  );
  expect(mockApi.patch).toHaveBeenCalledTimes(1);
  expect(view.getByLabelText('Schedule title').props.value).toBe(
    'My valid draft'
  );
});

it('hides cached schedules when signed out', async () => {
  const view = setup();
  await view.findByText('Boiler service');
  mockAccount.user = null;
  view.rerender(view.node());
  expect(view.getByText('Sign in to view recurring schedules.')).toBeTruthy();
  expect(view.queryByText('Boiler service')).toBeNull();
});

it('surfaces an offline edit without pausing it for reconnect or inheriting automatic retries', async () => {
  const view = setup();
  fireEvent.press(await view.findByLabelText('Edit Boiler service'));
  onlineManager.setOnline(false);
  mockApi.patch.mockRejectedValue(new Error('Offline'));
  fireEvent.press(view.getByText('Save Changes'));
  await view.findByText(/Your draft is retained/);
  expect(view.getByText('Save Changes')).toBeDisabled();
  expect(mockApi.patch).toHaveBeenCalledTimes(1);
  await act(async () => onlineManager.setOnline(true));
  expect(mockApi.patch).toHaveBeenCalledTimes(1);
});

it('uses the refreshed revision after a confirmed pause and closes a confirmed removed editor', async () => {
  const paused = {
    ...row,
    is_active: false,
    updated_at: '2026-11-03T12:00:00Z',
  };
  mockApi.patch.mockImplementationOnce(async () => {
    mockApi.get.mockResolvedValue({ schedules: [paused] });
    return { schedule: paused };
  });
  const view = setup();
  fireEvent.press(await view.findByLabelText('Pause Boiler service'));
  await view.findByLabelText('Resume Boiler service');
  await waitFor(() =>
    expect(view.getByLabelText('Edit Boiler service')).not.toBeDisabled()
  );
  fireEvent.press(view.getByLabelText('Edit Boiler service'));
  expect(view.getByText('Paused · recorded due date 1 Jan 2030')).toBeTruthy();
  mockApi.delete.mockImplementationOnce(async () => {
    mockApi.get.mockResolvedValue({ schedules: [] });
    return { success: true, scheduleId: row.id };
  });
  fireEvent.press(view.getByLabelText('Remove Boiler service'));
  const buttons = (Alert.alert as jest.Mock).mock.calls.find(
    (call) => call[0] === 'Delete Schedule'
  )[2];
  await act(async () => {
    buttons.find((b: { text: string }) => b.text === 'Delete').onPress();
    buttons.find((b: { text: string }) => b.text === 'Delete').onPress();
  });
  await view.findByText('No recurring schedules yet');
  expect(mockApi.delete).toHaveBeenCalledTimes(1);
  expect(view.queryByLabelText('Schedule title')).toBeNull();
});
