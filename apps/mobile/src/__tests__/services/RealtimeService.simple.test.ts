import { RealtimeService } from '../../services/RealtimeService';

// Mock only external dependencies
jest.mock('../../config/supabase', () => ({
  supabase: {
    channel: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn() },
}));

const { supabase } = require('../../config/supabase');

describe('RealtimeService - Simple Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('subscribeToMessages', () => {
    it('should subscribe to messages for a job', () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
      };

      supabase.channel.mockReturnValue(mockChannel);

      const callback = jest.fn();
      const unsubscribe = RealtimeService.subscribeToMessages('job-1', callback);

      expect(supabase.channel).toHaveBeenCalledWith('messages:job_id=eq.job-1');
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        }),
        expect.any(Function)
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
    });

    it('should call callback when new message is received', () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
      };

      supabase.channel.mockReturnValue(mockChannel);

      const callback = jest.fn();
      RealtimeService.subscribeToMessages('job-1', callback);

      // Simulate a message event
      const changeHandler = mockChannel.on.mock.calls[0][2];
      const mockPayload = {
        eventType: 'INSERT',
        new: {
          id: 'msg-1',
          job_id: 'job-1',
          message_text: 'Hello',
          sender_id: 'user-1',
        },
      };

      changeHandler(mockPayload);

      expect(callback).toHaveBeenCalledWith(mockPayload.new);
    });

    it('should handle message subscription errors', () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
      };

      supabase.channel.mockReturnValue(mockChannel);

      const callback = jest.fn();
      const errorHandler = jest.fn();

      RealtimeService.subscribeToMessages('job-1', callback, errorHandler);

      // Simulate an error
      const changeHandler = mockChannel.on.mock.calls[0][2];
      const mockError = new Error('Subscription failed');

      changeHandler({ error: mockError });

      expect(errorHandler).toHaveBeenCalledWith(mockError);
    });
  });

  describe('subscribeToJobUpdates', () => {
    it('should subscribe to job updates', () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
      };

      supabase.channel.mockReturnValue(mockChannel);

      const callback = jest.fn();
      const unsubscribe = RealtimeService.subscribeToJobUpdates('job-1', callback);

      expect(supabase.channel).toHaveBeenCalledWith('job:id=eq.job-1');
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
        }),
        expect.any(Function)
      );
      expect(typeof unsubscribe).toBe('function');
    });

    it('should call callback when job is updated', () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
      };

      supabase.channel.mockReturnValue(mockChannel);

      const callback = jest.fn();
      RealtimeService.subscribeToJobUpdates('job-1', callback);

      // Simulate a job update event
      const changeHandler = mockChannel.on.mock.calls[0][2];
      const mockPayload = {
        eventType: 'UPDATE',
        old: { status: 'posted' },
        new: {
          id: 'job-1',
          status: 'in_progress',
          title: 'Fix faucet',
        },
      };

      changeHandler(mockPayload);

      expect(callback).toHaveBeenCalledWith(mockPayload.new, mockPayload.old);
    });
  });

  describe('subscribeToJobBids', () => {
    it('should subscribe to new bids for a job', () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
      };

      supabase.channel.mockReturnValue(mockChannel);

      const callback = jest.fn();
      const unsubscribe = RealtimeService.subscribeToJobBids('job-1', callback);

      expect(supabase.channel).toHaveBeenCalledWith('bids:job_id=eq.job-1');
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: 'INSERT',
          schema: 'public',
          table: 'bids',
        }),
        expect.any(Function)
      );
      expect(typeof unsubscribe).toBe('function');
    });

    it('should handle new bid notifications', () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
      };

      supabase.channel.mockReturnValue(mockChannel);

      const callback = jest.fn();
      RealtimeService.subscribeToJobBids('job-1', callback);

      // Simulate a new bid event
      const changeHandler = mockChannel.on.mock.calls[0][2];
      const mockPayload = {
        eventType: 'INSERT',
        new: {
          id: 'bid-1',
          job_id: 'job-1',
          contractor_id: 'user-2',
          amount: 150,
          description: 'I can fix this',
        },
      };

      changeHandler(mockPayload);

      expect(callback).toHaveBeenCalledWith(mockPayload.new);
    });
  });

  describe('unsubscribeAll', () => {
    it('should unsubscribe from all channels', () => {
      const mockChannel1 = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
      };

      const mockChannel2 = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
      };

      supabase.channel.mockReturnValueOnce(mockChannel1).mockReturnValueOnce(mockChannel2);

      // Create some subscriptions
      RealtimeService.subscribeToMessages('job-1', jest.fn());
      RealtimeService.subscribeToJobUpdates('job-2', jest.fn());

      // Unsubscribe from all
      RealtimeService.unsubscribeAll();

      expect(mockChannel1.unsubscribe).toHaveBeenCalled();
      expect(mockChannel2.unsubscribe).toHaveBeenCalled();
    });
  });

  describe('getActiveSubscriptions', () => {
    it('should return count of active subscriptions', () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
      };

      supabase.channel.mockReturnValue(mockChannel);

      // Initially should be 0
      expect(RealtimeService.getActiveSubscriptions()).toBe(0);

      // Add some subscriptions
      RealtimeService.subscribeToMessages('job-1', jest.fn());
      RealtimeService.subscribeToJobUpdates('job-2', jest.fn());

      expect(RealtimeService.getActiveSubscriptions()).toBe(2);
    });
  });
});