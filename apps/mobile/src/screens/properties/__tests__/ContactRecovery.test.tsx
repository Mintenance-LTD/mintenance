import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TenantContacts } from '../components/TenantContacts';
import { TeamAccess } from '../components/TeamAccess';
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
