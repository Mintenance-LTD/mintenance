import { NetworkUtils } from '../../../utils/networkUtils';
import NetInfo from '@react-native-community/netinfo';

jest.mock('@react-native-community/netinfo');

describe('Network Utilities - Comprehensive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Connection Status', () => {
    it('should detect online status', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });

      const status = await NetworkUtils.checkConnection();

      expect(status.isOnline).toBe(true);
      expect(status.type).toBe('wifi');
    });

    it('should detect offline status', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      });

      const status = await NetworkUtils.checkConnection();

      expect(status.isOnline).toBe(false);
    });

    it('should handle connection changes', async () => {
      const callback = jest.fn();

      NetworkUtils.onConnectionChange(callback);

      // Simulate connection change
      const mockUnsubscribe = jest.fn();
      (NetInfo.addEventListener as jest.Mock).mockReturnValue(mockUnsubscribe);

      expect(NetInfo.addEventListener).toHaveBeenCalled();
    });
  });

  describe('Network Speed', () => {
    it('should measure download speed', async () => {
      const speed = await NetworkUtils.measureSpeed();

      expect(speed).toHaveProperty('downloadMbps');
      expect(speed).toHaveProperty('uploadMbps');
      expect(speed).toHaveProperty('latencyMs');
    });

    it('should classify connection quality', async () => {
      const qualities = [
        { downloadMbps: 100, expected: 'excellent' },
        { downloadMbps: 25, expected: 'good' },
        { downloadMbps: 5, expected: 'fair' },
        { downloadMbps: 1, expected: 'poor' },
      ];

      qualities.forEach(({ downloadMbps, expected }) => {
        const quality = NetworkUtils.getConnectionQuality({ downloadMbps });
        expect(quality).toBe(expected);
      });
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed network requests', async () => {
      const request = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({ data: 'success' });

      const result = await NetworkUtils.retryRequest(request, {
        maxRetries: 3,
        delay: 100,
      });

      expect(result).toEqual({ data: 'success' });
      expect(request).toHaveBeenCalledTimes(3);
    });

    it('should implement exponential backoff', async () => {
      const request = jest.fn().mockRejectedValue(new Error('Failed'));
      const delays = [];

      await NetworkUtils.retryRequest(request, {
        maxRetries: 3,
        backoff: 'exponential',
        onRetry: (attempt, delay) => delays.push(delay),
      }).catch(() => {});

      expect(delays[0]).toBeLessThan(delays[1]);
      expect(delays[1]).toBeLessThan(delays[2]);
    });
  });

  describe('Offline Queue', () => {
    it('should queue requests when offline', async () => {
      NetworkUtils.setOffline(true);

      const request1 = NetworkUtils.queueRequest('GET', '/api/data');
      const request2 = NetworkUtils.queueRequest('POST', '/api/create');

      const queue = NetworkUtils.getQueue();
      expect(queue).toHaveLength(2);
    });

    it('should process queue when back online', async () => {
      const mockProcess = jest.fn().mockResolvedValue({ success: true });

      NetworkUtils.queueRequest('GET', '/api/data');
      NetworkUtils.queueRequest('POST', '/api/create');

      await NetworkUtils.processQueue(mockProcess);

      expect(mockProcess).toHaveBeenCalledTimes(2);
    });

    it('should handle queue processing failures', async () => {
      const mockProcess = jest.fn()
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValue({ success: true });

      NetworkUtils.queueRequest('GET', '/api/data');

      const results = await NetworkUtils.processQueue(mockProcess);

      expect(results).toContainEqual({
        success: false,
        error: expect.any(Error),
      });
    });
  });

  describe('Data Usage Tracking', () => {
    it('should track data usage', () => {
      NetworkUtils.trackDataUsage('upload', 1024);
      NetworkUtils.trackDataUsage('download', 2048);
      NetworkUtils.trackDataUsage('upload', 512);

      const usage = NetworkUtils.getDataUsage();

      expect(usage.upload).toBe(1536);
      expect(usage.download).toBe(2048);
      expect(usage.total).toBe(3584);
    });

    it('should reset data usage', () => {
      NetworkUtils.trackDataUsage('upload', 1024);
      NetworkUtils.resetDataUsage();

      const usage = NetworkUtils.getDataUsage();

      expect(usage.total).toBe(0);
    });
  });

  describe('Connection Cost', () => {
    it('should detect expensive connections', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        type: 'cellular',
        details: {
          isConnectionExpensive: true,
          cellularGeneration: '3g',
        },
      });

      const isExpensive = await NetworkUtils.isExpensiveConnection();

      expect(isExpensive).toBe(true);
    });

    it('should allow large downloads on wifi', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        type: 'wifi',
        details: {
          isConnectionExpensive: false,
        },
      });

      const canDownload = await NetworkUtils.canDownloadLargeFile();

      expect(canDownload).toBe(true);
    });
  });
});