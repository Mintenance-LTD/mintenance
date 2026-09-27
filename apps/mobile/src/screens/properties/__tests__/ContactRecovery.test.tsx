import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TenantContacts } from '../components/TenantContacts';
import { TeamAccess } from '../components/TeamAccess';
const mockStorage = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockStorage.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockStorage.delete(key);
  }),
}));
const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPatch = jest.fn();
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'actor' } }),
}));
jest.mock('../../../utils/mobileApiClient', () => ({
  mobileApiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
const clients: QueryClient[] = [];
function show(node: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  clients.push(client);
  return render(
    <QueryClientProvider client={client}>{node}</QueryClientProvider>
  );
}
beforeEach(() => {
  jest.clearAllMocks();
  mockStorage.clear();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
it('shows the server retry guidance without resending or creating a contact', async () => {
  mockGet.mockResolvedValue({
    tenants: [
      { id: 'contact', name: 'Synthetic', email: 'contact@example.invalid' },
    ],
  });
  mockPatch.mockRejectedValue(new Error('Wait 15 minutes before retrying.'));
  const view = show(<TenantContacts propertyId='property' />);
  await waitFor(() => expect(view.getByText('Send invitation')).toBeTruthy());
  await act(async () => fireEvent.press(view.getByText('Send invitation')));
  await waitFor(() =>
    expect(Alert.alert).toHaveBeenCalledWith(
      'Invitation delivery unconfirmed',
      'Wait 15 minutes before retrying.'
    )
  );
  expect(mockPatch).toHaveBeenCalledTimes(1);
  expect(mockPost).not.toHaveBeenCalled();
});
afterEach(() => {
  clients.splice(0).forEach((client) => client.clear());
  jest.restoreAllMocks();
});
it.each([
  { Component: TenantContacts, key: 'tenants' },
  { Component: TeamAccess, key: 'members' },
])('offers retry for failed $key loads', async ({ Component, key }) => {
  mockGet
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue({ [key]: [] });
  const view = show(<Component propertyId='property' />);
  await waitFor(() => expect(view.getByText(`Retry ${key}`)).toBeTruthy());
  await act(async () => fireEvent.press(view.getByText(`Retry ${key}`)));
  await waitFor(() => expect(view.queryByText(`Retry ${key}`)).toBeNull());
});
it('preserves typed tenant details when the server cannot confirm a saved record', async () => {
  mockGet.mockResolvedValue({ tenants: [] });
  mockPost.mockResolvedValue({ tenant: null });
  const view = show(<TenantContacts propertyId='property' />);
  await waitFor(() => expect(view.getByLabelText('Add tenant')).toBeTruthy());
  fireEvent.press(view.getByLabelText('Add tenant'));
  fireEvent.changeText(
    view.getByPlaceholderText('Full name *'),
    'Synthetic tenant'
  );
  await act(async () => fireEvent.press(view.getByText('Add Tenant')));
  await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
  expect(view.getByPlaceholderText('Full name *').props.value).toBe(
    'Synthetic tenant'
  );
});

it('keeps tenant input after a connection failure, suppresses double taps, and permits an explicit retry', async () => {
  mockGet.mockResolvedValue({ tenants: [] });
  let rejectSave!: (error: Error) => void;
  mockPost.mockImplementationOnce(
    () =>
      new Promise((_resolve, reject) => {
        rejectSave = reject;
      })
  );
  const view = show(<TenantContacts propertyId='property' />);
  await waitFor(() => expect(view.getByLabelText('Add tenant')).toBeTruthy());
  fireEvent.press(view.getByLabelText('Add tenant'));
  fireEvent.changeText(
    view.getByPlaceholderText('Full name *'),
    'Synthetic interrupted tenant'
  );
  await act(async () => {
    fireEvent.press(view.getByText('Add Tenant'));
    fireEvent.press(view.getByText('Add Tenant'));
  });
  expect(mockPost).toHaveBeenCalledTimes(1);
  await act(async () => rejectSave(new Error('Network request failed')));
  await waitFor(() =>
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Network request failed')
  );
  expect(view.getByPlaceholderText('Full name *').props.value).toBe(
    'Synthetic interrupted tenant'
  );
  const originalPayload = mockPost.mock.calls[0][1];
  mockPost.mockResolvedValueOnce({ tenant: { id: 'confirmed' } });
  await waitFor(() => expect(view.getByText('Add Tenant')).toBeTruthy());
  await act(async () => fireEvent.press(view.getByText('Add Tenant')));
  await waitFor(() =>
    expect(view.queryByPlaceholderText('Full name *')).toBeNull()
  );
  expect(mockPost).toHaveBeenCalledTimes(2);
  expect(mockPost.mock.calls[1][1]).toEqual(originalPayload);
});

it('recovers a submitted contact after remount and reuses its operation identity', async () => {
  mockGet.mockResolvedValue({ tenants: [] });
  mockPost.mockRejectedValueOnce(new Error('Response lost'));
  const first = show(<TenantContacts propertyId='property' />);
  await waitFor(() => expect(first.getByLabelText('Add tenant')).toBeTruthy());
  fireEvent.press(first.getByLabelText('Add tenant'));
  fireEvent.changeText(
    first.getByPlaceholderText('Full name *'),
    'Recovery tenant'
  );
  await act(async () => fireEvent.press(first.getByText('Add Tenant')));
  await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
  const payload = mockPost.mock.calls[0][1];
  expect(payload.operationId).toMatch(/^[a-f0-9-]{36}$/);
  first.unmount();
  const second = show(<TenantContacts propertyId='property' />);
  await waitFor(() =>
    expect(second.getByPlaceholderText('Full name *').props.value).toBe(
      'Recovery tenant'
    )
  );
  mockPost.mockResolvedValueOnce({ tenant: { id: 'saved' } });
  await act(async () => fireEvent.press(second.getByText('Add Tenant')));
  await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(2));
  expect(mockPost.mock.calls[1][1]).toEqual(payload);
  await waitFor(() => expect(mockStorage.size).toBe(0));
});

it('does not send a save when encrypted persistence fails', async () => {
  mockGet.mockResolvedValue({ tenants: [] });
  const store = jest.requireMock('expo-secure-store');
  store.setItemAsync.mockRejectedValueOnce(
    new Error('Secure storage unavailable')
  );
  const view = show(<TenantContacts propertyId='property' />);
  await waitFor(() => expect(view.getByLabelText('Add tenant')).toBeTruthy());
  fireEvent.press(view.getByLabelText('Add tenant'));
  fireEvent.changeText(
    view.getByPlaceholderText('Full name *'),
    'Unsaved tenant'
  );
  await act(async () => fireEvent.press(view.getByText('Add Tenant')));
  await waitFor(() =>
    expect(Alert.alert).toHaveBeenCalledWith(
      'Error',
      'Secure storage unavailable'
    )
  );
  expect(mockPost).not.toHaveBeenCalled();
  expect(view.getByPlaceholderText('Full name *').props.value).toBe(
    'Unsaved tenant'
  );
});
it('does not recover another property contact', async () => {
  mockGet.mockResolvedValue({ tenants: [] });
  mockStorage.set(
    'pending-tenant.actor.other',
    JSON.stringify({
      operationId: '12345678-1234-4234-a234-123456789abc',
      name: 'Private',
      email: '',
      phone: '',
    })
  );
  const view = show(<TenantContacts propertyId='property' />);
  await waitFor(() => expect(view.getByLabelText('Add tenant')).toBeTruthy());
  fireEvent.press(view.getByLabelText('Add tenant'));
  expect(view.getByPlaceholderText('Full name *').props.value).toBe('');
  expect(mockPost).not.toHaveBeenCalled();
});

it('discards a pending local draft only after explicit confirmation', async () => {
  mockGet.mockResolvedValue({ tenants: [] });
  mockStorage.set(
    'pending-tenant.actor.property',
    JSON.stringify({
      operationId: '12345678-1234-4234-a234-123456789abc',
      name: 'Pending',
      email: '',
      phone: '',
    })
  );
  const view = show(<TenantContacts propertyId='property' />);
  await waitFor(() => expect(view.getByText('Discard draft')).toBeTruthy());
  fireEvent.press(view.getByText('Discard draft'));
  expect(mockStorage.size).toBe(1);
  const buttons = (Alert.alert as jest.Mock).mock.calls.at(-1)[2];
  await act(async () => buttons[1].onPress());
  await waitFor(() => expect(mockStorage.size).toBe(0));
  expect(mockPost).not.toHaveBeenCalled();
});
