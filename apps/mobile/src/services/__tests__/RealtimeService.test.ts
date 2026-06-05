/**
 * RealtimeService unit tests.
 *
 * Strategy: the unit under test (RealtimeService) is NEVER mocked. Only
 * externals are mocked:
 *   - `../../config/supabase` — a controllable channel/client mock that lets us
 *     capture the registered `postgres_changes` handler and the subscribe-status
 *     callback, then invoke them by hand to drive every event branch.
 *   - `../../utils/logger` — jest.fn spies so we can assert error/warn paths.
 *
 * NODE_ENV is normally `test`, which makes `isSimpleMode()` true (pass-through,
 * no snake/camel conversion). Several tests temporarily flip NODE_ENV away from
 * `test` to exercise the non-simple-mode conversion + topic-name branches.
 */

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Controllable channel + client mock
// ---------------------------------------------------------------------------
interface CapturedHandler {
  event: string;
  filter: Record<string, unknown>;
  cb: (payload: unknown) => void;
}

class MockChannel {
  public topic: string;
  public state: string = 'joined';
  public handlers: CapturedHandler[] = [];
  public statusCb?: (status: string, reason?: unknown) => void;

  // toggles to force error paths
  public onShouldThrow = false;
  public subscribeShouldThrow = false;
  public subscribeNoArgShouldThrow = false;
  public unsubscribeShouldThrow = false;
  public sendShouldReject = false;
  public unsubscribeReturnsPromise = false;
  public unsubscribeRejects = false;

  public on = jest.fn(
    (
      event: string,
      filter: Record<string, unknown>,
      cb: (payload: unknown) => void
    ) => {
      if (this.onShouldThrow) throw new Error('on() boom');
      this.handlers.push({
        event: (filter as { event?: string }).event ?? event,
        filter,
        cb,
      });
      return this;
    }
  );

  public subscribe = jest.fn(
    (cb?: (status: string, reason?: unknown) => void) => {
      if (cb === undefined) {
        // no-arg fallback invocation
        if (this.subscribeNoArgShouldThrow)
          throw new Error('no-arg subscribe boom');
        return this;
      }
      if (this.subscribeShouldThrow) throw new Error('subscribe(cb) boom');
      this.statusCb = cb;
      return this;
    }
  );

  public unsubscribe = jest.fn(() => {
    if (this.unsubscribeShouldThrow) throw new Error('unsubscribe boom');
    if (this.unsubscribeReturnsPromise) {
      if (this.unsubscribeRejects) {
        const p = Promise.reject(new Error('async unsub fail'));
        // Pre-attach a swallow handler so a missed `.catch` by a caller (e.g.
        // unsubscribeAll, which does not handle promise returns) can never
        // surface as an unhandled rejection and crash the test process. The
        // production `cleanup()` attaches its own independent `.catch`, which
        // still fires for the assertion under test.
        p.catch(() => undefined);
        return p;
      }
      return Promise.resolve('ok');
    }
    return undefined;
  });

  public send = jest.fn(async (_payload: Record<string, unknown>) => {
    if (this.sendShouldReject) throw new Error('send boom');
  });

  /** Helper: fire the first registered postgres_changes handler. */
  public emit(payload: unknown): void {
    this.handlers[0].cb(payload);
  }
}

// Registry shared with the mock factory below.
const channelRegistry: MockChannel[] = [];
let nextChannelOverride: MockChannel | null = null;

const mockChannelFn = jest.fn((topic: string) => {
  const ch = nextChannelOverride ?? new MockChannel();
  ch.topic = topic;
  nextChannelOverride = null;
  channelRegistry.push(ch);
  return ch;
});

const mockRemoveChannel = jest.fn();
const mockGetChannels = jest.fn(() => channelRegistry as unknown[]);

jest.mock('../../config/supabase', () => ({
  supabase: {
    channel: (topic: string) => mockChannelFn(topic),
    removeChannel: (ch: unknown) => mockRemoveChannel(ch),
    getChannels: () => mockGetChannels(),
  },
}));

import { RealtimeService } from '../RealtimeService';
import { logger } from '../../utils/logger';

const mockedLogger = logger as unknown as {
  info: jest.Mock;
  error: jest.Mock;
  warn: jest.Mock;
  debug: jest.Mock;
};

