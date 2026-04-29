// Import the REAL MessagingService (not mocked) - we want to test the actual implementation
import {
  MessagingService,
  Message,
  MessageThread,
} from '../../services/MessagingService';
import { mobileApiClient } from '../../utils/mobileApiClient';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Auto-mock mobileApiClient (picks up __mocks__/mobileApiClient.ts).
// Audit step 5+10 (2026-04-29): MessagingService.sendMessage and
// .getJobMessages now route through the web API rather than direct
// Supabase, so the API client is the relevant mock surface.
jest.mock('../../utils/mobileApiClient');

// Supabase channel is still used for realtime subscriptions in
// MessagingService.subscribeToJobMessages — keep that part of the
// mock alive for the subscription tests further down.
jest.mock('../../config/supabase', () => ({
  supabase: {
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

// Mock RateLimiter — sendMessage gates on `checkRateLimit` before
// hitting the API; default to "allowed" so the happy-path tests
// don't 429 themselves.
jest.mock('../../middleware/RateLimiter', () => ({
  checkRateLimit: jest.fn(() => true),
}));

const { ServiceErrorHandler } = require('../../utils/serviceErrorHandler');
const { supabase } = require('../../config/supabase');
const mockedApiClient = mobileApiClient as jest.Mocked<typeof mobileApiClient>;

// Mock createMessageNotification to avoid implementation complexity
const mockCreateMessageNotification = jest.fn().mockResolvedValue(undefined);
(MessagingService as any).createMessageNotification =
  mockCreateMessageNotification;

describe('MessagingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear active channels before each test
    (MessagingService as any).activeChannels.clear();
  });

  describe('sendMessage', () => {
    it('should send a text message successfully', async () => {
      // The route returns the same camelCase Message shape; we
      // just need to verify the service unwraps `response.message`.
      mockedApiClient.post.mockResolvedValue({
        message: {
          id: 'msg-1',
          jobId: 'job-1',
          senderId: 'user-1',
          receiverId: 'user-2',
          messageText: 'Hello, I can help with this job!',
          messageType: 'text',
          read: false,
          createdAt: '2024-01-01T10:00:00Z',
          senderName: 'John Contractor',
        },
      });

      const result = await MessagingService.sendMessage(
        'job-1',
        'user-2',
        'Hello, I can help with this job!',
        'user-1'
      );

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/api/messages/threads/job-1/messages',
        expect.objectContaining({
          content: 'Hello, I can help with this job!',
          receiverId: 'user-2',
          messageType: 'text',
        })
      );
      expect(result.id).toBe('msg-1');
      expect(result.messageText).toBe('Hello, I can help with this job!');
      expect(result.senderName).toBe('John Contractor');
    });

    it('should handle message sending errors', async () => {
      mockedApiClient.post.mockRejectedValue(new Error('Database error'));

      await expect(
        MessagingService.sendMessage(
          'job-1',
          'user-2',
          'Test message',
          'user-1'
        )
      ).rejects.toThrow('Database error');
    });

    it('should send message with attachment', async () => {
      mockedApiClient.post.mockResolvedValue({
        message: {
          id: 'msg-2',
          jobId: 'job-1',
          senderId: 'user-1',
          receiverId: 'user-2',
          messageText: 'Here is the photo',
          messageType: 'image',
          attachmentUrl: 'https://example.com/image.jpg',
          read: false,
          createdAt: '2024-01-01T10:00:00Z',
        },
      });

      const result = await MessagingService.sendMessage(
        'job-1',
        'user-2',
        'Here is the photo',
        'user-1',
        'image',
        'https://example.com/image.jpg'
      );

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/api/messages/threads/job-1/messages',
        expect.objectContaining({
          messageType: 'image',
          attachments: ['https://example.com/image.jpg'],
        })
      );
      expect(result.messageType).toBe('image');
      expect(result.attachmentUrl).toBe('https://example.com/image.jpg');
    });
  });

  describe('getJobMessages', () => {
    it('should retrieve messages for a job', async () => {
      // The route already maps to camelCase Message[], so the
      // service is just an envelope unwrap. Order is ascending
      // (server-side `.order('created_at', { ascending: true })`).
      mockedApiClient.get.mockResolvedValue({
        messages: [
          {
            id: 'msg-1',
            jobId: 'job-1',
            senderId: 'user-1',
            receiverId: 'user-2',
            messageText: 'First message',
            messageType: 'text',
            read: false,
            createdAt: '2024-01-01T10:00:00Z',
            senderName: 'John Doe',
          },
          {
            id: 'msg-2',
            jobId: 'job-1',
            senderId: 'user-2',
            receiverId: 'user-1',
            messageText: 'Second message',
            messageType: 'text',
            read: false,
            createdAt: '2024-01-01T11:00:00Z',
            senderName: 'Jane Smith',
          },
        ],
      });

      const result = await MessagingService.getJobMessages('job-1');

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        '/api/messages/threads/job-1/messages'
      );
      expect(result).toHaveLength(2);
      expect(result[0].messageText).toBe('First message');
      expect(result[1].messageText).toBe('Second message');
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
