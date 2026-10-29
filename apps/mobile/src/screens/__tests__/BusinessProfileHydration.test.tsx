import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BusinessProfileScreen } from '../contractor/BusinessProfileScreen';
const mockGet = jest.fn();
const mockPatch = jest.fn();
jest.mock('../../utils/mobileApiClient', () => ({
  mobileApiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}));
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'owner' }, refreshUser: jest.fn() }),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
}));
jest.mock('../../hooks/useUnsavedChanges', () => ({
  useUnsavedChanges: () => jest.fn(),
}));
jest.mock('../../components/shared', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    ScreenHeader: () => null,
    LoadingSpinner: () => <Text>Loading</Text>,
    ErrorView: ({ message }: { message: string }) => <Text>{message}</Text>,
  };
});
const saved = {
  profile: {
    company_name: 'Saved company',
    business_address: 'Business address',
    license_type: 'trade',
  },
  insurance: null,
  license: null,
};
let client: QueryClient;
beforeEach(() => {
  jest.clearAllMocks();
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: Infinity },
    },
  });
});
afterEach(() => client.clear());
function screen() {
  return render(
    <QueryClientProvider client={client}>
      <BusinessProfileScreen />
    </QueryClientProvider>
  );
}
it('hydrates a reopened form from a fresh cache without a network request', async () => {
  client.setQueryData(['businessProfile', 'owner'], saved);
  const view = screen();
  expect(await view.findByDisplayValue('Saved company')).toBeTruthy();
  expect(view.getByDisplayValue('Business address')).toBeTruthy();
  expect(mockGet).not.toHaveBeenCalled();
});
it('preserves an in-progress edit when background data changes', async () => {
  client.setQueryData(['businessProfile', 'owner'], saved);
  const view = screen();
  fireEvent.changeText(
    await view.findByDisplayValue('Saved company'),
    'My edit'
  );
  await act(async () => {
    client.setQueryData(['businessProfile', 'owner'], {
      ...saved,
      profile: { ...saved.profile, company_name: 'Background update' },
    });
  });
  expect(view.getByDisplayValue('My edit')).toBeTruthy();
});
it('does not present an editable blank form after loading fails', async () => {
  mockGet.mockRejectedValue(new Error('Unavailable'));
  const view = screen();
  await waitFor(() =>
    expect(
      view.getByText('Could not load your saved business details.')
    ).toBeTruthy()
  );
  expect(view.queryByText('Save Business Profile')).toBeNull();
  expect(mockPatch).not.toHaveBeenCalled();
});
