import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EditPropertyScreen } from '../EditPropertyScreen';
const mockGet = jest.fn();
const mockPut = jest.fn();
const mockUser = { id: 'owner' };
jest.mock('../../../utils/mobileApiClient', () => ({
  mobileApiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    put: (...args: unknown[]) => mockPut(...args),
  },
}));
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));
jest.mock('../../../hooks/useUnsavedChanges', () => ({
  useUnsavedChanges: () => jest.fn(),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
jest.mock('../../../components/shared', () => {
  const { Text, TouchableOpacity } =
    jest.requireActual<typeof import('react-native')>('react-native');
  return {
    ScreenHeader: () => null,
    LoadingSpinner: () => null,
    ErrorView: ({
      message,
      onRetry,
    }: {
      message: string;
      onRetry: () => void;
    }) => (
      <TouchableOpacity onPress={onRetry}>
        <Text>{message}</Text>
      </TouchableOpacity>
    ),
  };
});
const navigation = { goBack: jest.fn() };
const property = {
  id: 'property',
  _role: 'owner',
  property_name: 'Original home',
  address: 'Synthetic address',
  bedrooms: 2,
};
const clients: QueryClient[] = [];
function screen() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  clients.push(client);
  const content = () => (
    <QueryClientProvider client={client}>
      <EditPropertyScreen
        navigation={navigation as never}
        route={{ params: { propertyId: 'property' } } as never}
      />
    </QueryClientProvider>
  );
  return { ...render(content()), client, content };
}
beforeEach(() => {
  jest.clearAllMocks();
  mockUser.id = 'owner';
  mockGet.mockResolvedValue(property);
});
afterEach(() => clients.splice(0).forEach((client) => client.clear()));
it('does not overwrite unsaved edits when the property query refreshes', async () => {
  const view = screen();
  await waitFor(() =>
    expect(view.getByDisplayValue('Original home')).toBeTruthy()
  );
  fireEvent.changeText(
    view.getByDisplayValue('Original home'),
    'My unsaved name'
  );
  await act(async () =>
    view.client.setQueryData(['property', 'property', 'owner'], {
      ...property,
      property_name: 'Remote name',
    })
  );
  expect(view.getByDisplayValue('My unsaved name')).toBeTruthy();
});
it('blocks a direct edit route for a viewer', async () => {
  mockGet.mockResolvedValue({ ...property, _role: 'viewer' });
  const view = screen();
  await waitFor(() =>
    expect(
      view.getByText('You do not have permission to edit this property.')
    ).toBeTruthy()
  );
  expect(view.queryByText('Save Changes')).toBeNull();
  expect(mockPut).not.toHaveBeenCalled();
});
it('does not retain account-specific edit fields while another account loads', async () => {
  const view = screen();
  await waitFor(() =>
    expect(view.getByDisplayValue('Original home')).toBeTruthy()
  );
  fireEvent.changeText(
    view.getByDisplayValue('Original home'),
    'Private draft'
  );
  mockUser.id = 'second';
  mockGet.mockReturnValue(new Promise(() => {}));
  view.rerender(view.content());
  expect(view.queryByDisplayValue('Private draft')).toBeNull();
});