/** Grab the most-recently-created MockChannel. */
function lastChannel(): MockChannel {
  return channelRegistry[channelRegistry.length - 1];
}

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

beforeEach(() => {
  jest.clearAllMocks();
  channelRegistry.length = 0;
  nextChannelOverride = null;
  process.env.NODE_ENV = 'test';
  RealtimeService.unsubscribeAll();
  jest.clearAllMocks(); // clear the unsubscribe spies fired during reset
});

afterAll(() => {
  process.env.NODE_ENV = ORIGINAL_NODE_ENV;
});

// ===========================================================================
// subscribeToMessages
// ===========================================================================
describe('subscribeToMessages', () => {
  it('registers an INSERT postgres_changes handler and a status handler', () => {
    const cb = jest.fn();
    RealtimeService.subscribeToMessages('job-1', cb);

    const ch = lastChannel();
    expect(mockChannelFn).toHaveBeenCalledWith('messages:job-1');
    expect(ch.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'INSERT',
        table: 'messages',
        filter: 'job_id=eq.job-1',
      }),
      expect.any(Function)
    );
    expect(ch.subscribe).toHaveBeenCalled();
  });

  it('dispatches the new row to the callback (simple mode pass-through)', () => {
    const cb = jest.fn();
    RealtimeService.subscribeToMessages('job-1', cb);
    const row = { id: 'm1', job_id: 'job-1', message_text: 'hi' };
    lastChannel().emit({ new: row });
    expect(cb).toHaveBeenCalledWith(row);
  });

  it('converts snake_case to camelCase when NOT in simple mode', () => {
    process.env.NODE_ENV = 'production';
    const cb = jest.fn();
    RealtimeService.subscribeToMessages('job-2', cb);
    lastChannel().emit({
      new: {
        id: 'm2',
        job_id: 'job-2',
        sender_id: 's',
        receiver_id: 'r',
        created_at: 'now',
        is_read: false,
        message_text: 'fallback text',
      },
    });
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'm2',
        jobId: 'job-2',
        senderId: 's',
        receiverId: 'r',
        createdAt: 'now',
        isRead: false,
        content: 'fallback text', // content ?? message_text fallback
      })
    );
  });

  it('routes payload.error to the errorHandler and skips the callback', () => {
    const cb = jest.fn();
    const errorHandler = jest.fn();
    RealtimeService.subscribeToMessages('job-3', cb, errorHandler);
    lastChannel().emit({ error: new Error('feed error') });
    expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
    expect(cb).not.toHaveBeenCalled();
  });

  it('warns instead of throwing when the consumer callback throws', () => {
    const cb = jest.fn(() => {
      throw new Error('consumer boom');
    });
    RealtimeService.subscribeToMessages('job-4', cb);
    expect(() => lastChannel().emit({ new: { id: 'x' } })).not.toThrow();
    expect(mockedLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('callback threw in subscribeToMessages'),
      expect.objectContaining({ error: expect.any(Error) })
    );
  });

  it('returns an unsubscribe fn that calls channel.unsubscribe', () => {
    const unsub = RealtimeService.subscribeToMessages('job-5', jest.fn());
    const ch = lastChannel();
    unsub();
    expect(ch.unsubscribe).toHaveBeenCalled();
  });
});

// ===========================================================================
// subscribeToJobUpdates
// ===========================================================================
describe('subscribeToJobUpdates', () => {
  it('uses the "job:<id>" topic in simple mode and registers UPDATE handler', () => {
    const cb = jest.fn();
    RealtimeService.subscribeToJobUpdates('job-1', cb);
    expect(mockChannelFn).toHaveBeenCalledWith('job:job-1');
    const ch = lastChannel();
    expect(ch.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ event: 'UPDATE', table: 'jobs' }),
      expect.any(Function)
    );
  });

  it('dispatches new + old rows to callback', () => {
    const cb = jest.fn();
    RealtimeService.subscribeToJobUpdates('job-1', cb);
    lastChannel().emit({
      new: { id: 'job-1', status: 'a' },
      old: { id: 'job-1', status: 'b' },
    });
    expect(cb).toHaveBeenCalledWith(
      { id: 'job-1', status: 'a' },
      { id: 'job-1', status: 'b' }
    );
  });

  it('uses "jobs:<id>" topic + camel conversion outside simple mode', () => {
    process.env.NODE_ENV = 'production';
    const cb = jest.fn();
    RealtimeService.subscribeToJobUpdates('job-9', cb);
    expect(mockChannelFn).toHaveBeenCalledWith('jobs:job-9');
    lastChannel().emit({
      new: {
        id: 'job-9',
        homeowner_id: 'h',
        contractor_id: 'c',
        created_at: 'x',
        updated_at: 'y',
      },
    });
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({
        homeownerId: 'h',
        contractorId: 'c',
        createdAt: 'x',
        updatedAt: 'y',
      }),
      undefined
    );
  });

  it('returns working unsubscribe', () => {
    const unsub = RealtimeService.subscribeToJobUpdates('j', jest.fn());
    const ch = lastChannel();
    unsub();
    expect(ch.unsubscribe).toHaveBeenCalled();
  });
});

