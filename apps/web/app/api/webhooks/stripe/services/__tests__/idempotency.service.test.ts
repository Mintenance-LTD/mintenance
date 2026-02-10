// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockFrom, mockLoggerInfo, mockLoggerWarn, mockLoggerError } =
  vi.hoisted(() => ({
    mockFrom: vi.fn(),
    mockLoggerInfo: vi.fn(),
    mockLoggerWarn: vi.fn(),
    mockLoggerError: vi.fn(),
  }));

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mockFrom },
}));

vi.mock('@mintenance/shared', () => ({
  logger: {
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: mockLoggerError,
  },
}));

import { IdempotencyService } from '../idempotency.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function chainable(
  terminalValue: { data: unknown; error: unknown } = {
    data: null,
    error: null,
  }
) {
  const chain: Record<string, any> = {};
  const methods = ['select', 'insert', 'delete', 'eq', 'lt', 'single'];
  for (const m of methods) {
    if (m === 'single') {
      chain[m] = vi.fn().mockResolvedValue(terminalValue);
    } else if (m === 'insert' || m === 'delete') {
      chain[m] = vi.fn().mockReturnValue({
        ...chain,
        select: vi.fn().mockReturnValue({
          ...chain,
          // For delete().eq().lt().select('id')
        }),
        error: terminalValue.error,
        data: terminalValue.data,
      });
    } else {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
  }
  return chain;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('IdempotencyService', () => {
  let service: IdempotencyService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new IdempotencyService();
  });

  describe('isEventProcessed', () => {
    it('should return true when event exists in webhook_events', async () => {
      const chain = chainable({
        data: { id: 'row-1' },
        error: null,
      });
      mockFrom.mockReturnValue(chain);

      const result = await service.isEventProcessed('evt_123');

      expect(result).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith('webhook_events');
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'Skipping duplicate webhook event',
        expect.objectContaining({ eventId: 'evt_123' })
      );
    });

    it('should return false when event does not exist (PGRST116)', async () => {
      const chain = chainable({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });
      mockFrom.mockReturnValue(chain);

      const result = await service.isEventProcessed('evt_new');

      expect(result).toBe(false);
    });

    it('should return false on unexpected database error (fail open)', async () => {
      const chain = chainable({
        data: null,
        error: { code: '500', message: 'Connection error' },
      });
      mockFrom.mockReturnValue(chain);

      const result = await service.isEventProcessed('evt_error');

      expect(result).toBe(false);
      expect(mockLoggerError).toHaveBeenCalledWith(
        'Failed to check event idempotency',
        expect.objectContaining({ eventId: 'evt_error' })
      );
    });

    it('should return false on thrown exception (fail open)', async () => {
      mockFrom.mockImplementation(() => {
        throw new Error('Network timeout');
      });

      const result = await service.isEventProcessed('evt_crash');

      expect(result).toBe(false);
      expect(mockLoggerError).toHaveBeenCalledWith(
        'Idempotency check failed',
        expect.objectContaining({ eventId: 'evt_crash' })
      );
    });
  });

  describe('recordEventProcessed', () => {
    it('should insert event record into webhook_events', async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      mockFrom.mockReturnValue({ insert: insertMock });

      await service.recordEventProcessed(
        'evt_456',
        'payment_intent.succeeded',
        { id: 'pi_test' }
      );

      expect(mockFrom).toHaveBeenCalledWith('webhook_events');
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          event_id: 'evt_456',
          event_type: 'payment_intent.succeeded',
          provider: 'stripe',
          data: { id: 'pi_test' },
        })
      );
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'Webhook event recorded',
        expect.objectContaining({ eventId: 'evt_456' })
      );
    });

    it('should log error but not throw on insert failure', async () => {
      const insertMock = vi.fn().mockResolvedValue({
        error: { message: 'Unique constraint violation' },
      });
      mockFrom.mockReturnValue({ insert: insertMock });

      // Should NOT throw
      await expect(
        service.recordEventProcessed('evt_dup', 'charge.refunded', {})
      ).resolves.not.toThrow();

      expect(mockLoggerError).toHaveBeenCalledWith(
        'Failed to record processed event',
        expect.objectContaining({ eventId: 'evt_dup' })
      );
    });

    it('should handle thrown exceptions without propagating', async () => {
      mockFrom.mockImplementation(() => {
        throw new Error('DB unavailable');
      });

      await expect(
        service.recordEventProcessed('evt_fail', 'invoice.paid', {})
      ).resolves.not.toThrow();

      expect(mockLoggerError).toHaveBeenCalledWith(
        'Failed to record event processing',
        expect.objectContaining({ eventId: 'evt_fail' })
      );
    });
  });

  describe('cleanupOldEvents', () => {
    it('should delete events older than 30 days', async () => {
      const deleteMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: [{ id: '1' }, { id: '2' }],
              error: null,
            }),
          }),
        }),
      });
      mockFrom.mockReturnValue({ delete: deleteMock });

      await service.cleanupOldEvents();

      expect(mockFrom).toHaveBeenCalledWith('webhook_events');
      expect(deleteMock).toHaveBeenCalled();
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'Cleaned up old webhook events',
        expect.objectContaining({ count: 2 })
      );
    });

    it('should log error on cleanup failure', async () => {
      const deleteMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Permission denied' },
            }),
          }),
        }),
      });
      mockFrom.mockReturnValue({ delete: deleteMock });

      await service.cleanupOldEvents();

      expect(mockLoggerError).toHaveBeenCalledWith(
        'Failed to cleanup old webhook events',
        expect.objectContaining({
          error: 'Permission denied',
        })
      );
    });
  });
});
