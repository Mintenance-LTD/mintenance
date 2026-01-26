import * as networkUtils from '../../utils/networkUtils';
import NetInfo from '@react-native-community/netinfo';

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
  addEventListener: jest.fn(),
}));

describe('NetworkUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('connectivity checks', () => {
    it('should detect online status', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      });

      const isOnline = await networkUtils.isOnline();
      expect(isOnline).toBe(true);
    });

    it('should detect offline status', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      });

      const isOnline = await networkUtils.isOnline();
      expect(isOnline).toBe(false);
    });

    it('should get connection type', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        type: 'wifi',
        isConnected: true,
      });

      const type = await networkUtils.getConnectionType();
      expect(type).toBe('wifi');
    });
  });

  describe('network listeners', () => {
    it('should subscribe to network changes', () => {
      const callback = jest.fn();
      const unsubscribe = jest.fn();
      (NetInfo.addEventListener as jest.Mock).mockReturnValue(unsubscribe);

      const unsub = networkUtils.onNetworkChange(callback);

      expect(NetInfo.addEventListener).toHaveBeenCalledWith(callback);
      expect(unsub).toBe(unsubscribe);
    });
  });

  describe('retry with network check', () => {
    it('should retry when network is available', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      });

      const apiCall = jest.fn().mockResolvedValue({ data: 'success' });
      const result = await networkUtils.withNetworkCheck(apiCall);

      expect(result).toEqual({ data: 'success' });
      expect(apiCall).toHaveBeenCalled();
    });

    it('should throw when network is unavailable', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      });

      const apiCall = jest.fn();

      await expect(networkUtils.withNetworkCheck(apiCall)).rejects.toThrow('No network connection');
      expect(apiCall).not.toHaveBeenCalled();
    });
  });
});