// ===========================================================================
// subscribeToJobBids
// ===========================================================================
describe('subscribeToJobBids', () => {
  it('registers INSERT on bids filtered by job_id', () => {
    const cb = jest.fn();
    RealtimeService.subscribeToJobBids('job-1', cb);
    expect(mockChannelFn).toHaveBeenCalledWith('bids:job-1');
    expect(lastChannel().on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'INSERT',
        table: 'bids',
        filter: 'job_id=eq.job-1',
      }),
      expect.any(Function)
    );
  });

  it('dispatches new bid (pass-through in simple mode)', () => {
    const cb = jest.fn();
    RealtimeService.subscribeToJobBids('job-1', cb);
    const bid = { id: 'b1', job_id: 'job-1', amount: 100 };
    lastChannel().emit({ new: bid });
    expect(cb).toHaveBeenCalledWith(bid);
  });

  it('camel-converts bid outside simple mode', () => {
    process.env.NODE_ENV = 'production';
    const cb = jest.fn();
    RealtimeService.subscribeToJobBids('job-1', cb);
    lastChannel().emit({
      new: {
        id: 'b1',
        job_id: 'job-1',
        contractor_id: 'c1',
        amount: 50,
        description: 'd',
        status: 'pending',
        created_at: 't',
      },
    });
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: 'job-1',
        contractorId: 'c1',
        amount: 50,
        status: 'pending',
        createdAt: 't',
      })
    );
  });

  it('returns working unsubscribe', () => {
    const unsub = RealtimeService.subscribeToJobBids('j', jest.fn());
    const ch = lastChannel();
    unsub();
    expect(ch.unsubscribe).toHaveBeenCalled();
  });
});

// ===========================================================================
// subscribeToUserUpdates
// ===========================================================================
describe('subscribeToUserUpdates', () => {
  it('registers UPDATE on profiles and dispatches row (simple mode)', () => {
    const cb = jest.fn();
    RealtimeService.subscribeToUserUpdates('user-1', cb);
    expect(mockChannelFn).toHaveBeenCalledWith('profiles:user-1');
    const row = { id: 'user-1', first_name: 'Ada' };
    lastChannel().emit({ new: row });
    expect(cb).toHaveBeenCalledWith(row);
  });

  it('maps profile fields outside simple mode', () => {
    process.env.NODE_ENV = 'production';
    const cb = jest.fn();
    RealtimeService.subscribeToUserUpdates('user-1', cb);
    lastChannel().emit({
      new: {
        id: 'user-1',
        first_name: 'Ada',
        last_name: 'Lovelace',
        is_available: true,
      },
    });
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'Ada',
        lastName: 'Lovelace',
        isAvailable: true,
      })
    );
  });

  it('handles undefined new row without crashing (production mapping path)', () => {
    process.env.NODE_ENV = 'production';
    const cb = jest.fn();
    RealtimeService.subscribeToUserUpdates('user-2', cb);
    expect(() => lastChannel().emit({})).not.toThrow();
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: undefined,
        lastName: undefined,
        isAvailable: undefined,
      })
    );
  });

  it('returns working unsubscribe', () => {
    const unsub = RealtimeService.subscribeToUserUpdates('u', jest.fn());
    const ch = lastChannel();
    unsub();
    expect(ch.unsubscribe).toHaveBeenCalled();
  });
});

