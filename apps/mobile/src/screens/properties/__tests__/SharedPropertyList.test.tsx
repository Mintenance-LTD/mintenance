import React from 'react';
import { FlatList } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PropertiesScreen } from '../PropertiesScreen';
const mockGet = jest.fn();
const mockUser = { id: 'first-member' };
const clients: QueryClient[] = [];
afterEach(() => clients.splice(0).forEach((client) => client.clear()));
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));
jest.mock('../../../utils/mobileApiClient', () => ({
  mobileApiClient: { get: (...args: unknown[]) => mockGet(...args) },
}));
jest.mock('../../../components/shared', () => ({
  LoadingSpinner: () => null,
  ErrorView: () => null,
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
it('requests shared properties and never carries another account list into a pending request', async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  clients.push(client);
  let finishSecond!: (value: { properties: never[] }) => void;
  mockGet.mockImplementation((url: string) => {
    if (url.endsWith('/favorites')) return Promise.resolve({ favorites: [] });
    if (mockUser.id === 'first-member')
      return Promise.resolve({
        properties: [
          {
            id: 'shared',
            property_name: 'Shared test home',
            address: 'Synthetic address',
            _role: 'viewer',
          },
        ],
      });
    return new Promise((resolve) => {
      finishSecond = resolve;
    });
  });
  const navigation = {} as React.ComponentProps<
    typeof PropertiesScreen
  >['navigation'];
  const content = () => (
    <QueryClientProvider client={client}>
      <PropertiesScreen navigation={navigation} />
    </QueryClientProvider>
  );
  const view = render(content());
  await waitFor(() =>
    expect(view.UNSAFE_getByType(FlatList).props.data).toEqual([
      expect.objectContaining({ id: 'shared' }),
    ])
  );
  expect(mockGet).toHaveBeenCalledWith('/api/properties?includeShared=view');
  mockUser.id = 'second-member';
  view.rerender(content());
  expect(view.UNSAFE_queryByType(FlatList)).toBeNull();
  await act(async () => finishSecond({ properties: [] }));
  view.unmount();
  client.clear();
});
