import { act, renderHook } from '@testing-library/react-native';
import { useNotificationNavigation } from '../useNotificationNavigation';
import { navigationRef } from '../navigationRef';
import { NotificationService } from '../../services/NotificationService';

jest.mock('../navigationRef', () => ({
  navigationRef: { isReady: jest.fn(), navigate: jest.fn(), reset: jest.fn() },
}));
jest.mock('../../services/NotificationService', () => ({
  NotificationService: { registerListeners: jest.fn(), cleanup: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  (navigationRef.isReady as jest.Mock).mockReturnValue(false);
});

it('registers when navigation becomes ready after restored authentication', () => {
  const { result, unmount } = renderHook(() =>
    useNotificationNavigation('synthetic-owner')
  );
  expect(NotificationService.registerListeners).not.toHaveBeenCalled();
  (navigationRef.isReady as jest.Mock).mockReturnValue(true);
  act(() => result.current());
  act(() => result.current());
  expect(NotificationService.registerListeners).toHaveBeenCalledTimes(1);
  unmount();
  expect(NotificationService.cleanup).toHaveBeenCalledTimes(1);
});

it('waits for authentication and cleans up on account change and logout', () => {
  (navigationRef.isReady as jest.Mock).mockReturnValue(true);
  const { result, rerender } = renderHook(
    ({ id, loading }: { id?: string; loading: boolean }) =>
      useNotificationNavigation(id, loading),
    { initialProps: { id: undefined as string | undefined, loading: true } }
  );
  act(() => result.current());
  expect(NotificationService.registerListeners).not.toHaveBeenCalled();
  rerender({ id: 'synthetic-owner', loading: false });
  expect(NotificationService.registerListeners).toHaveBeenCalledTimes(1);
  rerender({ id: 'synthetic-contractor', loading: false });
  expect(NotificationService.cleanup).toHaveBeenCalledTimes(1);
  expect(NotificationService.registerListeners).toHaveBeenCalledTimes(2);
  rerender({ id: undefined, loading: false });
  expect(NotificationService.cleanup).toHaveBeenCalledTimes(2);
});
