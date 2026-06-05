/**
 * Tests for MessageRealtime — realtime message subscription lifecycle.
 *
 * Mocks ONLY externals:
 *  - config/supabase (channel builder + subscribe callback are made controllable)
 *  - utils/logger
 *  - Date.now (deterministic createdAt timestamps for LRU eviction)
 *
 * The unit under test (subscribeToJobMessages / cleanupAllChannels / activeChannels
 * and the internal cleanupOldestChannel reached via the MAX_ACTIVE_CHANNELS guard)
 * is NOT mocked.
 */

import { logger } from '../../../utils/logger';
import { supabase } from '../../../config/supabase';
import {
  subscribeToJobMessages,
  cleanupAllChannels,
  activeChannels,
} from '../MessageRealtime';
import type { Message } from '../types';

jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockedLogger = logger as jest.Mocked<typeof logger>;

// ---------------------------------------------------------------------------
// Controllable channel mock
// ---------------------------------------------------------------------------
//
// Each call to supabase.channel(name) returns a fresh fake channel that:
//  - records every .on(event, config, handler) registration
//  - captures the subscribe() status callback so tests can drive lifecycle status
//  - exposes a jest.fn() unsubscribe so lifecycle teardown can be asserted
//  - lets a test trigger a registered handler by db event ('INSERT' | 'UPDATE')

interface FakeChannel {
  name: string;
  handlers: Array<{
    event: string;
    config: { event: string; table: string; filter: string };
    handler: (payload: unknown) => void;
  }>;
  subscribeCallback: ((status: unknown) => void) | null;
  on: jest.Mock;
  subscribe: jest.Mock;
  unsubscribe: jest.Mock;
  /** Helper: invoke the handler registered for a given db event. */
  trigger: (dbEvent: 'INSERT' | 'UPDATE', payload: unknown) => void;
  /** Helper: drive the subscribe status callback. */
  emitStatus: (status: unknown) => void;
}

let createdChannels: FakeChannel[] = [];

function makeFakeChannel(name: string): FakeChannel {
  const ch: FakeChannel = {
    name,
    handlers: [],
    subscribeCallback: null,
    on: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    trigger: (dbEvent, payload) => {
      const entry = ch.handlers.find((h) => h.config.event === dbEvent);
      if (!entry) throw new Error(`No handler registered for ${dbEvent}`);
      entry.handler(payload);
    },
    emitStatus: (status) => {
      if (!ch.subscribeCallback) throw new Error('subscribe() not called');
      ch.subscribeCallback(status);
    },
  };

  ch.on.mockImplementation((event: string, config: any, handler: any) => {
    ch.handlers.push({ event, config, handler });
    return ch;
  });
  ch.subscribe.mockImplementation((cb: (status: unknown) => void) => {
    ch.subscribeCallback = cb;
    return ch;
  });

  return ch;
}

const mockedSupabase = supabase as unknown as { channel: jest.Mock };

let nowValue = 1_000;
let dateNowSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  activeChannels.clear();
  createdChannels = [];
  nowValue = 1_000;

  // Deterministic time. Each read advances the clock by 1 so createdAt values
  // are strictly increasing (insertion order == age order) for LRU tests.
  dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => {
    const v = nowValue;
    nowValue += 1;
    return v;
  });

  mockedSupabase.channel = jest.fn((name: string) => {
    const ch = makeFakeChannel(name);
    createdChannels.push(ch);
    return ch as unknown as ReturnType<typeof supabase.channel>;
  });
});

afterEach(() => {
  dateNowSpy.mockRestore();
  activeChannels.clear();
});

const baseRow = {
  id: 'm1',
  job_id: 'job-1',
  sender_id: 'sender-1',
  receiver_id: 'receiver-1',
  message_text: 'hello',
  message_type: 'text',
  attachment_url: 'http://x/file.png',
  read: false,
  created_at: '2026-01-01T00:00:00Z',
};

describe('subscribeToJobMessages — channel construction', () => {
  it('creates a channel with the job-scoped name and registers INSERT + UPDATE handlers', () => {
    subscribeToJobMessages('job-1', () => {});

    expect(mockedSupabase.channel).toHaveBeenCalledWith(
      'messages:job_id=eq.job-1'
    );
    const ch = createdChannels[0];
    expect(ch.handlers).toHaveLength(2);

    const insert = ch.handlers.find((h) => h.config.event === 'INSERT')!;
    const update = ch.handlers.find((h) => h.config.event === 'UPDATE')!;
    expect(insert.config).toMatchObject({
      schema: 'public',
      table: 'messages',
      filter: 'job_id=eq.job-1',
    });
    expect(update.config).toMatchObject({
      schema: 'public',
      table: 'messages',
      filter: 'job_id=eq.job-1',
    });
    expect(ch.subscribe).toHaveBeenCalledTimes(1);
  });

  it('registers the channel in activeChannels under the messages_<jobId> key', () => {
    subscribeToJobMessages('job-1', () => {});
    expect(activeChannels.has('messages_job-1')).toBe(true);
    expect(activeChannels.get('messages_job-1')!.createdAt).toBeGreaterThan(0);
  });
});

