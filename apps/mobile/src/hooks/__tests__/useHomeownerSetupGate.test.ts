import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useHomeownerSetupGate } from '../useHomeownerSetupGate';
import { mobileApiClient } from '../../utils/mobileApiClient';
let mockUser: any;
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));
jest.mock('../../utils/mobileApiClient', () => ({
  mobileApiClient: { get: jest.fn() },
}));
beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { id: 'one', role: 'homeowner' };
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (mobileApiClient.get as jest.Mock).mockResolvedValue({
    profile: { settings: {} },
  });
});
it('asks for preferences independently from the intro flag', async () => {
  mockUser.onboarding_completed = true;
  const { result } = renderHook(() => useHomeownerSetupGate());
  await waitFor(() => expect(result.current.shouldShow).toBe(true));
});
it('does not repeat preferences saved on web', async () => {
  (mobileApiClient.get as jest.Mock).mockResolvedValue({
    profile: { settings: { homeowner_setup_completed: true } },
  });
  const { result } = renderHook(() => useHomeownerSetupGate());
  await act(async () => {});
  expect(result.current.shouldShow).toBe(false);
});
it('recognizes legacy saved preferences and scopes skips to one user', async () => {
  (mobileApiClient.get as jest.Mock).mockResolvedValueOnce({
    profile: { settings: { property_type: 'terrace', concern_tags: [] } },
  });
  const { result, rerender } = renderHook(() => useHomeownerSetupGate());
  await act(async () => {});
  expect(result.current.shouldShow).toBe(false);
  mockUser = { id: 'two', role: 'homeowner' };
  rerender({});
  await waitFor(() => expect(result.current.shouldShow).toBe(true));
  await act(async () => result.current.dismiss());
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(
    'homeowner_setup_dismissed:two',
    '1'
  );
});
