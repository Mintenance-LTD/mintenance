/**
 * Legacy SQLite offline-queue drain shim (offline-consolidation Phase 1).
 *
 * The retirement plan for SyncManager's write path is gated on this shim:
 * it must (a) always measure + report both legacy stores, (b) drain any
 * residue into the canonical OfflineManager queue with correct field
 * mapping, (c) never delete a row before the canonical queue accepted it,
 * (d) never replay locally-verifiable foreign-account writes, and
 * (e) never break app start.
 */

const mockLocalDatabase = {
  init: jest.fn(),
  getOfflineActions: jest.fn(),
  getDirtyRecords: jest.fn(),
  removeOfflineAction: jest.fn(),
  markRecordSynced: jest.fn(),
};

const mockOfflineManager = {
  queueAction: jest.fn(),
};

jest.mock('../../LocalDatabase', () => ({
  LocalDatabase: mockLocalDatabase,
}));

jest.mock('../../OfflineManager', () => ({
  OfflineManager: mockOfflineManager,
}));

jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import {
  drainLegacySqliteQueue,
  __resetLegacyDrainForTests,
} from '../LegacyQueueDrain';
import { logger } from '../../../utils/logger';

const USER = 'user-1';

function legacyAction(
  overrides: Partial<{
    id: string;
    type: string;
    entity: string;
    data: string;
    retry_count: number;
    max_retries: number;
    query_key: string | null;
    created_at: number;
    synced_at: number | null;
  }> = {}
) {
  return {
    id: 'legacy-1',
    type: 'CREATE',
    entity: 'message',
    data: JSON.stringify({
      jobId: 'job-1',
      receiverId: 'user-2',
      messageText: 'hello from the past',
      senderId: USER,
    }),
    retry_count: 0,
    max_retries: 3,
    query_key: null,
    created_at: 1000,
    synced_at: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  __resetLegacyDrainForTests();
  mockLocalDatabase.init.mockResolvedValue(undefined);
  mockLocalDatabase.getOfflineActions.mockResolvedValue([]);
  mockLocalDatabase.getDirtyRecords.mockResolvedValue([]);
  mockLocalDatabase.removeOfflineAction.mockResolvedValue(undefined);
  mockLocalDatabase.markRecordSynced.mockResolvedValue(undefined);
  mockOfflineManager.queueAction.mockResolvedValue('new-action-id');
});