describe('subscribeToJobMessages — INSERT (new message) handler', () => {
  it('maps the realtime payload row to a Message and calls onNewMessage', () => {
    const onNewMessage = jest.fn();
    subscribeToJobMessages('job-1', onNewMessage);

    createdChannels[0].trigger('INSERT', { new: baseRow });

    expect(onNewMessage).toHaveBeenCalledTimes(1);
    const msg: Message = onNewMessage.mock.calls[0][0];
    expect(msg).toEqual({
      id: 'm1',
      jobId: 'job-1',
      senderId: 'sender-1',
      receiverId: 'receiver-1',
      messageText: 'hello',
      messageType: 'text',
      attachmentUrl: 'http://x/file.png',
      read: false,
      createdAt: '2026-01-01T00:00:00Z',
    });
  });

  it('defaults messageType to "text" and read to false when row omits them', () => {
    const onNewMessage = jest.fn();
    subscribeToJobMessages('job-1', onNewMessage);

    const row = { ...baseRow };
    delete (row as any).message_type;
    delete (row as any).read;
    createdChannels[0].trigger('INSERT', { new: row });

    const msg: Message = onNewMessage.mock.calls[0][0];
    expect(msg.messageType).toBe('text');
    expect(msg.read).toBe(false);
  });

  it('routes errors thrown inside the INSERT handler to onError', () => {
    const onNewMessage = jest.fn(() => {
      throw new Error('boom-insert');
    });
    const onError = jest.fn();
    subscribeToJobMessages('job-1', onNewMessage, () => {}, onError);

    createdChannels[0].trigger('INSERT', { new: baseRow });

    expect(onError).toHaveBeenCalledTimes(1);
    expect((onError.mock.calls[0][0] as Error).message).toBe('boom-insert');
  });

  it('uses the default onError (logger.error) when none is supplied', () => {
    const onNewMessage = jest.fn(() => {
      throw new Error('boom-default');
    });
    // No onMessageUpdate, no onError -> exercise both parameter defaults.
    subscribeToJobMessages('job-1', onNewMessage);

    createdChannels[0].trigger('INSERT', { new: baseRow });

    expect(mockedLogger.error).toHaveBeenCalledWith(
      'Real-time subscription error:',
      expect.any(Error)
    );
  });
});

describe('subscribeToJobMessages — UPDATE (message update) handler', () => {
  it('maps the payload row to a Message and calls onMessageUpdate', () => {
    const onMessageUpdate = jest.fn();
    subscribeToJobMessages('job-1', () => {}, onMessageUpdate);

    const updatedRow = { ...baseRow, read: true, message_text: 'edited' };
    createdChannels[0].trigger('UPDATE', { new: updatedRow });

    expect(onMessageUpdate).toHaveBeenCalledTimes(1);
    const msg: Message = onMessageUpdate.mock.calls[0][0];
    expect(msg.read).toBe(true);
    expect(msg.messageText).toBe('edited');
  });

  it('defaults messageType and read in the UPDATE mapping when row omits them', () => {
    const onMessageUpdate = jest.fn();
    subscribeToJobMessages('job-1', () => {}, onMessageUpdate);

    const row = { ...baseRow };
    delete (row as any).message_type;
    delete (row as any).read;
    createdChannels[0].trigger('UPDATE', { new: row });

    const msg: Message = onMessageUpdate.mock.calls[0][0];
    expect(msg.messageType).toBe('text');
    expect(msg.read).toBe(false);
  });

  it('uses the default no-op onMessageUpdate without throwing', () => {
    // Only onNewMessage provided -> onMessageUpdate defaults to () => {}.
    subscribeToJobMessages('job-1', () => {});
    expect(() =>
      createdChannels[0].trigger('UPDATE', { new: baseRow })
    ).not.toThrow();
  });

  it('routes errors thrown inside the UPDATE handler to onError', () => {
    const onMessageUpdate = jest.fn(() => {
      throw new Error('boom-update');
    });
    const onError = jest.fn();
    subscribeToJobMessages('job-1', () => {}, onMessageUpdate, onError);

    createdChannels[0].trigger('UPDATE', { new: baseRow });

    expect(onError).toHaveBeenCalledTimes(1);
    expect((onError.mock.calls[0][0] as Error).message).toBe('boom-update');
  });
});

