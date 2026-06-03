import {
  isOnline,
  getConnectionType,
  onNetworkChange,
  withNetworkCheck,
  isOnlineCached,
} from '../../../utils/networkUtils';
import NetInfo from '@react-native-community/netinfo';

// NOTE (test realignment 2026-06-02): the original suite asserted a speculative
// `NetworkUtils` class (checkConnection/measureSpeed/retryRequest/queueRequest/
// trackDataUsage/isExpensiveConnection/...) that never existed in
// src/utils/networkUtils.ts. The real module exports standalone NetInfo-backed
// helpers. Rewritten to the CURRENT contract. No source changes made.

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: jest.fn(),
    addEventListener: jest.fn(() => jest.fn()),
  },
}));

const mockedNetInfo = NetInfo as unknown as {
  fetch: jest.Mock;
  addEventListener: jest.Mock;
};

describe('Network Utilities - Comprehensive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // sensible default so isOnlineCached's seed promise resolves online
    mockedNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    });
    mockedNetInfo.addEventListener.mockReturnValue(jest.fn());
  });

  describe('Connection Status (isOnline)', () => {
    it('should detect online status', async () => {
      mockedNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });

      expect(await isOnline()).toBe(true);
    });

    it('should detect offline status', async () => {
      mockedNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      });

      expect(await isOnline()).toBe(false);
    });

    it('should treat connected-but-unreachable as offline', async () => {
      mockedNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: false,
        type: 'wifi',
      });

      expect(await isOnline()).toBe(false);
    });
  });

  describe('Connection Type (getConnectionType)', () => {
    it('should return the NetInfo connection type', async () => {
      mockedNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'cellular',
      });

      expect(await getConnectionType()).toBe('cellular');
    });
  });

  describe('Connection Change Subscription (onNetworkChange)', () => {
    it('should register a NetInfo listener and return its unsubscribe fn', () => {
      const unsubscribe = jest.fn();
      mockedNetInfo.addEventListener.mockReturnValue(unsubscribe);
      const callback = jest.fn();

      const returned = onNetworkChange(callback);

      expect(mockedNetInfo.addEventListener).toHaveBeenCalledWith(callback);
      expect(returned).toBe(unsubscribe);
    });
  });

  describe('withNetworkCheck guard', () => {
    it('should run the API call when online', async () => {
      mockedNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });
      const apiCall = jest.fn().mockResolvedValue({ data: 'ok' });

      const result = await withNetworkCheck(apiCall);

      expect(result).toEqual({ data: 'ok' });
      expect(apiCall).toHaveBeenCalledTimes(1);
    });

    it('should throw and skip the API call when offline', async () => {
      mockedNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      });
      const apiCall = jest.fn();

      await expect(withNetworkCheck(apiCall)).rejects.toThrow(
        'No network connection'
      );
      expect(apiCall).not.toHaveBeenCalled();
    });
  });

  describe('Cached online flag (isOnlineCached)', () => {
    it('should install a NetInfo listener on first read and return a boolean', () => {
      const value = isOnlineCached();

      expect(typeof value).toBe('boolean');
      expect(mockedNetInfo.addEventListener).toHaveBeenCalled();
    });

    it('should only install the listener once (idempotent)', () => {
      const callsBefore = mockedNetInfo.addEventListener.mock.calls.length;
      isOnlineCached();
      isOnlineCached();
      isOnlineCached();
      const callsAfter = mockedNetInfo.addEventListener.mock.calls.length;

      // The module-level guard means no new addEventListener calls occur
      // after the listener was first installed (in an earlier test).
      expect(callsAfter).toBe(callsBefore);
    });
  });
});
