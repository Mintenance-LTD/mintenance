import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PropertyInvitations } from '../components/PropertyInvitations';
const mockGet = jest.fn();
const mockPost = jest.fn();
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'invitee' } }),
}));
jest.mock('../../../utils/mobileApiClient', () => ({
  mobileApiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));
const clients: QueryClient[] = [];
const invitation = {
  id: 'invite',
  propertyId: 'property',
  propertyName: 'Synthetic home',
  role: 'manager',
};
function show() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  clients.push(client);
  const invalidate = jest.spyOn(client, 'invalidateQueries');
  const view = render(
    <QueryClientProvider client={client}>
      <PropertyInvitations />
    </QueryClientProvider>
  );
  return { view, invalidate };
}
beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue({ invites: [invitation] });
});
afterEach(() => clients.splice(0).forEach((client) => client.clear()));
it('keeps an invitation and offers recovery for an unconfirmed acceptance', async () => {
  mockPost.mockResolvedValue({
    success: true,
    status: 'accepted',
    propertyId: 'wrong-property',
  });
  const { view, invalidate } = show();
  await waitFor(() =>
    expect(
      view.getByLabelText('Accept invitation to Synthetic home')
    ).toBeTruthy()
  );
  await act(async () =>
    fireEvent.press(view.getByLabelText('Accept invitation to Synthetic home'))
  );
  expect(view.getByText('Refresh invitations')).toBeTruthy();
  expect(invalidate).not.toHaveBeenCalled();
  expect(
    view.getByLabelText('Accept invitation to Synthetic home')
  ).toBeTruthy();
});
it('refreshes the invited user property list after confirmed acceptance', async () => {
  mockPost.mockResolvedValue({
    success: true,
    status: 'accepted',
    propertyId: 'property',
  });
  const { view, invalidate } = show();
  await waitFor(() =>
    expect(
      view.getByLabelText('Accept invitation to Synthetic home')
    ).toBeTruthy()
  );
  mockGet.mockResolvedValue({ invites: [] });
  await act(async () =>
    fireEvent.press(view.getByLabelText('Accept invitation to Synthetic home'))
  );
  expect(mockPost).toHaveBeenCalledWith('/api/properties/invites', {
    inviteId: 'invite',
    action: 'accept',
  });
  expect(invalidate).toHaveBeenCalledWith({
    queryKey: ['properties', 'invitee'],
  });
  await waitFor(() =>
    expect(
      view.queryByLabelText('Accept invitation to Synthetic home')
    ).toBeNull()
  );
});