describe('subscribeToJobMessages — subscribe status callback', () => {
  it('logs info on SUBSCRIBED', () => {
    subscribeToJobMessages('job-1', () => {});
    createdChannels[0].emitStatus('SUBSCRIBED');
    expect(mockedLogger.info).toHaveBeenCalledWith(
      'Successfully subscribed to messages for job job-1'
    );
  });

  it('logs warn on CLOSED', () => {
    subscribeToJobMessages('job-1', () => {});
    createdChannels[0].emitStatus('CLOSED');
    expect(mockedLogger.warn).toHaveBeenCalledWith(
      'Real-time subscription closed for job job-1'
    );
  });

  it('logs error and invokes onError on CHANNEL_ERROR', () => {
    const onError = jest.fn();
    subscribeToJobMessages(
      'job-1',
      () => {},
      () => {},
      onError
    );
    createdChannels[0].emitStatus('CHANNEL_ERROR');

    expect(mockedLogger.error).toHaveBeenCalledWith(
      'Real-time subscription error for job job-1'
    );
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect((onError.mock.calls[0][0] as Error).message).toBe(
      'Real-time subscription failed'
    );
  });

  it('does nothing for an unrecognized status', () => {
    subscribeToJobMessages('job-1', () => {});
    createdChannels[0].emitStatus('CONNECTING');
    expect(mockedLogger.info).not.toHaveBeenCalled();
    expect(mockedLogger.warn).not.toHaveBeenCalled();
  });
});

describe('subscribeToJobMessages — duplicate-subscription guard', () => {
  it('unsubscribes and replaces an existing channel for the same job', () => {
    subscribeToJobMessages('job-1', () => {});
    const first = createdChannels[0];

    subscribeToJobMessages('job-1', () => {});
    const second = createdChannels[1];

    // Existing channel torn down before re-subscribe.
    expect(first.unsubscribe).toHaveBeenCalledTimes(1);
    // Only one entry remains, pointing at the new channel.
    expect(activeChannels.size).toBe(1);
    expect(activeChannels.get('messages_job-1')!.channel).toBe(
      second as unknown as object
    );
  });
});

describe('subscribeToJobMessages — returned cleanup function', () => {
  it('unsubscribes, removes the entry, and logs on teardown', () => {
    const cleanup = subscribeToJobMessages('job-1', () => {});
    const ch = createdChannels[0];

    cleanup();

    expect(ch.unsubscribe).toHaveBeenCalledTimes(1);
    expect(activeChannels.has('messages_job-1')).toBe(false);
    expect(mockedLogger.info).toHaveBeenCalledWith(
      'Unsubscribed from messages for job job-1'
    );
  });

  it('logs an error if unsubscribe throws during teardown', () => {
    const cleanup = subscribeToJobMessages('job-1', () => {});
    const ch = createdChannels[0];
    ch.unsubscribe.mockImplementation(() => {
      throw new Error('teardown-fail');
    });

    expect(() => cleanup()).not.toThrow();
    expect(mockedLogger.error).toHaveBeenCalledWith(
      'Error unsubscribing from messages:',
      expect.any(Error)
    );
  });
});

describe('subscribeToJobMessages — setup error path', () => {
  it('catches a throw during channel setup, logs, calls onError, and returns a no-op', () => {
    mockedSupabase.channel = jest.fn(() => {
      throw new Error('setup-explode');
    });
    const onError = jest.fn();

    const cleanup = subscribeToJobMessages(
      'job-1',
      () => {},
      () => {},
      onError
    );

    expect(mockedLogger.error).toHaveBeenCalledWith(
      'Error setting up real-time subscription:',
      expect.any(Error)
    );
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    // Returned cleanup is a safe no-op.
    expect(typeof cleanup).toBe('function');
    expect(() => cleanup()).not.toThrow();
  });
});

