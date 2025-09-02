import { RealtimeService } from '../../services/RealtimeService';
import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { Message, Job, Bid } from '../../types';

enum JobStatus {
  POSTED = 'posted',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// Mock dependencies
jest.mock('../../config/supabase', () => ({
  supabase: {
    channel: jest.fn(() => ({
      on: jest.fn(() => ({
        on: jest.fn(() => ({
          on: jest.fn(() => ({
            subscribe: jest.fn()
          }))
        }))
      })),
      unsubscribe: jest.fn(),
      send: jest.fn()
    })),
    removeChannel: jest.fn(),
    getChannels: jest.fn(() => [])
  }
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

describe('RealtimeService', () => {
  const mockMessage: Message = {
    id: 'msg-1',
    content: 'Hello, test message',
    senderId: 'user-1',
    receiverId: 'user-2',
    jobId: 'job-1',
    createdAt: '2024-01-01T00:00:00Z',
    isRead: false
  };

  const mockJob: Job = {
    id: 'job-1',
    title: 'Test Job',
    description: 'Test job description',
    category: 'plumbing',
    priority: 'medium' as any,
    status: JobStatus.POSTED,
    budget: 200,
    homeownerId: 'user-1',
    createdAt: '2024-01-01T00:00:00Z',
    photos: []
  };

  const mockBid: Bid = {
    id: 'bid-1',
    jobId: 'job-1',
    contractorId: 'contractor-1',
    amount: 150,
    description: 'I can complete this work',
    status: 'pending' as any,
    createdAt: '2024-01-01T00:00:00Z'
  };

  let mockChannel: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockChannel = {
      on: jest.fn(() => mockChannel),
      unsubscribe: jest.fn(),
      send: jest.fn()
    };
    
    (supabase.channel as jest.Mock).mockReturnValue(mockChannel);
  });

  describe('subscribeToMessages', () => {
    it('should subscribe to messages for a job', () => {
      const callback = jest.fn();
      
      RealtimeService.subscribeToMessages('job-1', callback);

      expect(supabase.channel).toHaveBeenCalledWith('messages:job-1');
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: 'job_id=eq.job-1'
        },
        expect.any(Function)
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    it('should call callback when new message is received', () => {
      const callback = jest.fn();
      let messageHandler: Function;

      mockChannel.on = jest.fn((event, config, handler) => {
        if (config.event === 'INSERT') {
          messageHandler = handler;
        }
        return mockChannel;
      });

      RealtimeService.subscribeToMessages('job-1', callback);

      // Simulate receiving a message
      const payload = {
        new: {
          id: 'msg-1',
          content: 'New message',
          sender_id: 'user-1',
          receiver_id: 'user-2',
          job_id: 'job-1',
          created_at: '2024-01-01T00:00:00Z',
          is_read: false
        }
      };

      messageHandler!(payload);

      expect(callback).toHaveBeenCalledWith({
        id: 'msg-1',
        content: 'New message',
        senderId: 'user-1',
        receiverId: 'user-2',
        jobId: 'job-1',
        createdAt: '2024-01-01T00:00:00Z',
        isRead: false
      });
    });

    it('should handle message subscription errors', () => {
      const callback = jest.fn();
      let errorHandler: Function;

      mockChannel.on = jest.fn((event, config, handler) => {
        if (event === 'postgres_changes') {
          return mockChannel;
        }
        return mockChannel;
      });

      mockChannel.subscribe = jest.fn((statusHandler) => {
        // Simulate subscription error
        statusHandler('CHANNEL_ERROR', 'Subscription failed');
      });

      RealtimeService.subscribeToMessages('job-1', callback);

      expect(logger.error).toHaveBeenCalledWith(
        'Error subscribing to messages:',
        'Subscription failed'
      );
    });
  });

  describe('subscribeToJobUpdates', () => {
    it('should subscribe to job updates', () => {
      const callback = jest.fn();
      
      RealtimeService.subscribeToJobUpdates('job-1', callback);

      expect(supabase.channel).toHaveBeenCalledWith('jobs:job-1');
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: 'id=eq.job-1'
        },
        expect.any(Function)
      );
    });

    it('should call callback when job is updated', () => {
      const callback = jest.fn();
      let updateHandler: Function;

      mockChannel.on = jest.fn((event, config, handler) => {
        if (config.event === 'UPDATE') {
          updateHandler = handler;
        }
        return mockChannel;
      });

      RealtimeService.subscribeToJobUpdates('job-1', callback);

      // Simulate job update
      const payload = {
        new: {
          id: 'job-1',
          title: 'Updated Job',
          status: 'in_progress',
          contractor_id: 'contractor-1'
        },
        old: {
          id: 'job-1',
          title: 'Old Job',
          status: 'posted',
          contractor_id: null
        }
      };

      updateHandler!(payload);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'job-1',
          title: 'Updated Job',
          status: 'in_progress',
          contractorId: 'contractor-1'
        }),
        expect.objectContaining({
          id: 'job-1',
          title: 'Old Job',
          status: 'posted'
        })
      );
    });
  });

  describe('subscribeToJobBids', () => {
    it('should subscribe to new bids for a job', () => {
      const callback = jest.fn();
      
      RealtimeService.subscribeToJobBids('job-1', callback);

      expect(supabase.channel).toHaveBeenCalledWith('bids:job-1');
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bids',
          filter: 'job_id=eq.job-1'
        },
        expect.any(Function)
      );
    });

    it('should call callback when new bid is received', () => {
      const callback = jest.fn();
      let bidHandler: Function;

      mockChannel.on = jest.fn((event, config, handler) => {
        if (config.event === 'INSERT') {
          bidHandler = handler;
        }
        return mockChannel;
      });

      RealtimeService.subscribeToJobBids('job-1', callback);

      // Simulate new bid
      const payload = {
        new: {
          id: 'bid-1',
          job_id: 'job-1',
          contractor_id: 'contractor-1',
          amount: 150,
          description: 'I can do this work',
          status: 'pending',
          created_at: '2024-01-01T00:00:00Z'
        }
      };

      bidHandler!(payload);

      expect(callback).toHaveBeenCalledWith({
        id: 'bid-1',
        jobId: 'job-1',
        contractorId: 'contractor-1',
        amount: 150,
        description: 'I can do this work',
        status: 'pending',
        createdAt: '2024-01-01T00:00:00Z'
      });
    });
  });

  describe('subscribeToUserUpdates', () => {
    it('should subscribe to user profile updates', () => {
      const callback = jest.fn();
      
      RealtimeService.subscribeToUserUpdates('user-1', callback);

      expect(supabase.channel).toHaveBeenCalledWith('users:user-1');
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: 'id=eq.user-1'
        },
        expect.any(Function)
      );
    });

    it('should handle user update events', () => {
      const callback = jest.fn();
      let updateHandler: Function;

      mockChannel.on = jest.fn((event, config, handler) => {
        if (config.event === 'UPDATE') {
          updateHandler = handler;
        }
        return mockChannel;
      });

      RealtimeService.subscribeToUserUpdates('user-1', callback);

      // Simulate user update
      const payload = {
        new: {
          id: 'user-1',
          first_name: 'Updated',
          last_name: 'Name',
          is_available: false
        }
      };

      updateHandler!(payload);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-1',
          firstName: 'Updated',
          lastName: 'Name',
          isAvailable: false
        })
      );
    });
  });

  describe('sendMessage', () => {
    it('should send a message through realtime channel', async () => {
      await RealtimeService.sendMessage('job-1', mockMessage);

      expect(supabase.channel).toHaveBeenCalledWith('messages:job-1');
      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'message',
        payload: mockMessage
      });
    });

    it('should handle send message errors', async () => {
      mockChannel.send = jest.fn().mockRejectedValue(new Error('Send failed'));

      await expect(RealtimeService.sendMessage('job-1', mockMessage))
        .rejects.toThrow('Send failed');

      expect(logger.error).toHaveBeenCalledWith(
        'Error sending realtime message:',
        expect.any(Error)
      );
    });
  });

  describe('sendJobUpdate', () => {
    it('should broadcast job update', async () => {
      await RealtimeService.sendJobUpdate('job-1', mockJob);

      expect(supabase.channel).toHaveBeenCalledWith('jobs:job-1');
      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'job_update',
        payload: mockJob
      });
    });
  });

  describe('sendBidUpdate', () => {
    it('should broadcast bid update', async () => {
      await RealtimeService.sendBidUpdate('job-1', mockBid);

      expect(supabase.channel).toHaveBeenCalledWith('bids:job-1');
      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'bid_update',
        payload: mockBid
      });
    });
  });

  describe('unsubscribeFromMessages', () => {
    it('should unsubscribe from messages channel', () => {
      RealtimeService.unsubscribeFromMessages('job-1');

      expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel);
    });

    it('should handle unsubscribe errors gracefully', () => {
      (supabase.channel as jest.Mock).mockReturnValue(null);

      expect(() => {
        RealtimeService.unsubscribeFromMessages('job-1');
      }).not.toThrow();
    });
  });

  describe('unsubscribeFromJobUpdates', () => {
    it('should unsubscribe from job updates channel', () => {
      RealtimeService.unsubscribeFromJobUpdates('job-1');

      expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel);
    });
  });

  describe('unsubscribeFromJobBids', () => {
    it('should unsubscribe from job bids channel', () => {
      RealtimeService.unsubscribeFromJobBids('job-1');

      expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel);
    });
  });

  describe('unsubscribeFromUserUpdates', () => {
    it('should unsubscribe from user updates channel', () => {
      RealtimeService.unsubscribeFromUserUpdates('user-1');

      expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel);
    });
  });

  describe('getChannelStatus', () => {
    it('should return channel status information', () => {
      (supabase.getChannels as jest.Mock).mockReturnValue([
        { topic: 'messages:job-1', state: 'joined' },
        { topic: 'jobs:job-1', state: 'joined' }
      ]);

      const status = RealtimeService.getChannelStatus();

      expect(status).toEqual({
        channels: [
          { topic: 'messages:job-1', state: 'joined' },
          { topic: 'jobs:job-1', state: 'joined' }
        ],
        totalChannels: 2,
        activeChannels: 2
      });
    });

    it('should handle empty channels list', () => {
      (supabase.getChannels as jest.Mock).mockReturnValue([]);

      const status = RealtimeService.getChannelStatus();

      expect(status).toEqual({
        channels: [],
        totalChannels: 0,
        activeChannels: 0
      });
    });
  });

  describe('cleanup', () => {
    it('should cleanup all channels', () => {
      const mockChannels = [
        { topic: 'messages:job-1', unsubscribe: jest.fn() },
        { topic: 'jobs:job-1', unsubscribe: jest.fn() }
      ];

      (supabase.getChannels as jest.Mock).mockReturnValue(mockChannels);

      RealtimeService.cleanup();

      mockChannels.forEach(channel => {
        expect(channel.unsubscribe).toHaveBeenCalled();
      });
    });

    it('should handle cleanup errors gracefully', () => {
      const mockChannels = [
        { topic: 'messages:job-1', unsubscribe: jest.fn().mockRejectedValue(new Error('Cleanup error')) }
      ];

      (supabase.getChannels as jest.Mock).mockReturnValue(mockChannels);

      expect(() => {
        RealtimeService.cleanup();
      }).not.toThrow();

      expect(logger.warn).toHaveBeenCalledWith(
        'Error cleaning up realtime channels:',
        expect.any(Error)
      );
    });
  });

  describe('connection management', () => {
    it('should handle connection state changes', () => {
      const callback = jest.fn();
      let statusHandler: Function;

      mockChannel.subscribe = jest.fn((handler) => {
        statusHandler = handler;
      });

      RealtimeService.subscribeToMessages('job-1', callback);

      // Simulate connection states
      statusHandler('SUBSCRIBED');
      expect(logger.debug).toHaveBeenCalledWith('Realtime subscription active for messages:job-1');

      statusHandler('CHANNEL_ERROR', 'Connection lost');
      expect(logger.error).toHaveBeenCalledWith('Error subscribing to messages:', 'Connection lost');

      statusHandler('TIMED_OUT');
      expect(logger.warn).toHaveBeenCalledWith('Realtime subscription timed out for messages:job-1');
    });

    it('should handle multiple subscriptions to same channel', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      RealtimeService.subscribeToMessages('job-1', callback1);
      RealtimeService.subscribeToMessages('job-1', callback2);

      // Should create separate channels
      expect(supabase.channel).toHaveBeenCalledTimes(2);
    });
  });

  describe('data transformation', () => {
    it('should transform snake_case to camelCase correctly', () => {
      const callback = jest.fn();
      let messageHandler: Function;

      mockChannel.on = jest.fn((event, config, handler) => {
        if (config.event === 'INSERT') {
          messageHandler = handler;
        }
        return mockChannel;
      });

      RealtimeService.subscribeToMessages('job-1', callback);

      const payload = {
        new: {
          id: 'msg-1',
          job_id: 'job-1',
          sender_id: 'user-1',
          receiver_id: 'user-2',
          created_at: '2024-01-01T00:00:00Z',
          is_read: false,
          content: 'Test message'
        }
      };

      messageHandler!(payload);

      expect(callback).toHaveBeenCalledWith({
        id: 'msg-1',
        jobId: 'job-1',
        senderId: 'user-1',
        receiverId: 'user-2',
        createdAt: '2024-01-01T00:00:00Z',
        isRead: false,
        content: 'Test message'
      });
    });

    it('should handle missing fields in data transformation', () => {
      const callback = jest.fn();
      let messageHandler: Function;

      mockChannel.on = jest.fn((event, config, handler) => {
        if (config.event === 'INSERT') {
          messageHandler = handler;
        }
        return mockChannel;
      });

      RealtimeService.subscribeToMessages('job-1', callback);

      const payload = {
        new: {
          id: 'msg-1',
          content: 'Partial message'
          // Missing other required fields
        }
      };

      messageHandler!(payload);

      expect(callback).toHaveBeenCalledWith({
        id: 'msg-1',
        content: 'Partial message',
        jobId: undefined,
        senderId: undefined,
        receiverId: undefined,
        createdAt: undefined,
        isRead: undefined
      });
    });
  });
});