// ===========================================================================
// subscribeToContractorBids
// ===========================================================================
describe('subscribeToContractorBids', () => {
  it('uses simple-mode topic + INSERT filter by contractor_id', () => {
    const cb = jest.fn();
    RealtimeService.subscribeToContractorBids('c1', cb);
    expect(mockChannelFn).toHaveBeenCalledWith('bids:contractor_id=eq.c1');
    expect(lastChannel().on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ table: 'bids', filter: 'contractor_id=eq.c1' }),
      expect.any(Function)
    );
  });

  it('uses non-simple topic + dispatches camel bid', () => {
    process.env.NODE_ENV = 'production';
    const cb = jest.fn();
    RealtimeService.subscribeToContractorBids('c1', cb);
    expect(mockChannelFn).toHaveBeenCalledWith('bids:contractor:c1');
    lastChannel().emit({
      new: {
        id: 'b1',
        job_id: 'j',
        contractor_id: 'c1',
        amount: 1,
        description: '',
        status: 's',
        created_at: 't',
      },
    });
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ contractorId: 'c1' })
    );
  });

  it('returns working unsubscribe', () => {
    const unsub = RealtimeService.subscribeToContractorBids('c', jest.fn());
    const ch = lastChannel();
    unsub();
    expect(ch.unsubscribe).toHaveBeenCalled();
  });
});

// ===========================================================================
// subscribeToHomeownerJobs
// ===========================================================================
describe('subscribeToHomeownerJobs', () => {
  it('uses simple-mode topic + wildcard event', () => {
    const cb = jest.fn();
    RealtimeService.subscribeToHomeownerJobs('h1', cb);
    expect(mockChannelFn).toHaveBeenCalledWith('jobs:homeowner_id=eq.h1');
    expect(lastChannel().on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: '*',
        table: 'jobs',
        filter: 'homeowner_id=eq.h1',
      }),
      expect.any(Function)
    );
  });

  it('uses non-simple topic + dispatches camel job', () => {
    process.env.NODE_ENV = 'production';
    const cb = jest.fn();
    RealtimeService.subscribeToHomeownerJobs('h1', cb);
    expect(mockChannelFn).toHaveBeenCalledWith('jobs:homeowner:h1');
    lastChannel().emit({
      new: { id: 'j', homeowner_id: 'h1', created_at: 'x', updated_at: 'y' },
    });
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ homeownerId: 'h1' })
    );
  });

  it('returns working unsubscribe', () => {
    const unsub = RealtimeService.subscribeToHomeownerJobs('h', jest.fn());
    const ch = lastChannel();
    unsub();
    expect(ch.unsubscribe).toHaveBeenCalled();
  });
});

// ===========================================================================
// subscribeToAvailableJobs
// ===========================================================================
describe('subscribeToAvailableJobs', () => {
  it('uses simple-mode topic + posted filter', () => {
    const cb = jest.fn();
    RealtimeService.subscribeToAvailableJobs(cb);
    expect(mockChannelFn).toHaveBeenCalledWith('jobs:status=eq.posted');
    expect(lastChannel().on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'INSERT',
        table: 'jobs',
        filter: 'status=eq.posted',
      }),
      expect.any(Function)
    );
  });

  it('uses "jobs:available" topic + dispatches camel job outside simple mode', () => {
    process.env.NODE_ENV = 'production';
    const cb = jest.fn();
    RealtimeService.subscribeToAvailableJobs(cb);
    expect(mockChannelFn).toHaveBeenCalledWith('jobs:available');
    lastChannel().emit({
      new: { id: 'j', homeowner_id: 'h', created_at: 'x', updated_at: 'y' },
    });
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ homeownerId: 'h' })
    );
  });

  it('returns working unsubscribe', () => {
    const unsub = RealtimeService.subscribeToAvailableJobs(jest.fn());
    const ch = lastChannel();
    unsub();
    expect(ch.unsubscribe).toHaveBeenCalled();
  });
});