describe('subscribeToJobMessages — MAX_ACTIVE_CHANNELS LRU eviction', () => {
  it('evicts the oldest channel once the cap of 50 is reached', () => {
    // Fill to the cap (50 distinct jobs).
    for (let i = 0; i < 50; i++) {
      subscribeToJobMessages(`job-${i}`, () => {});
    }
    expect(activeChannels.size).toBe(50);

    const oldestChannel = createdChannels[0]; // job-0, lowest createdAt.

    // 51st subscription triggers cleanupOldestChannel.
    subscribeToJobMessages('job-50', () => {});

    expect(oldestChannel.unsubscribe).toHaveBeenCalledTimes(1);
    expect(activeChannels.has('messages_job-0')).toBe(false);
    expect(activeChannels.has('messages_job-50')).toBe(true);
    expect(mockedLogger.warn).toHaveBeenCalledWith(
      'Cleaned up oldest channel: messages_job-0'
    );
    // One evicted, one added -> still at the cap.
    expect(activeChannels.size).toBe(50);
  });

  it('evicts nothing when no entry is older than the current clock (oldestKey stays null)', () => {
    // Pre-fill 50 entries whose createdAt is far in the FUTURE relative to the
    // clock value cleanupOldestChannel will read. With oldestTime = Date.now()
    // and every createdAt >= oldestTime, the `data.createdAt < oldestTime`
    // comparison never trips, so oldestKey stays null (line 23 false branch).
    for (let i = 0; i < 50; i++) {
      activeChannels.set(`messages_pre-${i}`, {
        channel: makeFakeChannel(`pre-${i}`) as unknown as never,
        createdAt: 9_000_000,
      });
    }

    // Freeze the clock LOW so nothing is "older".
    dateNowSpy.mockReturnValue(1);

    subscribeToJobMessages('job-new', () => {});

    // No eviction happened, so the map grew past the cap by one.
    expect(activeChannels.size).toBe(51);
    expect(activeChannels.has('messages_job-new')).toBe(true);
    expect(mockedLogger.warn).not.toHaveBeenCalled();
  });

  it('evicts nothing when the oldest entry was already removed from the map', () => {
    // Drive cleanupOldestChannel so oldestKey is found, but the get() returns
    // undefined (line 25 false branch). We simulate this by giving the map an
    // entry with no createdAt-beating sibling and a value that resolves to
    // undefined on get — achieved via a non-enumerable trick is brittle, so
    // instead we rely on a single old entry whose channel.unsubscribe still
    // fires, then assert the map shrank. To hit the `if (channel)` FALSE arm we
    // overwrite Map.prototype.get for the duration of this call.
    for (let i = 0; i < 50; i++) {
      activeChannels.set(`messages_old-${i}`, {
        channel: makeFakeChannel(`old-${i}`) as unknown as never,
        createdAt: i + 1, // old-0 is the oldest
      });
    }

    const realGet = Map.prototype.get;
    const getSpy = jest
      .spyOn(Map.prototype, 'get')
      .mockImplementation(function (this: Map<unknown, unknown>, key: unknown) {
        // The oldest key is identified, but report it as already-gone.
        if (key === 'messages_old-0') return undefined;
        return realGet.call(this, key);
      });

    try {
      subscribeToJobMessages('job-z', () => {});
    } finally {
      getSpy.mockRestore();
    }

    // cleanupOldestChannel hit the `if (channel)` false arm: nothing deleted,
    // no warn logged. New channel still added on top.
    expect(activeChannels.has('messages_old-0')).toBe(true);
    expect(mockedLogger.warn).not.toHaveBeenCalled();
    expect(activeChannels.has('messages_job-z')).toBe(true);
  });
});

describe('cleanupAllChannels', () => {
  it('unsubscribes every active channel via the production { channel } shape and clears the map', () => {
    subscribeToJobMessages('job-1', () => {});
    subscribeToJobMessages('job-2', () => {});
    const ch1 = createdChannels[0];
    const ch2 = createdChannels[1];

    cleanupAllChannels();

    expect(ch1.unsubscribe).toHaveBeenCalledTimes(1);
    expect(ch2.unsubscribe).toHaveBeenCalledTimes(1);
    expect(activeChannels.size).toBe(0);
  });

  it('supports the legacy/test { unsubscribe } shape (no nested channel)', () => {
    const flatUnsub = jest.fn();
    // Insert a flat-shaped entry directly to exercise the else-if branch.
    activeChannels.set('legacy', {
      unsubscribe: flatUnsub,
    } as unknown as never);

    cleanupAllChannels();

    expect(flatUnsub).toHaveBeenCalledTimes(1);
    expect(activeChannels.size).toBe(0);
  });

  it('skips entries that expose neither shape without throwing', () => {
    activeChannels.set('weird', {} as unknown as never);
    expect(() => cleanupAllChannels()).not.toThrow();
    expect(activeChannels.size).toBe(0);
  });

  it('is a no-op when there are no active channels', () => {
    expect(() => cleanupAllChannels()).not.toThrow();
    expect(activeChannels.size).toBe(0);
  });
});
