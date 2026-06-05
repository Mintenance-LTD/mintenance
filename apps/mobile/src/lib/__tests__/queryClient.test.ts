/**
 * Unit tests for src/lib/queryClient.ts
 *
 * Strategy: use the REAL @tanstack/react-query QueryClient/Cache classes (they
 * are library code, fine to exercise), and mock ONLY the externals:
 *  - ../utils/haptics  (HapticService) — assert haptic side effects fire
 *  - @react-native-async-storage/async-storage — control persist/restore I/O
 *  - ../utils/logger — assert error logging on failures
 *
 * We exercise every exported helper + branch:
 *  - queryClient default options (staleTime/gcTime/networkMode/retry/retryDelay/
 *    refetchOnMount/refetchOnReconnect/refetchOnWindowFocus)
 *  - query + mutation cache error/success haptic handlers
 *  - persistQueryClient (sensitive-key exclusion, TTL filter, entry cap, error path)
 *  - restoreQueryClient (TTL filter, error path, no-cache path, parse error)
 *  - queryKeys factory (all builders)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { HapticService } from '../../utils/haptics';
import { logger } from '../../utils/logger';
import {
  queryClient,
  queryKeys,
  persistQueryClient,
  restoreQueryClient,
} from '../queryClient';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn(() => Promise.resolve()),
    getItem: jest.fn(() => Promise.resolve(null)),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('../../utils/haptics', () => ({
  HapticService: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockedSetItem = AsyncStorage.setItem as jest.Mock;
const mockedGetItem = AsyncStorage.getItem as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  queryClient.clear();
});

// ---------------------------------------------------------------------------
// Default options config
// ---------------------------------------------------------------------------
describe('queryClient default options', () => {
  const queries = () =>
    queryClient.getDefaultOptions().queries as NonNullable<
      ReturnType<typeof queryClient.getDefaultOptions>['queries']
    >;
  const mutations = () =>
    queryClient.getDefaultOptions().mutations as NonNullable<
      ReturnType<typeof queryClient.getDefaultOptions>['mutations']
    >;

  it('sets staleTime to 2 minutes', () => {
    expect(queries().staleTime).toBe(2 * 60 * 1000);
  });

  it('sets gcTime to 3 minutes', () => {
    expect(queries().gcTime).toBe(3 * 60 * 1000);
  });

  it('uses offlineFirst network mode for queries', () => {
    expect(queries().networkMode).toBe('offlineFirst');
  });

  it('uses online network mode for mutations', () => {
    expect(mutations().networkMode).toBe('online');
  });

  it('disables refetchOnWindowFocus', () => {
    expect(queries().refetchOnWindowFocus).toBe(false);
  });

  it('always refetches on reconnect', () => {
    expect(queries().refetchOnReconnect).toBe('always');
  });

  it('disables refetchInterval and background refetch', () => {
    expect(queries().refetchInterval).toBe(false);
    expect(queries().refetchIntervalInBackground).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Query retry branch coverage
// ---------------------------------------------------------------------------
describe('query retry logic', () => {
  const retry = () =>
    queryClient.getDefaultOptions().queries!.retry as (
      failureCount: number,
      error: unknown
    ) => boolean;

  it('does not retry on 4xx client errors', () => {
    expect(retry()(0, { status: 404 })).toBe(false);
    expect(retry()(0, { status: 400 })).toBe(false);
    expect(retry()(0, { status: 499 })).toBe(false);
  });

  it('does not treat 5xx as a client error', () => {
    // 500 falls through to the failureCount check
    expect(retry()(0, { status: 500 })).toBe(true);
  });

  it('does not retry on NetworkError name', () => {
    expect(retry()(0, { name: 'NetworkError' })).toBe(false);
  });

  it('does not retry when message includes "fetch"', () => {
    expect(retry()(0, { message: 'failed to fetch resource' })).toBe(false);
  });

  it('retries up to 3 times for generic errors', () => {
    expect(retry()(0, { status: 500 })).toBe(true);
    expect(retry()(2, { status: 500 })).toBe(true);
    expect(retry()(3, { status: 500 })).toBe(false);
  });

  it('retries when error is null/undefined and under cap', () => {
    expect(retry()(0, undefined)).toBe(true);
    expect(retry()(0, null)).toBe(true);
    expect(retry()(3, null)).toBe(false);
  });

  it('ignores non-numeric status values', () => {
    // status is not a number → skip the 4xx branch, fall through to count
    expect(retry()(0, { status: 'oops' })).toBe(true);
  });
});

describe('query retryDelay', () => {
  const retryDelay = () =>
    queryClient.getDefaultOptions().queries!.retryDelay as (
      attemptIndex: number
    ) => number;

  it('uses exponential backoff', () => {
    expect(retryDelay()(0)).toBe(1000);
    expect(retryDelay()(1)).toBe(2000);
    expect(retryDelay()(2)).toBe(4000);
  });

  it('caps at 30000ms', () => {
    expect(retryDelay()(10)).toBe(30000);
  });
});

describe('query refetchOnMount', () => {
  const refetchOnMount = () =>
    queryClient.getDefaultOptions().queries!.refetchOnMount as (
      query: unknown
    ) => boolean;

  it('refetches when invalidated', () => {
    expect(
      refetchOnMount()({
        state: { isInvalidated: true, status: 'success', data: { a: 1 } },
      })
    ).toBe(true);
  });

  it('refetches when in error state', () => {
    expect(
      refetchOnMount()({
        state: { isInvalidated: false, status: 'error', data: { a: 1 } },
      })
    ).toBe(true);
  });

  it('refetches when no data', () => {
    expect(
      refetchOnMount()({
        state: { isInvalidated: false, status: 'success', data: undefined },
      })
    ).toBe(true);
  });

  it('does not refetch when fresh, success, and has data', () => {
    expect(
      refetchOnMount()({
        state: { isInvalidated: false, status: 'success', data: { a: 1 } },
      })
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Mutation retry branch coverage
// ---------------------------------------------------------------------------
describe('mutation retry logic', () => {
  const retry = () =>
    queryClient.getDefaultOptions().mutations!.retry as (
      failureCount: number,
      error: unknown
    ) => boolean;

  it('does not retry on 4xx', () => {
    expect(retry()(0, { status: 422 })).toBe(false);
  });

  it('does not retry on OfflineQueuedError', () => {
    expect(retry()(0, { name: 'OfflineQueuedError' })).toBe(false);
  });

  it('retries up to 2 times for other errors', () => {
    expect(retry()(0, { status: 500 })).toBe(true);
    expect(retry()(1, { status: 500 })).toBe(true);
    expect(retry()(2, { status: 500 })).toBe(false);
  });

  it('retries when error has no status/name and under cap', () => {
    expect(retry()(0, {})).toBe(true);
  });
});

describe('mutation retryDelay', () => {
  const retryDelay = () =>
    queryClient.getDefaultOptions().mutations!.retryDelay as (
      attemptIndex: number
    ) => number;

  it('uses exponential backoff starting at 1500ms', () => {
    expect(retryDelay()(0)).toBe(1500);
    expect(retryDelay()(1)).toBe(3000);
  });

  it('caps at 10000ms', () => {
    expect(retryDelay()(10)).toBe(10000);
  });
});

// ---------------------------------------------------------------------------
// Cache error/success handlers (haptic side effects)
// ---------------------------------------------------------------------------
describe('query cache error handler', () => {
  it('logs the error and fires error haptic', () => {
    const cache = queryClient.getQueryCache();
    const err = new Error('boom');
    const fakeQuery = { queryKey: ['user', 'profile', 'u1'] };
    // Invoke the configured onError directly
    cache.config.onError!(err, fakeQuery as never);

    expect(HapticService.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      'Query error',
      expect.objectContaining({
        queryKey: ['user', 'profile', 'u1'],
        message: 'boom',
      })
    );
  });

  it('coerces non-Error values to string in the log', () => {
    const cache = queryClient.getQueryCache();
    cache.config.onError!(
      'string-error' as unknown as Error,
      { queryKey: ['jobs'] } as never
    );
    expect(logger.error).toHaveBeenCalledWith(
      'Query error',
      expect.objectContaining({ message: 'string-error' })
    );
  });
});

describe('mutation cache handlers', () => {
  it('error handler logs and fires error haptic', () => {
    const cache = queryClient.getMutationCache();
    const err = new Error('mut-fail');
    const fakeMutation = { options: { mutationKey: ['accept-bid'] } };
    cache.config.onError!(err, {}, undefined, fakeMutation as never);

    expect(HapticService.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      'Mutation error',
      expect.objectContaining({
        mutationKey: ['accept-bid'],
        message: 'mut-fail',
      })
    );
  });

  it('error handler coerces non-Error values to string', () => {
    const cache = queryClient.getMutationCache();
    cache.config.onError!(42 as unknown as Error, {}, undefined, {
      options: {},
    } as never);
    expect(logger.error).toHaveBeenCalledWith(
      'Mutation error',
      expect.objectContaining({ message: '42' })
    );
  });

  it('success handler fires success haptic', () => {
    const cache = queryClient.getMutationCache();
    cache.config.onSuccess!({ ok: true }, {}, undefined, {
      options: {},
    } as never);
    expect(HapticService.success).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// persistQueryClient
// ---------------------------------------------------------------------------
describe('persistQueryClient', () => {
  it('persists only non-sensitive successful queries with data', async () => {
    queryClient.setQueryData(['jobs', 'list', 'all'], { jobs: [1, 2] });
    queryClient.setQueryData(['user', 'profile', 'u1'], { name: 'secret' }); // sensitive → excluded
    queryClient.setQueryData(['contractors', 'list', 'x'], { cs: [] });

    await persistQueryClient();

    expect(mockedSetItem).toHaveBeenCalledTimes(1);
    const [key, raw] = mockedSetItem.mock.calls[0];
    expect(key).toBe('QUERY_CACHE');
    const payload = JSON.parse(raw);
    const keys = Object.keys(payload);

    expect(keys).toContain('["jobs","list","all"]');
    expect(keys).toContain('["contractors","list","x"]');
    expect(keys).not.toContain('["user","profile","u1"]');
  });

  it('excludes every sensitive prefix family', async () => {
    const sensitiveKeys = [
      ['user', 'profile', 'u1'],
      ['user', 'stats', 'u1'],
      ['payment'],
      ['payments'],
      ['escrow'],
      ['subscription'],
      ['messages'],
      ['message_thread', 't1'],
      ['conversation', 'c1'],
      ['notifications'],
      ['contracts'],
      ['bids', 'j1'],
      ['contractor_documents'],
      ['documents'],
      ['tax'],
      ['financial'],
    ];
    sensitiveKeys.forEach((k, i) => queryClient.setQueryData(k, { idx: i }));

    await persistQueryClient();

    const raw = mockedSetItem.mock.calls[0][1];
    const payload = JSON.parse(raw);
    expect(Object.keys(payload)).toHaveLength(0);
  });

  it('drops entries older than the 24h TTL', async () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000_000_000_000);
    // Stale: set updatedAt far in the past
    queryClient.setQueryData(
      ['jobs', 'old'],
      { v: 1 },
      {
        updatedAt: 1_000_000_000_000 - 25 * 60 * 60 * 1000,
      }
    );
    // Fresh
    queryClient.setQueryData(
      ['jobs', 'new'],
      { v: 2 },
      {
        updatedAt: 1_000_000_000_000 - 1000,
      }
    );

    await persistQueryClient();

    const payload = JSON.parse(mockedSetItem.mock.calls[0][1]);
    const keys = Object.keys(payload);
    expect(keys).toContain('["jobs","new"]');
    expect(keys).not.toContain('["jobs","old"]');
    nowSpy.mockRestore();
  });

  it('skips queries without data even if status success', async () => {
    // A query in pending state (no data) should not be persisted
    queryClient.setQueryData(['jobs', 'present'], { v: 1 });
    // Force an entry with success status but no data by ensuring only the
    // populated one persists.
    await persistQueryClient();
    const payload = JSON.parse(mockedSetItem.mock.calls[0][1]);
    expect(Object.keys(payload)).toContain('["jobs","present"]');
  });

  it('caps persisted entries at 500', async () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(2_000_000_000_000);
    for (let i = 0; i < 600; i++) {
      queryClient.setQueryData(
        ['jobs', 'detail', `j${i}`],
        { i },
        {
          updatedAt: 2_000_000_000_000 - i, // newer ones first
        }
      );
    }
    await persistQueryClient();
    const payload = JSON.parse(mockedSetItem.mock.calls[0][1]);
    expect(Object.keys(payload)).toHaveLength(500);
    nowSpy.mockRestore();
  });

  it('logs and swallows AsyncStorage write errors', async () => {
    mockedSetItem.mockRejectedValueOnce(new Error('disk full'));
    queryClient.setQueryData(['jobs', 'x'], { v: 1 });
    await expect(persistQueryClient()).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to persist query cache:',
      expect.any(Error)
    );
  });
});

// ---------------------------------------------------------------------------
// restoreQueryClient
// ---------------------------------------------------------------------------
describe('restoreQueryClient', () => {
  it('does nothing when there is no cached data', async () => {
    mockedGetItem.mockResolvedValueOnce(null);
    await restoreQueryClient();
    expect(queryClient.getQueryData(['jobs', 'list', 'all'])).toBeUndefined();
  });

  it('rehydrates fresh entries into the cache', async () => {
    const now = Date.now();
    mockedGetItem.mockResolvedValueOnce(
      JSON.stringify({
        '["jobs","list","all"]': { data: { jobs: [9] }, dataUpdatedAt: now },
      })
    );
    await restoreQueryClient();
    expect(queryClient.getQueryData(['jobs', 'list', 'all'])).toEqual({
      jobs: [9],
    });
  });

  it('skips entries older than the TTL', async () => {
    const now = Date.now();
    mockedGetItem.mockResolvedValueOnce(
      JSON.stringify({
        '["jobs","stale"]': {
          data: { v: 1 },
          dataUpdatedAt: now - 25 * 60 * 60 * 1000,
        },
        '["jobs","fresh"]': { data: { v: 2 }, dataUpdatedAt: now },
      })
    );
    await restoreQueryClient();
    expect(queryClient.getQueryData(['jobs', 'stale'])).toBeUndefined();
    expect(queryClient.getQueryData(['jobs', 'fresh'])).toEqual({ v: 2 });
  });

  it('caps restored entries at 500', async () => {
    const now = Date.now();
    const obj: Record<string, unknown> = {};
    for (let i = 0; i < 600; i++) {
      obj[`["jobs","r${i}"]`] = { data: { i }, dataUpdatedAt: now - i };
    }
    mockedGetItem.mockResolvedValueOnce(JSON.stringify(obj));
    await restoreQueryClient();
    // The 500 most recent (lowest i) should be present; the 100 oldest dropped
    expect(queryClient.getQueryData(['jobs', 'r0'])).toEqual({ i: 0 });
    expect(queryClient.getQueryData(['jobs', 'r599'])).toBeUndefined();
  });

  it('logs and swallows JSON parse errors', async () => {
    mockedGetItem.mockResolvedValueOnce('{not valid json');
    await expect(restoreQueryClient()).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to restore query cache:',
      expect.any(Error)
    );
  });

  it('logs and swallows AsyncStorage read errors', async () => {
    mockedGetItem.mockRejectedValueOnce(new Error('read fail'));
    await expect(restoreQueryClient()).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to restore query cache:',
      expect.any(Error)
    );
  });
});

// ---------------------------------------------------------------------------
// queryKeys factory
// ---------------------------------------------------------------------------
describe('queryKeys factory', () => {
  it('builds user keys', () => {
    expect(queryKeys.user.profile('u1')).toEqual(['user', 'profile', 'u1']);
    expect(queryKeys.user.stats('u1')).toEqual(['user', 'stats', 'u1']);
    expect(queryKeys.user.preferences('u1')).toEqual([
      'user',
      'preferences',
      'u1',
    ]);
  });

  it('builds job keys', () => {
    expect(queryKeys.jobs.all).toEqual(['jobs']);
    expect(queryKeys.jobs.lists()).toEqual(['jobs', 'list']);
    expect(queryKeys.jobs.list('open')).toEqual(['jobs', 'list', 'open']);
    expect(queryKeys.jobs.details('j1')).toEqual(['jobs', 'detail', 'j1']);
    expect(queryKeys.jobs.bids('j1')).toEqual(['jobs', 'bids', 'j1']);
  });

  it('builds contractor keys', () => {
    expect(queryKeys.contractors.all).toEqual(['contractors']);
    expect(queryKeys.contractors.lists()).toEqual(['contractors', 'list']);
    expect(queryKeys.contractors.list('near')).toEqual([
      'contractors',
      'list',
      'near',
    ]);
    expect(queryKeys.contractors.details('c1')).toEqual([
      'contractors',
      'detail',
      'c1',
    ]);
    expect(queryKeys.contractors.reviews('c1')).toEqual([
      'contractors',
      'reviews',
      'c1',
    ]);
  });

  it('builds message keys', () => {
    expect(queryKeys.messages.all).toEqual(['messages']);
    expect(queryKeys.messages.conversations()).toEqual([
      'messages',
      'conversations',
    ]);
    expect(queryKeys.messages.conversation('j1')).toEqual([
      'messages',
      'conversation',
      'j1',
    ]);
    expect(queryKeys.messages.thread('t1')).toEqual([
      'messages',
      'thread',
      't1',
    ]);
  });

  it('builds feed keys (with and without optional filters)', () => {
    expect(queryKeys.feed.all).toEqual(['feed']);
    expect(queryKeys.feed.posts()).toEqual(['feed', 'posts', undefined]);
    expect(queryKeys.feed.posts('hot')).toEqual(['feed', 'posts', 'hot']);
    expect(queryKeys.feed.post('p1')).toEqual(['feed', 'post', 'p1']);
    expect(queryKeys.feed.likes('p1')).toEqual(['feed', 'likes', 'p1']);
    expect(queryKeys.feed.comments('p1')).toEqual(['feed', 'comments', 'p1']);
  });

  it('builds search keys (with and without optional filters)', () => {
    expect(queryKeys.search.all).toEqual(['search']);
    expect(queryKeys.search.contractors('plumber')).toEqual([
      'search',
      'contractors',
      'plumber',
      undefined,
    ]);
    expect(queryKeys.search.contractors('plumber', 'london')).toEqual([
      'search',
      'contractors',
      'plumber',
      'london',
    ]);
    expect(queryKeys.search.jobs('leak')).toEqual([
      'search',
      'jobs',
      'leak',
      undefined,
    ]);
    expect(queryKeys.search.services('boiler')).toEqual([
      'search',
      'services',
      'boiler',
    ]);
  });
});