// ===========================================================================
// attachStatusHandler — status callback branches + fallbacks
// ===========================================================================
describe('attachStatusHandler status branches', () => {
  it('logs debug on SUBSCRIBED', () => {
    RealtimeService.subscribeToMessages('job-1', jest.fn());
    lastChannel().statusCb?.('SUBSCRIBED');
    expect(mockedLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Realtime subscription active')
    );
  });

  it('logs error on CHANNEL_ERROR', () => {
    RealtimeService.subscribeToMessages('job-1', jest.fn());
    lastChannel().statusCb?.('CHANNEL_ERROR', 'reason-x');
    expect(mockedLogger.error).toHaveBeenCalledWith(
      'Error subscribing to messages:',
      'reason-x'
    );
  });

  it('logs warn on TIMED_OUT', () => {
    RealtimeService.subscribeToMessages('job-1', jest.fn());
    lastChannel().statusCb?.('TIMED_OUT');
    expect(mockedLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('timed out')
    );
  });

  it('does nothing for unknown status', () => {
    RealtimeService.subscribeToMessages('job-1', jest.fn());
    mockedLogger.debug.mockClear();
    mockedLogger.error.mockClear();
    mockedLogger.warn.mockClear();
    lastChannel().statusCb?.('SOMETHING_ELSE');
    expect(mockedLogger.debug).not.toHaveBeenCalled();
    expect(mockedLogger.error).not.toHaveBeenCalled();
    expect(mockedLogger.warn).not.toHaveBeenCalled();
  });

  it('falls back to no-arg subscribe when subscribe(cb) throws', () => {
    const ch = new MockChannel();
    ch.subscribeShouldThrow = true;
    nextChannelOverride = ch;
    RealtimeService.subscribeToMessages('job-1', jest.fn());
    expect(mockedLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('falling back to no-arg subscribe'),
      expect.objectContaining({ error: expect.any(Error) })
    );
    // no-arg subscribe should have been attempted (2 calls total)
    expect(ch.subscribe).toHaveBeenCalledTimes(2);
  });

  it('logs error when both subscribe signatures fail', () => {
    const ch = new MockChannel();
    ch.subscribeShouldThrow = true;
    ch.subscribeNoArgShouldThrow = true;
    nextChannelOverride = ch;
    RealtimeService.subscribeToMessages('job-1', jest.fn());
    expect(mockedLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('both subscribe signatures failed'),
      expect.objectContaining({ fallbackError: expect.any(Error) })
    );
  });
});

// ===========================================================================
// safeUnsubscribe error path
// ===========================================================================
describe('safeUnsubscribe', () => {
  it('warns when channel.unsubscribe throws', () => {
    const ch = new MockChannel();
    ch.unsubscribeShouldThrow = true;
    nextChannelOverride = ch;
    const unsub = RealtimeService.subscribeToMessages('job-1', jest.fn());
    expect(() => unsub()).not.toThrow();
    expect(mockedLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'unsubscribe threw in subscribeToMessages(job-1)'
      ),
      expect.objectContaining({ error: expect.any(Error) })
    );
  });
});

// ===========================================================================
// send* broadcast methods
// ===========================================================================
describe('sendMessage / sendJobUpdate / sendBidUpdate', () => {
  it('sendMessage broadcasts payload', async () => {
    await RealtimeService.sendMessage('job-1', { id: 'm1' } as never);
    const ch = lastChannel();
    expect(ch.send).toHaveBeenCalledWith({
      type: 'broadcast',
      event: 'message',
      payload: { id: 'm1' },
    });
  });

  it('sendMessage rethrows + logs on send failure', async () => {
    const ch = new MockChannel();
    ch.sendShouldReject = true;
    nextChannelOverride = ch;
    await expect(
      RealtimeService.sendMessage('job-1', {} as never)
    ).rejects.toThrow('send boom');
    expect(mockedLogger.error).toHaveBeenCalledWith(
      'Error sending realtime message:',
      expect.any(Error)
    );
  });

  it('sendJobUpdate broadcasts payload', async () => {
    await RealtimeService.sendJobUpdate('job-1', { id: 'j1' } as never);
    expect(lastChannel().send).toHaveBeenCalledWith({
      type: 'broadcast',
      event: 'job_update',
      payload: { id: 'j1' },
    });
  });

  it('sendJobUpdate rethrows + logs on failure', async () => {
    const ch = new MockChannel();
    ch.sendShouldReject = true;
    nextChannelOverride = ch;
    await expect(
      RealtimeService.sendJobUpdate('job-1', {} as never)
    ).rejects.toThrow('send boom');
    expect(mockedLogger.error).toHaveBeenCalledWith(
      'Error sending job update:',
      expect.any(Error)
    );
  });

  it('sendBidUpdate broadcasts payload', async () => {
    await RealtimeService.sendBidUpdate('job-1', { id: 'b1' } as never);
    expect(lastChannel().send).toHaveBeenCalledWith({
      type: 'broadcast',
      event: 'bid_update',
      payload: { id: 'b1' },
    });
  });

  it('sendBidUpdate rethrows + logs on failure', async () => {
    const ch = new MockChannel();
    ch.sendShouldReject = true;
    nextChannelOverride = ch;
    await expect(
      RealtimeService.sendBidUpdate('job-1', {} as never)
    ).rejects.toThrow('send boom');
    expect(mockedLogger.error).toHaveBeenCalledWith(
      'Error sending bid update:',
      expect.any(Error)
    );
  });
});

