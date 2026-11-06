import React from 'react';
import { FlatList } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PropertiesScreen } from '../PropertiesScreen';
// This suite verifies account isolation of the property list; native file
// export is covered separately and is not available in the Jest runtime.
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///test-cache/',
  writeAsStringAsync: jest.fn(),
  StorageAccessFramework: {},
  EncodingType: { UTF8: 'utf8' },
}));
jest.mock('../components/PropertyInvitations', () => ({
  PropertyInvitations: () => null,
}));
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
    if (url.startsWith('/api/portfolio/queue'))
      return Promise.resolve({ items: [], total: 0, hasMore: false });
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

it('searches property names and addresses and clears an empty result', async () => {
  mockUser.id = 'search-member';
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  clients.push(client);
  mockGet.mockImplementation((url: string) =>
    Promise.resolve(
      url.endsWith('/favorites')
        ? { favorites: [] }
        : url.startsWith('/api/portfolio/queue')
          ? { items: [], total: 0, hasMore: false }
          : {
              properties: [
                {
                  id: 'one',
                  property_name: 'Garden House',
                  address: '1 Synthetic Road',
                  city: 'Stafford',
                  postcode: 'ST16 1WU',
                },
                {
                  id: 'two',
                  property_name: 'River Flat',
                  address: '2 Example Road',
                  city: 'Cheltenham',
                  postcode: 'GL51 8NE',
                },
              ],
            }
    )
  );
  const view = render(
    <QueryClientProvider client={client}>
      <PropertiesScreen navigation={{} as never} />
    </QueryClientProvider>
  );
  await view.findByLabelText('Search properties');
  fireEvent.changeText(
    view.getByLabelText('Search properties'),
    '  GARDEN   st16 '
  );
  expect(
    view.UNSAFE_getByType(FlatList).props.data.map((p: { id: string }) => p.id)
  ).toEqual(['one']);
  fireEvent.changeText(view.getByLabelText('Search properties'), 'unknown');
  expect(view.UNSAFE_getByType(FlatList).props.data).toHaveLength(0);
  // FlatList is a host stub in this suite, so mount its empty-state slot explicitly.
  const empty = render(
    view.UNSAFE_getByType(FlatList).props.ListEmptyComponent
  );
  expect(empty.getByText('No matching properties')).toBeTruthy();
  fireEvent.press(empty.getByText('Clear search and filters'));
  expect(view.UNSAFE_getByType(FlatList).props.data).toHaveLength(2);
  empty.unmount();
  view.unmount();
});
