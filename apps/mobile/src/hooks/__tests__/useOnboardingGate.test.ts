import { renderHook, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOnboardingGate } from '../useOnboardingGate';
import { mobileApiClient } from '../../utils/mobileApiClient';
let mockUser: any;
const mockRefresh = jest.fn();
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, refreshUser: mockRefresh }),
}));
jest.mock('../../utils/mobileApiClient', () => ({
  mobileApiClient: { post: jest.fn() },
}));
jest.mock('../../utils/logger', () => ({ logger: { warn: jest.fn() } }));
beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { id: 'new-user', onboarding_completed: false };
});
it('does not inherit another account or device-wide dismissal', async () => {
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) =>
    key === 'onboarding_dismissed' ? '1' : null
  );
  const { result } = renderHook(() => useOnboardingGate());
  await waitFor(() => expect(result.current.shouldShow).toBe(true));
  expect(AsyncStorage.getItem).toHaveBeenCalledWith(
    'onboarding_dismissed:new-user'
  );
});
it('honors the server completion flag', () => {
  mockUser.onboarding_completed = true;
  const { result } = renderHook(() => useOnboardingGate());
  expect(result.current.shouldShow).toBe(false);
  expect(AsyncStorage.getItem).not.toHaveBeenCalled();
});
it('persists dismissal for this account after server confirmation', async () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (mobileApiClient.post as jest.Mock).mockResolvedValue({});
  const { result } = renderHook(() => useOnboardingGate());
  await waitFor(() => expect(result.current.shouldShow).toBe(true));
  await act(async () => result.current.dismiss());
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(
    'onboarding_dismissed:new-user',
    '1'
  );
});