// ===========================================================================
// unsubscribeFrom* removeChannel methods
// ===========================================================================
describe('unsubscribeFrom* (removeChannel)', () => {
  it('unsubscribeFromMessages removes the messages channel', () => {
    RealtimeService.unsubscribeFromMessages('job-1');
    expect(mockChannelFn).toHaveBeenCalledWith('messages:job-1');
    expect(mockRemoveChannel).toHaveBeenCalledWith(lastChannel());
  });

  it('unsubscribeFromJobUpdates removes the jobs channel', () => {
    RealtimeService.unsubscribeFromJobUpdates('job-1');
    expect(mockChannelFn).toHaveBeenCalledWith('jobs:job-1');
    expect(mockRemoveChannel).toHaveBeenCalled();
  });

  it('unsubscribeFromJobBids removes the bids channel', () => {
    RealtimeService.unsubscribeFromJobBids('job-1');
    expect(mockChannelFn).toHaveBeenCalledWith('bids:job-1');
    expect(mockRemoveChannel).toHaveBeenCalled();
  });

  it('unsubscribeFromUserUpdates removes the profiles channel', () => {
    RealtimeService.unsubscribeFromUserUpdates('user-1');
    expect(mockChannelFn).toHaveBeenCalledWith('profiles:user-1');
    expect(mockRemoveChannel).toHaveBeenCalled();
  });

  it('warns instead of throwing when channel() throws', () => {
    mockChannelFn.mockImplementationOnce(() => {
      throw new Error('channel boom');
    });
    expect(() =>
      RealtimeService.unsubscribeFromMessages('job-1')
    ).not.toThrow();
    expect(mockedLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('unsubscribeFromMessages(job-1) threw'),
      expect.objectContaining({ error: expect.any(Error) })
    );
  });

  it('warns when unsubscribeFromJobUpdates channel() throws', () => {
    mockChannelFn.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    expect(() => RealtimeService.unsubscribeFromJobUpdates('j')).not.toThrow();
    expect(mockedLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('unsubscribeFromJobUpdates(j) threw'),
      expect.objectContaining({ error: expect.any(Error) })
    );
  });

  it('warns when unsubscribeFromJobBids channel() throws', () => {
    mockChannelFn.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    expect(() => RealtimeService.unsubscribeFromJobBids('j')).not.toThrow();
    expect(mockedLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('unsubscribeFromJobBids(j) threw'),
      expect.objectContaining({ error: expect.any(Error) })
    );
  });

  it('warns when unsubscribeFromUserUpdates channel() throws', () => {
    mockChannelFn.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    expect(() => RealtimeService.unsubscribeFromUserUpdates('u')).not.toThrow();
    expect(mockedLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('unsubscribeFromUserUpdates(u) threw'),
      expect.objectContaining({ error: expect.any(Error) })
    );
  });
});

// ===========================================================================
// getChannelStatus
// ===========================================================================
describe('getChannelStatus', () => {
  it('reports total + active channel counts', () => {
    RealtimeService.subscribeToMessages('a', jest.fn());
    RealtimeService.subscribeToMessages('b', jest.fn());
    // mark one as not joined
    channelRegistry[0].state = 'closed';
    const status = RealtimeService.getChannelStatus();
    expect(status.totalChannels).toBe(2);
    expect(status.activeChannels).toBe(1);
    expect(status.channels).toHaveLength(2);
  });

  it('returns empty result + warns when getChannels throws', () => {
    mockGetChannels.mockImplementationOnce(() => {
      throw new Error('getChannels boom');
    });
    const status = RealtimeService.getChannelStatus();
    expect(status).toEqual({
      channels: [],
      totalChannels: 0,
      activeChannels: 0,
    });
    expect(mockedLogger.warn).toHaveBeenCalledWith(
      'RealtimeService: getChannelStatus threw',
      expect.objectContaining({ error: expect.any(Error) })
    );
  });

  it('falls back to [] when getChannels returns a falsy value', () => {
    mockGetChannels.mockImplementationOnce(
      () => undefined as unknown as unknown[]
    );
    const status = RealtimeService.getChannelStatus();
    expect(status).toEqual({
      channels: [],
      totalChannels: 0,
      activeChannels: 0,
    });
  });
});

