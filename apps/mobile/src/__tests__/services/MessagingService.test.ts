import { MessagingService, Message, MessageThread } from '../../services/MessagingService';

// Mock external dependencies only
jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn(),
    channel: jest.fn(() => ({
      on: jest.fn(() => ({ on: jest.fn(() => ({ subscribe: jest.fn() })) })),
      unsubscribe: jest.fn(),
    })),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: { error: jest.fn() },
}));

jest.mock('../../utils/sanitize', () => ({
  sanitizeText: (text: string) => text,
}));

// Mock ServiceErrorHandler
jest.mock('../../utils/serviceErrorHandler', () => ({
  ServiceErrorHandler: {
    validateRequired: jest.fn(),
    executeOperation: jest.fn().mockImplementation(async (operation) => {
      try {
        const data = await operation();
        return { success: true, data };
      } catch (error) {
        throw error; // Re-throw to match service expectation
      }
    }),
    handleDatabaseError: jest.fn((error) => error),
  },
}));

const { ServiceErrorHandler } = require('../../utils/serviceErrorHandler');

// Mock createMessageNotification to avoid implementation complexity
const mockCreateMessageNotification = jest.fn().mockResolvedValue(undefined);
(MessagingService as any).createMessageNotification = mockCreateMessageNotification;

const { supabase } = require('../../config/supabase');

describe('MessagingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear active channels before each test
    (MessagingService as any).activeChannels.clear();
  });

  describe('sendMessage', () => {
    it('should send a text message successfully', async () => {
      const mockMessageData = {
        id: 'msg-1',
        job_id: 'job-1',
        sender_id: 'user-1',
        receiver_id: 'user-2',
        message_text: 'Hello, I can help with this job!',
        message_type: 'text',
        read: false,
        created_at: '2024-01-01T10:00:00Z',
        sender: {
          first_name: 'John',
          last_name: 'Contractor',
          role: 'contractor',
        },
      };

      const mockChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockMessageData, error: null }),
      };
      
      supabase.from.mockReturnValue(mockChain);

      const result = await MessagingService.sendMessage(
        'job-1',
        'user-2',
        'Hello, I can help with this job!',
        'user-1'
      );

      expect(supabase.from).toHaveBeenCalledWith('messages');
      expect(result.id).toBe('msg-1');
      expect(result.messageText).toBe('Hello, I can help with this job!');
      expect(result.senderName).toBe('John Contractor');
      expect(mockCreateMessageNotification).toHaveBeenCalled();
    });

    it('should handle message sending errors', async () => {
      const mockChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('Database error')),
      };
      
      supabase.from.mockReturnValue(mockChain);

      await expect(
        MessagingService.sendMessage('job-1', 'user-2', 'Test message', 'user-1')
      ).rejects.toThrow('Database error');
    });

    it('should send message with attachment', async () => {
      const mockMessageData = {
        id: 'msg-2',
        job_id: 'job-1',
        sender_id: 'user-1',
        receiver_id: 'user-2',
        message_text: 'Here is the photo',
        message_type: 'image',
        attachment_url: 'https://example.com/image.jpg',
        read: false,
        created_at: '2024-01-01T10:00:00Z',
        sender: {
          first_name: 'Jane',
          last_name: 'Homeowner',
          role: 'homeowner',
        },
      };

      const mockChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockMessageData, error: null }),
      };
      
      supabase.from.mockReturnValue(mockChain);

      const result = await MessagingService.sendMessage(
        'job-1',
        'user-2',
        'Here is the photo',
        'user-1',
        'image',
        'https://example.com/image.jpg'
      );

      expect(result.messageType).toBe('image');
      expect(result.attachmentUrl).toBe('https://example.com/image.jpg');
    });
  });

  describe('getJobMessages', () => {
    it('should retrieve messages for a job', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          job_id: 'job-1',
          sender_id: 'user-1',
          message_text: 'First message',
          message_type: 'text',
          created_at: '2024-01-01T10:00:00Z',
          sender: { first_name: 'John', last_name: 'Doe' },
        },
        {
          id: 'msg-2',
          job_id: 'job-1',
          sender_id: 'user-2',
          message_text: 'Second message',
          message_type: 'text',
          created_at: '2024-01-01T11:00:00Z',
          sender: { first_name: 'Jane', last_name: 'Smith' },
        },
      ];

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: mockMessages, error: null }),
      };
      
      supabase.from.mockReturnValue(mockChain);

      const result = await MessagingService.getJobMessages('job-1');

      expect(supabase.from).toHaveBeenCalledWith('messages');
      expect(result).toHaveLength(2);
      expect(result[0].messageText).toBe('Second message'); // Reversed order
      expect(result[1].messageText).toBe('First message');
    });
  });

  describe('formatMessage', () => {
    it('should format message data correctly', () => {
      const rawData = {
        id: 'msg-1',
        job_id: 'job-1',
        sender_id: 'user-1',
        receiver_id: 'user-2',
        message_text: 'Test message',
        message_type: 'text',
        read: false,
        created_at: '2024-01-01T10:00:00Z',
        sender: {
          first_name: 'John',
          last_name: 'Contractor',
          role: 'contractor',
        },
      };

      // Access private formatMessage method for testing
      const formatMessage = (MessagingService as any).formatMessage;
      const result = formatMessage(rawData);

      expect(result.id).toBe('msg-1');
      expect(result.jobId).toBe('job-1');
      expect(result.messageText).toBe('Test message');
      expect(result.senderName).toBe('John Contractor');
      expect(result.read).toBe(false);
    });

    it('should handle missing sender data', () => {
      const rawData = {
        id: 'msg-1',
        job_id: 'job-1',
        message_text: 'Test message',
        message_type: 'text',
      };

      const formatMessage = (MessagingService as any).formatMessage;
      const result = formatMessage(rawData);

      expect(result.senderName).toBe('Unknown User');
      expect(result.id).toBe('msg-1');
    });
  });

  describe('subscriptions', () => {
    it('should set up real-time subscription', () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
      };

      supabase.channel.mockReturnValue(mockChannel);

      const unsubscribe = MessagingService.subscribeToJobMessages(
        'job-1',
        jest.fn(),
        jest.fn()
      );

      expect(supabase.channel).toHaveBeenCalledWith('messages:job_id=eq.job-1');
      expect(typeof unsubscribe).toBe('function');
    });

    it('should cleanup subscriptions', () => {
      // Mock a channel in activeChannels
      const mockChannel = { unsubscribe: jest.fn() };
      (MessagingService as any).activeChannels.set('test-job', mockChannel);
      
      MessagingService.cleanup();
      
      expect(mockChannel.unsubscribe).toHaveBeenCalled();
      expect((MessagingService as any).activeChannels.size).toBe(0);
    });
  });
});