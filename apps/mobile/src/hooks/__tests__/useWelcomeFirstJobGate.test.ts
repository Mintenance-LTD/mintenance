import { renderHook, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWelcomeFirstJobGate } from '../useWelcomeFirstJobGate';
let mockUser: any;
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  mockUser = { id: 'a', role: 'homeowner', onboarding_completed: false };
});
it('never shows the post-job finale to contractors, including after onboarding', () => {
  mockUser.role = 'contractor';
  const { result, rerender } = renderHook(() => useWelcomeFirstJobGate());
  mockUser = { ...mockUser, onboarding_completed: true };
  rerender({});
  expect(result.current.shouldShow).toBe(false);
  expect(AsyncStorage.getItem).not.toHaveBeenCalled();
});
it('does not restart the finale for existing onboarded homeowners', () => {
  mockUser.onboarding_completed = true;
  const { result } = renderHook(() => useWelcomeFirstJobGate());
  expect(result.current.shouldShow).toBe(false);
});
it('shows after homeowner onboarding and saves dismissal per account', async () => {
  const { result, rerender } = renderHook(() => useWelcomeFirstJobGate());
  mockUser = { ...mockUser, onboarding_completed: true };
  rerender({});
  await waitFor(() => expect(result.current.shouldShow).toBe(true));
  await act(async () => result.current.dismiss());
  expect(AsyncStorage.setItem).toHaveBeenCalledWith('welcome_first_job_seen:a', '1');
  expect(result.current.shouldShow).toBe(false);
});
it('ignores a delayed storage result after switching to a contractor', async () => {
  let resolve!: (value: null) => void;
  (AsyncStorage.getItem as jest.Mock).mockReturnValue(new Promise(r => { resolve = r; }));
  const { result, rerender } = renderHook(() => useWelcomeFirstJobGate());
  mockUser = { ...mockUser, onboarding_completed: true };
  rerender({});
  mockUser = { id: 'b', role: 'contractor', onboarding_completed: true };
  rerender({});
  await act(async () => resolve(null));
  expect(result.current.shouldShow).toBe(false);
});
