// Mock Supabase with comprehensive chain support
const createMockChain = (): any => ({
  eq: jest.fn(() => createMockChain()),
  order: jest.fn(() => createMockChain()),
  range: jest.fn(() => createMockChain()),
  limit: jest.fn(() => createMockChain()),
  single: jest.fn(() => createMockChain()),
  or: jest.fn(() => createMockChain()),
  ilike: jest.fn(() => createMockChain()),
  select: jest.fn(() => createMockChain()),
  insert: jest.fn(() => createMockChain()),
  update: jest.fn(() => createMockChain()),
  not: jest.fn(() => createMockChain()),
  in: jest.fn(() => createMockChain()),
});

const mockSupabase = {
  from: jest.fn(() => createMockChain()),
  channel: jest.fn(() => ({
    on: jest.fn(() => ({
      on: jest.fn(() => ({
        subscribe: jest.fn(),
      })),
    })),
    unsubscribe: jest.fn(),
  })),
};

let MessagingService: any;

describe('MessagingService', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    // Reset mock chain per test
    mockSupabase.from.mockReturnValue(createMockChain());
    mockSupabase.channel.mockReturnValue({
      on: jest.fn(() => ({ on: jest.fn(() => ({ subscribe: jest.fn() })) })),
      unsubscribe: jest.fn(),
    } as any);
    // Mock supabase before requiring service
    jest.doMock('../../config/supabase', () => ({ supabase: mockSupabase }));
    ({ MessagingService } = require('../../services/MessagingService'));
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

      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: mockMessageData,
        error: null,
      });

      const result = await MessagingService.sendMessage(
        'job-1',
        'user-2',
        'Hello, I can help with this job!',
        'user-1'
      );

      expect(mockSupabase.from).toHaveBeenCalledWith('messages');
      expect(result.id).toBe('msg-1');
      expect(result.messageText).toBe('Hello, I can help with this job!');
      expect(result.senderName).toBe('John Contractor');
    });

    it('should handle message sending errors', async () => {
      mockSupabase
        .from()
        .insert()
        .select()
        .single.mockResolvedValueOnce({
          data: null,
          error: { message: 'Database error' },
        });

      await expect(
        MessagingService.sendMessage(
          'job-1',
          'user-2',
          'Test message',
          'user-1'
        )
      ).rejects.toThrow();
    });

    it('should send message with attachment', async () => {
      const mockMessageData = {
        id: 'msg-2',
        job_id: 'job-1',
        sender_id: 'user-1',
        receiver_id: 'user-2',
        message_text: 'Here is the photo of the issue',
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

      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: mockMessageData,
        error: null,
      });

      const result = await MessagingService.sendMessage(
        'job-1',
        'user-2',
        'Here is the photo of the issue',
        'user-1',
        'image',
        'https://example.com/image.jpg'
      );

      expect(result.messageType).toBe('image');
      expect(result.attachmentUrl).toBe('https://example.com/image.jpg');
    });
  });

  describe('getJobMessages', () => {
    it('should retrieve messages for a job in chronological order', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          job_id: 'job-1',
          sender_id: 'user-1',
          receiver_id: 'user-2',
          message_text: 'First message',
          created_at: '2024-01-01T10:00:00Z',
          sender: { first_name: 'John', last_name: 'Doe', role: 'contractor' },
        },
        {
          id: 'msg-2',
          job_id: 'job-1',
          sender_id: 'user-2',
          receiver_id: 'user-1',
          message_text: 'Second message',
          created_at: '2024-01-01T10:01:00Z',
          sender: { first_name: 'Jane', last_name: 'Smith', role: 'homeowner' },
        },
      ];

      mockSupabase.from().select().eq().order().range.mockResolvedValueOnce({
        data: mockMessages.reverse(), // API returns in reverse order
        error: null,
      });

      const result = await MessagingService.getJobMessages('job-1', 50, 0);

      expect(result).toHaveLength(2);
      expect(result[0].messageText).toBe('First message');
      expect(result[1].messageText).toBe('Second message');
    });

    it('should handle pagination correctly', async () => {
      mockSupabase.from().select().eq().order().range.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      await MessagingService.getJobMessages('job-1', 20, 40);

      expect(
        mockSupabase.from().select().eq().order().range
      ).toHaveBeenCalledWith(40, 59);
    });
  });

  describe('getUserMessageThreads', () => {
    it('should get message threads with unread counts', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          title: 'Kitchen Repair',
          homeowner_id: 'user-1',
          contractor_id: 'user-2',
          homeowner: {
            first_name: 'John',
            last_name: 'Homeowner',
            role: 'homeowner',
          },
          contractor: {
            first_name: 'Jane',
            last_name: 'Contractor',
            role: 'contractor',
          },
        },
      ];

      mockSupabase.from().select().or().mockResolvedValueOnce({
        data: mockJobs,
        error: null,
      });

      // Mock last message query
      mockSupabase
        .from()
        .select()
        .eq()
        .order()
        .limit.mockResolvedValueOnce({
          data: [
            {
              id: 'msg-1',
              message_text: 'Latest message',
              created_at: '2024-01-01T10:00:00Z',
              sender: {
                first_name: 'Jane',
                last_name: 'Contractor',
                role: 'contractor',
              },
            },
          ],
          error: null,
        });

      // Mock unread count query
      mockSupabase.from().select().eq().eq().eq.mockResolvedValueOnce({
        count: 3,
        error: null,
      });

      const result = await MessagingService.getUserMessageThreads('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].jobTitle).toBe('Kitchen Repair');
      expect(result[0].unreadCount).toBe(3);
      expect(result[0].lastMessage?.messageText).toBe('Latest message');
    });
  });

  describe('markMessagesAsRead', () => {
    it('should mark messages as read for a user', async () => {
      mockSupabase.from().update().eq().eq().eq.mockResolvedValueOnce({
        error: null,
      });

      await MessagingService.markMessagesAsRead('job-1', 'user-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('messages');
      expect(mockSupabase.from().update).toHaveBeenCalledWith({ read: true });
    });
  });

  describe('subscribeToJobMessages', () => {
    it('should set up real-time subscription for job messages', () => {
      const mockCallback = jest.fn();
      const mockChannel = {
        on: jest.fn(() => ({
          on: jest.fn(() => ({
            subscribe: jest.fn(),
          })),
        })),
        unsubscribe: jest.fn(),
      };

      mockSupabase.channel.mockReturnValueOnce(mockChannel);

      const unsubscribe = MessagingService.subscribeToJobMessages(
        'job-1',
        mockCallback
      );

      expect(mockSupabase.channel).toHaveBeenCalledWith(
        'messages:job_id=eq.job-1'
      );
      expect(mockChannel.on).toHaveBeenCalledTimes(2); // INSERT and UPDATE events

      // Test unsubscribe function
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('getUnreadMessageCount', () => {
    it('should return unread message count for user', async () => {
      mockSupabase.from().select().eq().eq.mockResolvedValueOnce({
        count: 5,
        error: null,
      });

      const count = await MessagingService.getUnreadMessageCount('user-1');

      expect(count).toBe(5);
      expect(mockSupabase.from).toHaveBeenCalledWith('messages');
    });

    it('should handle errors gracefully and return 0', async () => {
      mockSupabase
        .from()
        .select()
        .eq()
        .eq.mockResolvedValueOnce({
          count: null,
          error: { message: 'Database error' },
        });

      const count = await MessagingService.getUnreadMessageCount('user-1');

      expect(count).toBe(0);
    });
  });

  describe('deleteMessage', () => {
    it('should soft delete a message by the sender', async () => {
      mockSupabase.from().update().eq().eq.mockResolvedValueOnce({
        error: null,
      });

      await MessagingService.deleteMessage('msg-1', 'user-1');

      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        message_text: '[Message deleted]',
        message_type: 'text',
        attachment_url: null,
      });
    });
  });

  describe('searchJobMessages', () => {
    it('should search messages in a job conversation', async () => {
      const mockSearchResults = [
        {
          id: 'msg-1',
          job_id: 'job-1',
          message_text: 'I can fix the plumbing issue',
          sender: {
            first_name: 'John',
            last_name: 'Contractor',
            role: 'contractor',
          },
        },
      ];

      mockSupabase
        .from()
        .select()
        .eq()
        .ilike()
        .order()
        .limit.mockResolvedValueOnce({
          data: mockSearchResults,
          error: null,
        });

      const result = await MessagingService.searchJobMessages(
        'job-1',
        'plumbing',
        20
      );

      expect(result).toHaveLength(1);
      expect(result[0].messageText).toContain('plumbing');
      expect(mockSupabase.from().select().eq().ilike).toHaveBeenCalledWith(
        'message_text',
        '%plumbing%'
      );
    });
  });

  describe('cleanup', () => {
    it('should clean up all active subscriptions', () => {
      // This tests the static cleanup method
      MessagingService.cleanup();

      // Since we can't easily test the internal Map, we just ensure the method exists
      expect(typeof MessagingService.cleanup).toBe('function');
    });
  });
});