// ===========================================================================
// cleanup
// ===========================================================================
describe('cleanup', () => {
  it('unsubscribes every channel returned by getChannels (sync return)', () => {
    RealtimeService.subscribeToMessages('a', jest.fn());
    RealtimeService.subscribeToMessages('b', jest.fn());
    RealtimeService.cleanup();
    channelRegistry.forEach((ch) => expect(ch.unsubscribe).toHaveBeenCalled());
  });

  it('handles a promise-returning unsubscribe and emits a sync warning', () => {
    const ch = new MockChannel();
    ch.unsubscribeReturnsPromise = true;
    nextChannelOverride = ch;
    RealtimeService.subscribeToMessages('a', jest.fn());
    RealtimeService.cleanup();
    expect(mockedLogger.warn).toHaveBeenCalledWith(
      'Error cleaning up realtime channels:',
      expect.any(Error)
    );
  });

  it('routes a rejected async unsubscribe to logger.warn', async () => {
    const ch = new MockChannel();
    ch.unsubscribeReturnsPromise = true;
    ch.unsubscribeRejects = true;
    nextChannelOverride = ch;
    RealtimeService.subscribeToMessages('a', jest.fn());
    RealtimeService.cleanup();
    await Promise.resolve();
    await Promise.resolve();
    expect(mockedLogger.warn).toHaveBeenCalledWith(
      'Error cleaning up realtime channels:',
      expect.any(Error)
    );
  });

  it('warns when a channel.unsubscribe throws synchronously', () => {
    const ch = new MockChannel();
    ch.unsubscribeShouldThrow = true;
    nextChannelOverride = ch;
    RealtimeService.subscribeToMessages('a', jest.fn());
    RealtimeService.cleanup();
    expect(mockedLogger.warn).toHaveBeenCalledWith(
      'Error cleaning up realtime channels:',
      expect.any(Error)
    );
  });

  it('warns when getChannels itself throws', () => {
    mockGetChannels.mockImplementationOnce(() => {
      throw new Error('outer boom');
    });
    RealtimeService.cleanup();
    expect(mockedLogger.warn).toHaveBeenCalledWith(
      'RealtimeService: cleanup threw',
      expect.objectContaining({ error: expect.any(Error) })
    );
  });

  it('no-ops gracefully when getChannels returns a falsy value', () => {
    mockGetChannels.mockImplementationOnce(
      () => undefined as unknown as unknown[]
    );
    expect(() => RealtimeService.cleanup()).not.toThrow();
  });
});

// ===========================================================================
// unsubscribeAll / getActiveSubscriptions
// ===========================================================================
describe('unsubscribeAll + getActiveSubscriptions', () => {
  it('tracks active subscriptions and clears them on unsubscribeAll', () => {
    RealtimeService.subscribeToMessages('a', jest.fn());
    RealtimeService.subscribeToJobBids('b', jest.fn());
    expect(RealtimeService.getActiveSubscriptions()).toBe(2);
    RealtimeService.unsubscribeAll();
    expect(RealtimeService.getActiveSubscriptions()).toBe(0);
  });

  it('unsubscribeAll invokes unsubscribe on each tracked channel', () => {
    RealtimeService.subscribeToMessages('a', jest.fn());
    const ch = lastChannel();
    RealtimeService.unsubscribeAll();
    expect(ch.unsubscribe).toHaveBeenCalled();
  });

  it('unsubscribeAll warns + still clears when an entry throws', () => {
    const ch = new MockChannel();
    ch.unsubscribeShouldThrow = true;
    nextChannelOverride = ch;
    RealtimeService.subscribeToMessages('a', jest.fn());
    RealtimeService.unsubscribeAll();
    expect(mockedLogger.warn).toHaveBeenCalledWith(
      'RealtimeService: unsubscribeAll entry threw',
      expect.objectContaining({ error: expect.any(Error) })
    );
    expect(RealtimeService.getActiveSubscriptions()).toBe(0);
  });
});