describe('drainLegacySqliteQueue', () => {
  it('MEASURES and reports even when both legacy stores are empty (Phase-0 telemetry)', async () => {
    const result = await drainLegacySqliteQueue(USER);

    expect(result.ran).toBe(true);
    expect(result.measured).toEqual({
      legacyActions: 0,
      dirtyUsers: 0,
      dirtyMessages: 0,
    });
    expect(result.drained).toBe(0);
    // The measurement log is the retirement gate — it must fire on zero.
    expect(logger.info).toHaveBeenCalledWith(
      '[LegacyQueueDrain] legacy store measurement',
      { legacyActions: 0, dirtyUsers: 0, dirtyMessages: 0 }
    );
    expect(mockOfflineManager.queueAction).not.toHaveBeenCalled();
    expect(mockLocalDatabase.removeOfflineAction).not.toHaveBeenCalled();
  });

  it('runs only once per launch', async () => {
    await drainLegacySqliteQueue(USER);
    const second = await drainLegacySqliteQueue(USER);

    expect(second.ran).toBe(false);
    expect(mockLocalDatabase.getOfflineActions).toHaveBeenCalledTimes(1);
  });

  it('does nothing without a signed-in user', async () => {
    const result = await drainLegacySqliteQueue('');
    expect(result.ran).toBe(false);
    expect(mockLocalDatabase.init).not.toHaveBeenCalled();
  });

  it('drains a legacy MESSAGE action with the messageText→message field mapping', async () => {
    mockLocalDatabase.getOfflineActions.mockResolvedValue([legacyAction()]);

    const result = await drainLegacySqliteQueue(USER);

    expect(mockOfflineManager.queueAction).toHaveBeenCalledWith({
      type: 'CREATE',
      entity: 'message',
      data: {
        jobId: 'job-1',
        receiverId: 'user-2',
        message: 'hello from the past', // mapped from legacy `messageText`
        senderId: USER,
      },
      maxRetries: 3,
    });
    expect(mockLocalDatabase.removeOfflineAction).toHaveBeenCalledWith(
      'legacy-1'
    );
    expect(result.drained).toBe(1);
  });

  it('deletes the SQLite row only AFTER queueAction resolves', async () => {
    const order: string[] = [];
    mockOfflineManager.queueAction.mockImplementation(async () => {
      order.push('queue');
      return 'id';
    });
    mockLocalDatabase.removeOfflineAction.mockImplementation(async () => {
      order.push('remove');
    });
    mockLocalDatabase.getOfflineActions.mockResolvedValue([legacyAction()]);

    await drainLegacySqliteQueue(USER);

    expect(order).toEqual(['queue', 'remove']);
  });

  it('leaves the row in place when queueAction fails (retry next launch)', async () => {
    mockOfflineManager.queueAction.mockRejectedValue(new Error('queue down'));
    mockLocalDatabase.getOfflineActions.mockResolvedValue([legacyAction()]);

    const result = await drainLegacySqliteQueue(USER);

    expect(mockLocalDatabase.removeOfflineAction).not.toHaveBeenCalled();
    expect(result.failed).toBe(1);
    expect(result.drained).toBe(0);
  });

  it('drops a legacy message from ANOTHER account without replaying it', async () => {
    mockLocalDatabase.getOfflineActions.mockResolvedValue([
      legacyAction({
        data: JSON.stringify({
          jobId: 'job-1',
          receiverId: 'user-2',
          messageText: 'not yours',
          senderId: 'someone-else',
        }),
      }),
    ]);

    const result = await drainLegacySqliteQueue(USER);

    expect(mockOfflineManager.queueAction).not.toHaveBeenCalled();
    expect(mockLocalDatabase.removeOfflineAction).toHaveBeenCalledWith(
      'legacy-1'
    );
    expect(result.dropped).toBe(1);
  });

  it('drains JOB actions as-is (server-side ownership is the backstop)', async () => {
    mockLocalDatabase.getOfflineActions.mockResolvedValue([
      legacyAction({
        id: 'legacy-job',
        entity: 'job',
        type: 'UPDATE',
        data: JSON.stringify({ jobId: 'job-9', status: 'in_progress' }),
      }),
    ]);

    const result = await drainLegacySqliteQueue(USER);

    expect(mockOfflineManager.queueAction).toHaveBeenCalledWith({
      type: 'UPDATE',
      entity: 'job',
      data: { jobId: 'job-9', status: 'in_progress' },
      maxRetries: 3,
    });
    expect(result.drained).toBe(1);
  });

  it('dead-letters corrupt JSON immediately', async () => {
    mockLocalDatabase.getOfflineActions.mockResolvedValue([
      legacyAction({ id: 'corrupt', data: '{not json' }),
    ]);

    const result = await drainLegacySqliteQueue(USER);

    expect(mockOfflineManager.queueAction).not.toHaveBeenCalled();
    expect(mockLocalDatabase.removeOfflineAction).toHaveBeenCalledWith(
      'corrupt'
    );
    expect(result.dropped).toBe(1);
  });

  it('drops unknown entities and unknown action types', async () => {
    mockLocalDatabase.getOfflineActions.mockResolvedValue([
      legacyAction({ id: 'weird-entity', entity: 'walrus' }),
      legacyAction({ id: 'weird-type', type: 'FROBNICATE' }),
    ]);

    const result = await drainLegacySqliteQueue(USER);

    expect(mockOfflineManager.queueAction).not.toHaveBeenCalled();
    expect(result.dropped).toBe(2);
  });

  it('replays actions oldest-first regardless of storage order', async () => {
    const calls: string[] = [];
    mockOfflineManager.queueAction.mockImplementation(
      async (a: { data: { message?: string } }) => {
        calls.push(a.data.message ?? '');
        return 'id';
      }
    );
    mockLocalDatabase.getOfflineActions.mockResolvedValue([
      legacyAction({
        id: 'newer',
        created_at: 2000,
        data: JSON.stringify({
          jobId: 'j',
          receiverId: 'r',
          messageText: 'second',
          senderId: USER,
        }),
      }),
      legacyAction({
        id: 'older',
        created_at: 1000,
        data: JSON.stringify({
          jobId: 'j',
          receiverId: 'r',
          messageText: 'first',
          senderId: USER,
        }),
      }),
    ]);

    await drainLegacySqliteQueue(USER);

    expect(calls).toEqual(['first', 'second']);
  });

  it("drains the current user's dirty profile row and clears the flag", async () => {
    mockLocalDatabase.getDirtyRecords.mockImplementation(
      async (table: string) =>
        table === 'users'
          ? [{ id: USER, email: 'me@test.com', first_name: 'Me' }]
          : []
    );

    const result = await drainLegacySqliteQueue(USER);

    expect(mockOfflineManager.queueAction).toHaveBeenCalledWith({
      type: 'UPDATE',
      entity: 'profile',
      data: {
        userId: USER,
        updates: { id: USER, email: 'me@test.com', first_name: 'Me' },
      },
      maxRetries: 3,
    });
    expect(mockLocalDatabase.markRecordSynced).toHaveBeenCalledWith(
      'users',
      USER
    );
    expect(result.drained).toBe(1);
  });

  it("abandons ANOTHER account's dirty profile row (cleared, never replayed)", async () => {
    mockLocalDatabase.getDirtyRecords.mockImplementation(
      async (table: string) =>
        table === 'users' ? [{ id: 'other-user', email: 'x@test.com' }] : []
    );

    const result = await drainLegacySqliteQueue(USER);

    expect(mockOfflineManager.queueAction).not.toHaveBeenCalled();
    expect(mockLocalDatabase.markRecordSynced).toHaveBeenCalledWith(
      'users',
      'other-user'
    );
    expect(result.dropped).toBe(1);
  });

  it('drains dirty message rows with snake_case→camelCase mapping', async () => {
    mockLocalDatabase.getDirtyRecords.mockImplementation(
      async (table: string) =>
        table === 'messages'
          ? [
              {
                id: 'msg-1',
                job_id: 'job-1',
                sender_id: USER,
                receiver_id: 'user-2',
                message_text: 'dirty row text',
              },
            ]
          : []
    );

    const result = await drainLegacySqliteQueue(USER);

    expect(mockOfflineManager.queueAction).toHaveBeenCalledWith({
      type: 'CREATE',
      entity: 'message',
      data: {
        jobId: 'job-1',
        receiverId: 'user-2',
        message: 'dirty row text',
        senderId: USER,
      },
      maxRetries: 3,
    });
    expect(mockLocalDatabase.markRecordSynced).toHaveBeenCalledWith(
      'messages',
      'msg-1'
    );
    expect(result.drained).toBe(1);
  });

  it('never throws when the database layer crashes (app start must survive)', async () => {
    mockLocalDatabase.init.mockRejectedValue(new Error('sqlite exploded'));

    await expect(drainLegacySqliteQueue(USER)).resolves.toMatchObject({
      ran: true,
      drained: 0,
    });
    expect(logger.error).toHaveBeenCalledWith(
      '[LegacyQueueDrain] drain crashed — will retry next launch',
      expect.any(Error)
    );
  });
});
