// Mock logger first
jest.mock('@mintenance/shared', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Create reusable Supabase mock chain helper
const createMockChain = (resolvedValue) => {
  if (!resolvedValue) {
    resolvedValue = { data: null, error: null };
  }
  const chain = {
    select: jest.fn(() => chain),
    insert: jest.fn(() => chain),
    update: jest.fn(() => chain),
    delete: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    in: jest.fn(() => chain),
    order: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    range: jest.fn(() => chain),
    upsert: jest.fn(() => chain),
    single: jest.fn(() => Promise.resolve(resolvedValue)),
    // For non-single queries (arrays)
    then: jest.fn((resolve) => {
      return Promise.resolve(resolvedValue).then(resolve);
    }),
  };
  return chain;
};

// Import REAL service (after mocks)
import { NotificationService } from '../NotificationService';
import { logger } from '@mintenance/shared';

describe('NotificationService', () => {
  let service;
  let mockSupabase;
  let mockFrom;

  beforeEach(() => {
    mockFrom = jest.fn(() => createMockChain());
    mockSupabase = {
      from: mockFrom,
    };

    service = new NotificationService({
      supabase: mockSupabase,
      environment: 'test',
    });

    jest.clearAllMocks();
  });

  describe('send()', () => {
    const mockUserId = 'user-123';
    const mockParams = {
      userId: mockUserId,
      type: 'job_posted',
      title: 'New Job Posted',
      message: 'A new job has been posted in your area',
      data: { jobId: 'job-456' },
      channels: ['push', 'email'],
    };

    const mockNotificationDb = {
      id: 'notif-123',
      user_id: mockUserId,
      type: 'job_posted',
      title: 'New Job Posted',
      message: 'A new job has been posted in your area',
      data: { jobId: 'job-456' },
      channels: ['push', 'email'],
      read: false,
      read_at: null,
      created_at: '2026-01-23T00:00:00Z',
    };

    it('should send notification with specified channels', async () => {
      const mockChain = createMockChain({ data: mockNotificationDb, error: null });
      mockFrom.mockReturnValue(mockChain);

      const result = await service.send(mockParams);

      expect(mockFrom).toHaveBeenCalledWith('notifications');
      expect(mockChain.insert).toHaveBeenCalledWith(expect.objectContaining({
        user_id: mockUserId,
        type: 'job_posted',
        title: 'New Job Posted',
        message: 'A new job has been posted in your area',
        channels: ['push', 'email'],
        read: false,
      }));
      expect(mockChain.select).toHaveBeenCalled();
      expect(mockChain.single).toHaveBeenCalled();
      expect(result).toMatchObject({
        id: 'notif-123',
        userId: mockUserId, // Converted from user_id
        type: 'job_posted',
        read: false,
      });
    });

    it('should get enabled channels from preferences when not specified', async () => {
      const paramsWithoutChannels = { ...mockParams, channels: undefined };
      const mockPreferences = {
        user_id: mockUserId,
        push: true,
        email: false,
        sms: false,
        in_app: true,
      };

      // First call: getEnabledChannels -> getPreferences
      // Second call: insert notification
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // getPreferences call
          return createMockChain({ data: mockPreferences, error: null });
        }
        // insert notification call
        return createMockChain({ data: mockNotificationDb, error: null });
      });

      await service.send(paramsWithoutChannels);

      // Should call from() twice: getPreferences + insert
      expect(mockFrom).toHaveBeenCalledTimes(2);
      expect(mockFrom).toHaveBeenNthCalledWith(1, 'notification_preferences');
      expect(mockFrom).toHaveBeenNthCalledWith(2, 'notifications');
    });

    it('should handle database error on insert', async () => {
      const dbError = new Error('Database connection failed');
      const mockChain = createMockChain({ data: null, error: dbError });
      mockFrom.mockReturnValue(mockChain);

      await expect(service.send(mockParams)).rejects.toMatchObject({
        code: expect.any(String),
        message: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    it('should convert snake_case to camelCase in response', async () => {
      const mockChain = createMockChain({ data: mockNotificationDb, error: null });
      mockFrom.mockReturnValue(mockChain);

      const result = await service.send(mockParams);

      expect(result.userId).toBe(mockUserId); // snake_case converted
      // readAt will be null (converted from read_at: null), not undefined
      expect(result.readAt).toBeNull();
      expect(result.createdAt).toBe('2026-01-23T00:00:00Z');
    });
  });

  describe('sendBulk()', () => {
    it('should send notifications to multiple users', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];
      const mockChain = createMockChain({ data: { id: 'notif-123' }, error: null });
      mockFrom.mockReturnValue(mockChain);

      await service.sendBulk(userIds, 'job_posted', 'Title', 'Message');

      // Should call from() for each user (once per send)
      expect(mockFrom).toHaveBeenCalled();
      // Note: Exact count depends on whether getEnabledChannels is called
    });

    it('should handle partial failures with Promise.allSettled', async () => {
      const userIds = ['user-1', 'user-2'];
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First user succeeds
          return createMockChain({ data: { id: 'notif-1' }, error: null });
        }
        // Second user fails
        return createMockChain({ data: null, error: new Error('Failed') });
      });

      // Should not throw - Promise.allSettled catches errors
      await service.sendBulk(userIds, 'job_posted', 'Title', 'Message');

      expect(mockFrom).toHaveBeenCalled();
    });
  });

  describe('getNotifications()', () => {
    const mockUserId = 'user-123';
    const mockNotifications = [
      { id: 'notif-1', user_id: mockUserId, read: false, created_at: '2026-01-23T00:00:00Z' },
      { id: 'notif-2', user_id: mockUserId, read: true, created_at: '2026-01-22T00:00:00Z' },
    ];

    it('should fetch all notifications for user', async () => {
      const mockChain = createMockChain({ data: mockNotifications, error: null });
      mockFrom.mockReturnValue(mockChain);

      const result = await service.getNotifications(mockUserId);

      expect(mockFrom).toHaveBeenCalledWith('notifications');
      expect(mockChain.select).toHaveBeenCalled();
      expect(mockChain.eq).toHaveBeenCalledWith('user_id', mockUserId);
      expect(mockChain.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result).toHaveLength(2);
    });

    it('should filter by unread only', async () => {
      const mockChain = createMockChain({ data: [mockNotifications[0]], error: null });
      mockFrom.mockReturnValue(mockChain);

      await service.getNotifications(mockUserId, { unreadOnly: true });

      expect(mockChain.eq).toHaveBeenCalledWith('user_id', mockUserId);
      expect(mockChain.eq).toHaveBeenCalledWith('read', false);
    });

    it('should filter by notification types', async () => {
      const mockChain = createMockChain({ data: mockNotifications, error: null });
      mockFrom.mockReturnValue(mockChain);

      await service.getNotifications(mockUserId, { types: ['job_posted', 'bid_received'] });

      expect(mockChain.in).toHaveBeenCalledWith('type', ['job_posted', 'bid_received']);
    });

    it('should apply limit', async () => {
      const mockChain = createMockChain({ data: mockNotifications, error: null });
      mockFrom.mockReturnValue(mockChain);

      await service.getNotifications(mockUserId, { limit: 10 });

      expect(mockChain.limit).toHaveBeenCalledWith(10);
    });

    it('should apply range for pagination', async () => {
      const mockChain = createMockChain({ data: mockNotifications, error: null });
      mockFrom.mockReturnValue(mockChain);

      await service.getNotifications(mockUserId, { offset: 20, limit: 10 });

      expect(mockChain.range).toHaveBeenCalledWith(20, 29); // offset to offset+limit-1
    });

    it('should convert snake_case to camelCase', async () => {
      const mockChain = createMockChain({ data: mockNotifications, error: null });
      mockFrom.mockReturnValue(mockChain);

      const result = await service.getNotifications(mockUserId);

      expect(result[0].userId).toBe(mockUserId);
      expect(result[0].createdAt).toBe('2026-01-23T00:00:00Z');
    });
  });

  describe('markAsRead()', () => {
    const notificationId = 'notif-123';

    it('should mark notification as read', async () => {
      const mockChain = createMockChain({ data: null, error: null });
      mockFrom.mockReturnValue(mockChain);

      await service.markAsRead(notificationId);

      expect(mockFrom).toHaveBeenCalledWith('notifications');
      expect(mockChain.update).toHaveBeenCalledWith(expect.objectContaining({
        read: true,
      }));
      expect(mockChain.eq).toHaveBeenCalledWith('id', notificationId);
      // markAsRead returns void, doesn't call select/single
    });

    it('should set read_at timestamp', async () => {
      const mockChain = createMockChain({ data: { read: true, read_at: '2026-01-23T00:00:00Z' }, error: null });
      mockFrom.mockReturnValue(mockChain);

      await service.markAsRead(notificationId);

      expect(mockChain.update).toHaveBeenCalledWith(expect.objectContaining({
        read_at: expect.any(String),
      }));
    });

    it('should handle not found error', async () => {
      const notFoundError = new Error('Not found');
      const mockChain = createMockChain({ data: null, error: notFoundError });
      mockFrom.mockReturnValue(mockChain);

      await expect(service.markAsRead(notificationId)).rejects.toMatchObject({
        code: expect.any(String),
        message: expect.any(String),
        timestamp: expect.any(String),
      });
    });
  });

  describe('markAllAsRead()', () => {
    const userId = 'user-123';

    it('should mark all unread notifications as read', async () => {
      const mockChain = createMockChain({ data: null, error: null });
      mockFrom.mockReturnValue(mockChain);

      await service.markAllAsRead(userId);

      expect(mockFrom).toHaveBeenCalledWith('notifications');
      expect(mockChain.update).toHaveBeenCalledWith(expect.objectContaining({
        read: true,
      }));
      expect(mockChain.eq).toHaveBeenCalledWith('user_id', userId);
      expect(mockChain.eq).toHaveBeenCalledWith('read', false);
    });

    it('should set read_at timestamp for all', async () => {
      const mockChain = createMockChain({ data: null, error: null });
      mockFrom.mockReturnValue(mockChain);

      await service.markAllAsRead(userId);

      expect(mockChain.update).toHaveBeenCalledWith(expect.objectContaining({
        read_at: expect.any(String),
      }));
    });
  });

  describe('deleteNotification()', () => {
    const notificationId = 'notif-123';

    it('should delete notification by id', async () => {
      const mockChain = createMockChain({ data: null, error: null });
      mockFrom.mockReturnValue(mockChain);

      await service.deleteNotification(notificationId);

      expect(mockFrom).toHaveBeenCalledWith('notifications');
      expect(mockChain.delete).toHaveBeenCalled();
      expect(mockChain.eq).toHaveBeenCalledWith('id', notificationId);
    });

    it('should handle database error', async () => {
      const dbError = new Error('Delete failed');
      const mockChain = createMockChain({ data: null, error: dbError });
      mockFrom.mockReturnValue(mockChain);

      await expect(service.deleteNotification(notificationId)).rejects.toMatchObject({
        code: expect.any(String),
        message: expect.any(String),
        timestamp: expect.any(String),
      });
    });
  });

  describe('getPreferences()', () => {
    const userId = 'user-123';

    it('should return user notification preferences', async () => {
      const mockPrefs = {
        user_id: userId,
        push: true,
        email: true,
        sms: false,
        in_app: true,
        job_updates: true,
        bid_updates: true,
        payment_updates: false,
        message_updates: true,
      };
      const mockChain = createMockChain({ data: mockPrefs, error: null });
      mockFrom.mockReturnValue(mockChain);

      const result = await service.getPreferences(userId);

      expect(mockFrom).toHaveBeenCalledWith('notification_preferences');
      expect(mockChain.select).toHaveBeenCalled();
      expect(mockChain.eq).toHaveBeenCalledWith('user_id', userId);
      expect(mockChain.single).toHaveBeenCalled();
      expect(result.userId).toBe(userId);
      expect(result.push).toBe(true);
      expect(result.inApp).toBe(true); // snake_case converted
    });

    it('should return default preferences when not found', async () => {
      const mockChain = createMockChain({ data: null, error: { code: 'PGRST116' } });
      mockFrom.mockReturnValue(mockChain);

      const result = await service.getPreferences(userId);

      expect(result).toMatchObject({
        userId,
        push: true,
        email: true,
        sms: false,
        inApp: true,
        jobUpdates: true,
        bidUpdates: true,
        paymentUpdates: true,
        messageUpdates: true,
      });
    });

    it('should convert snake_case to camelCase', async () => {
      const mockPrefs = {
        user_id: userId,
        in_app: true,
        job_updates: false,
        bid_updates: true,
        payment_updates: false,
        message_updates: true,
      };
      const mockChain = createMockChain({ data: mockPrefs, error: null });
      mockFrom.mockReturnValue(mockChain);

      const result = await service.getPreferences(userId);

      expect(result.inApp).toBe(true);
      expect(result.jobUpdates).toBe(false);
      expect(result.bidUpdates).toBe(true);
      expect(result.paymentUpdates).toBe(false);
      expect(result.messageUpdates).toBe(true);
    });
  });

  describe('updatePreferences()', () => {
    const userId = 'user-123';
    const preferences = {
      push: false,
      email: true,
      sms: false,
      jobUpdates: true,
    };

    it('should upsert notification preferences', async () => {
      const mockChain = createMockChain({ data: { user_id: userId, ...preferences }, error: null });
      mockFrom.mockReturnValue(mockChain);

      await service.updatePreferences(userId, preferences);

      expect(mockFrom).toHaveBeenCalledWith('notification_preferences');
      expect(mockChain.upsert).toHaveBeenCalledWith(expect.objectContaining({
        user_id: userId,
      }));
      expect(mockChain.select).toHaveBeenCalled();
      expect(mockChain.single).toHaveBeenCalled();
    });

    it('should convert camelCase to snake_case', async () => {
      const mockChain = createMockChain({ data: null, error: null });
      mockFrom.mockReturnValue(mockChain);

      await service.updatePreferences(userId, { inApp: false, jobUpdates: true });

      expect(mockChain.upsert).toHaveBeenCalledWith(expect.objectContaining({
        in_app: false,
        job_updates: true,
      }));
    });
  });

  describe('getUnreadCount()', () => {
    const userId = 'user-123';

    it('should return unread notification count', async () => {
      // For count queries, the resolved value should have 'count' property, not 'data'
      const mockChain = createMockChain({ count: 5, error: null });
      mockFrom.mockReturnValue(mockChain);

      const result = await service.getUnreadCount(userId);

      expect(mockFrom).toHaveBeenCalledWith('notifications');
      expect(mockChain.select).toHaveBeenCalledWith('*', { count: 'exact', head: true });
      expect(mockChain.eq).toHaveBeenCalledWith('user_id', userId);
      expect(mockChain.eq).toHaveBeenCalledWith('read', false);
      expect(result).toBe(5);
    });

    it('should return 0 when count is null', async () => {
      const mockChain = createMockChain({ count: null, error: null });
      mockFrom.mockReturnValue(mockChain);

      const result = await service.getUnreadCount(userId);

      expect(result).toBe(0);
    });

    it('should handle database error', async () => {
      const dbError = new Error('Count failed');
      const mockChain = createMockChain({ count: null, error: dbError });
      mockFrom.mockReturnValue(mockChain);

      await expect(service.getUnreadCount(userId)).rejects.toMatchObject({
        code: expect.any(String),
        message: expect.any(String),
        timestamp: expect.any(String),
      });
    });
  });
});
