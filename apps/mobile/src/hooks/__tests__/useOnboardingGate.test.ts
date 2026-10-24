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
  mobileApiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn() },
}));
jest.mock('../../utils/logger', () => ({ logger: { warn: jest.fn() } }));
beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { id: 'new-user', role: 'homeowner', onboarding_completed: true };
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (mobileApiClient.get as jest.Mock).mockResolvedValue({ progress: [] });
  (mobileApiClient.post as jest.Mock).mockResolvedValue({});
  (mobileApiClient.put as jest.Mock).mockResolvedValue({});
});
it('does not inherit another account or device-wide dismissal', async () => {
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) =>
    key === 'onboarding_dismissed' ? '1' : null
  );
  const { result } = renderHook(() => useOnboardingGate());
  await waitFor(() => expect(result.current.shouldShow).toBe(true));
  expect(AsyncStorage.getItem).toHaveBeenCalledWith(
    'onboarding:v2:mobile:new-user:intro-homeowner'
  );
});
it('honors server intro progress for mobile independently from setup', async () => {
  (mobileApiClient.get as jest.Mock).mockResolvedValue({
    progress: [
      { journey: 'intro-homeowner', platform: 'mobile', status: 'completed' },
    ],
  });
  const { result } = renderHook(() => useOnboardingGate());
  await act(async () => {});
  expect(result.current.shouldShow).toBe(false);
});
it('persists dismissal for this account after server confirmation', async () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (mobileApiClient.post as jest.Mock).mockResolvedValue({});
  const { result } = renderHook(() => useOnboardingGate());
  await waitFor(() => expect(result.current.shouldShow).toBe(true));
  await act(async () => result.current.dismiss());
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(
    'onboarding:v2:mobile:new-user:intro-homeowner',
    'skipped'
  );
});
it('records completion separately from skipping', async () => {
  const { result } = renderHook(() => useOnboardingGate());
  await waitFor(() => expect(result.current.shouldShow).toBe(true));
  await act(async () => result.current.complete());
  expect(mobileApiClient.put).toHaveBeenCalledWith(
    '/api/onboarding/progress',
    expect.objectContaining({ status: 'completed', platform: 'mobile' })
  );
});
it('does not persist a failed account save', async () => {
  (mobileApiClient.put as jest.Mock).mockRejectedValue(new Error('offline'));
  const { result } = renderHook(() => useOnboardingGate());
  await waitFor(() => expect(result.current.shouldShow).toBe(true));
  await act(async () => result.current.complete());
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});
it('does not show homeowner onboarding to admins', async () => {
  mockUser.role = 'admin';
  const { result } = renderHook(() => useOnboardingGate());
  await act(async () => {});
  expect(result.current.shouldShow).toBe(false);
  expect(mobileApiClient.get).not.toHaveBeenCalled();
});
it('drops the previous account state on account switch', async () => {
  const { result, rerender } = renderHook(() => useOnboardingGate());
  await waitFor(() => expect(result.current.shouldShow).toBe(true));
  mockUser = { id: 'second', role: 'contractor' };
  (mobileApiClient.get as jest.Mock).mockResolvedValue({
    progress: [
      { journey: 'intro-contractor', platform: 'mobile', status: 'completed' },
    ],
  });
  rerender({});
  await act(async () => {});
  expect(result.current.shouldShow).toBe(false);
  expect(AsyncStorage.getItem).toHaveBeenLastCalledWith(
    'onboarding:v2:mobile:second:intro-contractor'
  );
});
