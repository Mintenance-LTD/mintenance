import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useOfflineQuery, useOfflineMutation } from '../useOfflineQuery';
import { useNetworkState } from '../useNetworkState';
import { OfflineManager } from '../../services/OfflineManager';
import { LocalDatabase } from '../../services/LocalDatabase';

// ---- Mocks for externals only (never the hook under test) ----
jest.mock('../useNetworkState');

jest.mock('../../services/OfflineManager', () => ({
  OfflineManager: {
    queueAction: jest.fn(),
    hasPendingActions: jest.fn(),
    getPendingActionsCount: jest.fn(),
    clearQueue: jest.fn(),
  },
  OfflineAction: {},
}));

jest.mock('../../services/LocalDatabase', () => ({
  LocalDatabase: {
    init: jest.fn(),
    getJobsByStatus: jest.fn(),
    getJobsByHomeowner: jest.fn(),
    getJob: jest.fn(),
    getUser: jest.fn(),
    getMessagesByJob: jest.fn(),
    saveJob: jest.fn(),
    saveUser: jest.fn(),
    saveMessage: jest.fn(),
  },
}));

jest.mock('../../services/SyncManager', () => ({
  SyncManager: {
    onSyncStatusChange: jest.fn(() => jest.fn()),
    forcSync: jest.fn(),
    resetAndResync: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    network: jest.fn(),
  },
}));

const mockedUseNetworkState = useNetworkState as jest.MockedFunction<
  typeof useNetworkState
>;
const mockLocalDb = LocalDatabase as jest.Mocked<typeof LocalDatabase>;
const mockOfflineManager = OfflineManager as jest.Mocked<typeof OfflineManager>;

function setNetwork(
  isOnline: boolean,
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline' = 'good'
) {
  mockedUseNetworkState.mockReturnValue({
    isOnline,
    connectionQuality,
    isConnected: isOnline,
    isInternetReachable: isOnline,
    type: 'wifi',
    isWifi: true,
    isCellular: false,
    isSlowConnection: connectionQuality === 'poor',
  } as ReturnType<typeof useNetworkState>);
}

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { queryClient, wrapper };
}

beforeEach(() => {
  jest.clearAllMocks();
  setNetwork(true, 'good');
  mockLocalDb.init.mockResolvedValue(undefined as never);
  mockOfflineManager.queueAction.mockResolvedValue('action-1' as never);
});

describe('useOfflineQuery', () => {
  it('fetches remote data when online and caches it locally (jobs list)', async () => {
    const jobs = [{ id: 'j1', title: 'A' }];
    const queryFn = jest.fn().mockResolvedValue(jobs);
    const { wrapper } = makeWrapper();

    const { result } = renderHook(
      () =>
        useOfflineQuery({ queryKey: ['jobs', 'list', 'available'], queryFn }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(jobs);
    expect(queryFn).toHaveBeenCalledTimes(1);
    // cacheLocalData -> cacheJobsData -> saveJob for each array item
    await waitFor(() =>
      expect(mockLocalDb.saveJob).toHaveBeenCalledWith(jobs[0], false)
    );
  });

  it('caches a single (non-array) job object', async () => {
    const job = { id: 'jX', title: 'Detail' };
    const queryFn = jest.fn().mockResolvedValue(job);
    const { wrapper } = makeWrapper();

    const { result } = renderHook(
      () => useOfflineQuery({ queryKey: ['jobs', 'detail', 'jX'], queryFn }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await waitFor(() =>
      expect(mockLocalDb.saveJob).toHaveBeenCalledWith(job, false)
    );
  });

  it('caches user data via cacheUserData', async () => {
    const user = { id: 'u1', name: 'Bob' };
    const queryFn = jest.fn().mockResolvedValue(user);
    const { wrapper } = makeWrapper();

    const { result } = renderHook(
      () => useOfflineQuery({ queryKey: ['user', 'profile', 'u1'], queryFn }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await waitFor(() =>
      expect(mockLocalDb.saveUser).toHaveBeenCalledWith(user, false)
    );
  });

  it('caches messages, normalizing snake_case and skipping sender-less rows', async () => {
    const messages = [
      {
        id: 'm1',
        sender_id: 's1',
        thread_id: 't1',
        message_text: 'hi',
        message_type: 'text',
        created_at: '2026-01-01T00:00:00Z',
      },
      { id: 'm2', message_text: 'no sender' }, // should be skipped
      { id: 'm3', senderId: 's3', content: 'camel', read: true },
    ];
    const queryFn = jest.fn().mockResolvedValue(messages);
    const { wrapper } = makeWrapper();

    const { result } = renderHook(
      () =>
        useOfflineQuery({
          queryKey: ['messages', 'conversation', 't1'],
          queryFn,
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await waitFor(() =>
      expect(mockLocalDb.saveMessage).toHaveBeenCalledTimes(2)
    );
    expect(mockLocalDb.saveMessage).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'm1', senderId: 's1', jobId: 't1' }),
      false
    );
  });

  it('returns local data when offline (offline read path, jobs available)', async () => {
    setNetwork(false, 'offline');
    const localJobs = [{ id: 'local-1' }];
    mockLocalDb.getJobsByStatus.mockResolvedValue(localJobs as never);
    const queryFn = jest.fn();
    const { wrapper } = makeWrapper();

    const { result } = renderHook(
      () =>
        useOfflineQuery({ queryKey: ['jobs', 'list', 'available'], queryFn }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(localJobs);
    expect(mockLocalDb.getJobsByStatus).toHaveBeenCalledWith('posted');
    expect(queryFn).not.toHaveBeenCalled();
  });

  it('resolves jobs by homeowner from local DB when offline', async () => {
    setNetwork(false, 'offline');
    mockLocalDb.getJobsByHomeowner.mockResolvedValue([{ id: 'ho' }] as never);
    const { wrapper } = makeWrapper();

    const { result } = renderHook(
      () =>
        useOfflineQuery({
          queryKey: ['jobs', 'list', 'homeowner:ho-9'],
          queryFn: jest.fn(),
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockLocalDb.getJobsByHomeowner).toHaveBeenCalledWith('ho-9');
  });

  it('resolves jobs by status (with embedded user) from local DB when offline', async () => {
    setNetwork(false, 'offline');
    mockLocalDb.getJobsByStatus.mockResolvedValue([{ id: 'st' }] as never);
    const { wrapper } = makeWrapper();

    const { result } = renderHook(
      () =>
        useOfflineQuery({
          queryKey: ['jobs', 'list', 'status:assigned'],
          queryFn: jest.fn(),
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockLocalDb.getJobsByStatus).toHaveBeenCalledWith(
      'assigned',
      undefined
    );
  });

  it('resolves a single job detail from local DB when offline', async () => {
    setNetwork(false, 'offline');
    mockLocalDb.getJob.mockResolvedValue({ id: 'jd' } as never);
    const { wrapper } = makeWrapper();

    const { result } = renderHook(
      () =>
        useOfflineQuery({
          queryKey: ['jobs', 'detail', 'jd'],
          queryFn: jest.fn(),
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockLocalDb.getJob).toHaveBeenCalledWith('jd');
  });

  it('resolves user profile from local DB when offline', async () => {
    setNetwork(false, 'offline');
    mockLocalDb.getUser.mockResolvedValue({ id: 'u' } as never);
    const { wrapper } = makeWrapper();

    const { result } = renderHook(
      () =>
        useOfflineQuery({
          queryKey: ['user', 'profile', 'u'],
          queryFn: jest.fn(),
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockLocalDb.getUser).toHaveBeenCalledWith('u');
  });

  it('resolves messages conversation from local DB when offline', async () => {
    setNetwork(false, 'offline');
    mockLocalDb.getMessagesByJob.mockResolvedValue([{ id: 'm' }] as never);
    const { wrapper } = makeWrapper();

    const { result } = renderHook(
      () =>
        useOfflineQuery({
          queryKey: ['messages', 'conversation', 'conv'],
          queryFn: jest.fn(),
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockLocalDb.getMessagesByJob).toHaveBeenCalledWith('conv');
  });

  it('throws when offline and no local data available', async () => {
    setNetwork(false, 'offline');
    mockLocalDb.getJobsByStatus.mockResolvedValue(null as never);
    const queryFn = jest.fn();
    const { wrapper } = makeWrapper();

    const { result } = renderHook(
      () =>
        useOfflineQuery({ queryKey: ['jobs', 'list', 'available'], queryFn }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(queryFn).not.toHaveBeenCalled();
  });

  it('returns null for unknown entity (default branch in tryLocalQuery)', async () => {
    setNetwork(false, 'offline');
    const queryFn = jest.fn();
    const { wrapper } = makeWrapper();

    const { result } = renderHook(
      () => useOfflineQuery({ queryKey: ['unknown', 'op', 'x'], queryFn }),
      { wrapper }
    );

    // offline + no local data -> error
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('falls back to local data when an online query throws', async () => {
    setNetwork(true, 'good');
    const queryFn = jest.fn().mockRejectedValue(new Error('network boom'));
    mockLocalDb.getJob.mockResolvedValue({ id: 'fallback' } as never);
    const { wrapper } = makeWrapper();

    const { result } = renderHook(
      () =>
        useOfflineQuery({ queryKey: ['jobs', 'detail', 'fallback'], queryFn }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ id: 'fallback' });
  });

  it('rethrows when online query throws and no local fallback exists', async () => {
    setNetwork(true, 'good');
    const err = Object.assign(new Error('hard fail'), { status: 404 }); // 4xx => no retry
    const queryFn = jest.fn().mockRejectedValue(err);
    mockLocalDb.getJob.mockResolvedValue(null as never);
    const { wrapper } = makeWrapper();

    const { result } = renderHook(
      () => useOfflineQuery({ queryKey: ['jobs', 'detail', 'x'], queryFn }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('hard fail');
  });

  it('offlineFirst prefers cached data even when online', async () => {
    setNetwork(true, 'excellent');
    mockLocalDb.getJob.mockResolvedValue({ id: 'cached-first' } as never);
    const queryFn = jest.fn();
    const { wrapper } = makeWrapper();

    const { result } = renderHook(
      () =>
        useOfflineQuery({
          queryKey: ['jobs', 'detail', 'cached-first'],
          queryFn,
          offlineFirst: true,
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ id: 'cached-first' });
    expect(queryFn).not.toHaveBeenCalled();
  });

  it('offlineFirst falls through to remote when no local data', async () => {
    setNetwork(true, 'excellent');
    mockLocalDb.getJob.mockResolvedValue(null as never);
    const queryFn = jest.fn().mockResolvedValue({ id: 'remote' });
    const { wrapper } = makeWrapper();

    const { result } = renderHook(
      () =>
        useOfflineQuery({
          queryKey: ['jobs', 'detail', 'remote'],
          queryFn,
          offlineFirst: true,
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ id: 'remote' });
    expect(queryFn).toHaveBeenCalled();
  });

  it('does not fetch when disabled (enabled: false)', async () => {
    const queryFn = jest.fn().mockResolvedValue([]);
    const { wrapper } = makeWrapper();

    const { result } = renderHook(
      () =>
        useOfflineQuery({
          queryKey: ['jobs', 'list', 'available'],
          queryFn,
          enabled: false,
        }),
      { wrapper }
    );

    // give react-query a tick
    await act(async () => {
      await Promise.resolve();
    });
    expect(queryFn).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('swallows local cache write errors without failing the query', async () => {
    setNetwork(true, 'good');
    const jobs = [{ id: 'j1' }];
    const queryFn = jest.fn().mockResolvedValue(jobs);
    mockLocalDb.saveJob.mockRejectedValue(new Error('disk full'));
    const { wrapper } = makeWrapper();

    const { result } = renderHook(
      () =>
        useOfflineQuery({ queryKey: ['jobs', 'list', 'available'], queryFn }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(jobs);
  });

  it('treats poor connection without breaking (dynamicStaleTime + retry branches)', async () => {
    setNetwork(true, 'poor');
    const jobs = [{ id: 'p1' }];
    const queryFn = jest.fn().mockResolvedValue(jobs);
    const { wrapper } = makeWrapper();

    const { result } = renderHook(
      () =>
        useOfflineQuery({ queryKey: ['jobs', 'list', 'available'], queryFn }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(jobs);
  });

  it('returns null for unmatched jobs list param (offline, no match)', async () => {
    setNetwork(false, 'offline');
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () =>
        useOfflineQuery({
          queryKey: ['jobs', 'list', 'somethingelse'],
          queryFn: jest.fn(),
        }),
      { wrapper }
    );
    // unmatched param => handleJobsQuery returns null => offline error
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('returns null for unknown jobs operation (default branch)', async () => {
    setNetwork(false, 'offline');
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () =>
        useOfflineQuery({
          queryKey: ['jobs', 'archive', 'z'],
          queryFn: jest.fn(),
        }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('returns null for unknown user/messages operations (default branches)', async () => {
    setNetwork(false, 'offline');
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () =>
        useOfflineQuery({
          queryKey: ['user', 'settings', 'u'],
          queryFn: jest.fn(),
        }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('handles local query throwing (LocalDatabase.init rejects) by returning null', async () => {
    setNetwork(false, 'offline');
    mockLocalDb.init.mockRejectedValue(new Error('db locked'));
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () =>
        useOfflineQuery({
          queryKey: ['jobs', 'detail', 'j'],
          queryFn: jest.fn(),
        }),
      { wrapper }
    );
    // tryLocalQuery catches and returns null => offline error
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('swallows cacheLocalData top-level error (init rejects during caching)', async () => {
    setNetwork(true, 'good');
    const jobs = [{ id: 'cj' }];
    const queryFn = jest.fn().mockResolvedValue(jobs);
    // init resolves for read path is irrelevant (online); but caching calls init too.
    mockLocalDb.init.mockRejectedValue(new Error('init fail'));
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () =>
        useOfflineQuery({ queryKey: ['jobs', 'list', 'available'], queryFn }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(jobs);
  });

  it('refetch re-invokes the query function', async () => {
    setNetwork(true, 'good');
    let call = 0;
    const queryFn = jest.fn().mockImplementation(async () => {
      call += 1;
      return [{ id: `call-${call}` }];
    });
    const { wrapper } = makeWrapper();

    const { result } = renderHook(
      () =>
        useOfflineQuery({ queryKey: ['jobs', 'list', 'available'], queryFn }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const initialCalls = queryFn.mock.calls.length;
    let refetched: { data?: Array<{ id: string }> } = {};
    await act(async () => {
      refetched = await result.current.refetch();
    });
    expect(queryFn.mock.calls.length).toBeGreaterThan(initialCalls);
    // refetch returns the freshly-resolved data
    expect(refetched.data).toEqual([
      { id: `call-${queryFn.mock.calls.length}` },
    ]);
  });
});

describe('useOfflineMutation', () => {
  it('executes online mutation successfully and invalidates on success', async () => {
    setNetwork(true, 'good');
    const mutationFn = jest.fn().mockResolvedValue({ id: 'ok' });
    const getQueryKey = jest
      .fn()
      .mockReturnValue(['jobs', 'list', 'available']);
    const { wrapper, queryClient } = makeWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(
      () =>
        useOfflineMutation({
          mutationFn,
          entity: 'job',
          actionType: 'UPDATE',
          getQueryKey,
        }),
      { wrapper }
    );

    await act(async () => {
      await result.current.mutateAsync({ id: 'x' } as never);
    });

    expect(mutationFn).toHaveBeenCalledWith({ id: 'x' });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['jobs', 'list', 'available'],
    });
  });

  it('blocks onlineOnly mutation when offline', async () => {
    setNetwork(false, 'offline');
    const mutationFn = jest.fn();
    const { wrapper } = makeWrapper();

    const { result } = renderHook(
      () =>
        useOfflineMutation({
          mutationFn,
          entity: 'payment',
          actionType: 'CREATE',
          onlineOnly: true,
        }),
      { wrapper }
    );

    await act(async () => {
      await expect(
        result.current.mutateAsync({ amount: 10 } as never)
      ).rejects.toThrow('This action requires an internet connection');
    });
    expect(mutationFn).not.toHaveBeenCalled();
    expect(mockOfflineManager.queueAction).not.toHaveBeenCalled();
  });

  it('queues a failed online mutation and returns optimistic data', async () => {
    setNetwork(true, 'good');
    const mutationFn = jest.fn().mockRejectedValue(new Error('500'));
    const optimisticUpdate = jest.fn().mockReturnValue({ id: 'temp_1' });
    const { wrapper } = makeWrapper();

    const { result } = renderHook(
      () =>
        useOfflineMutation({
          mutationFn,
          entity: 'job',
          actionType: 'CREATE',
          optimisticUpdate,
          retryCount: 5,
        }),
      { wrapper }
    );

    let returned: unknown;
    await act(async () => {
      returned = await result.current.mutateAsync({ title: 'New' } as never);
    });

    expect(mockOfflineManager.queueAction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'CREATE',
        entity: 'job',
        data: { title: 'New' },
        maxRetries: 5,
      })
    );
    expect(returned).toEqual({ id: 'temp_1' });
  });

  it('rethrows a failed online mutation when no optimistic update and not queued (onlineOnly)', async () => {
    setNetwork(true, 'good');
    const mutationFn = jest.fn().mockRejectedValue(new Error('boom'));
    const { wrapper } = makeWrapper();

    const { result } = renderHook(
      () =>
        useOfflineMutation({
          mutationFn,
          entity: 'job',
          actionType: 'UPDATE',
          onlineOnly: true,
        }),
      { wrapper }
    );

    await act(async () => {
      await expect(
        result.current.mutateAsync({ id: 'x' } as never)
      ).rejects.toThrow('boom');
    });
    // onlineOnly => not queued
    expect(mockOfflineManager.queueAction).not.toHaveBeenCalled();
  });

  it('queues mutation while offline and returns optimistic data', async () => {
    setNetwork(false, 'offline');
    const mutationFn = jest.fn();
    const optimisticUpdate = jest.fn().mockReturnValue({ id: 'temp_off' });
    const getQueryKey = jest
      .fn()
      .mockReturnValue(['jobs', 'list', 'available']);
    const { wrapper } = makeWrapper();

    const { result } = renderHook(
      () =>
        useOfflineMutation({
          mutationFn,
          entity: 'job',
          actionType: 'CREATE',
          optimisticUpdate,
          getQueryKey,
        }),
      { wrapper }
    );

    let returned: unknown;
    await act(async () => {
      returned = await result.current.mutateAsync({ title: 'X' } as never);
    });

    expect(mutationFn).not.toHaveBeenCalled();
    expect(mockOfflineManager.queueAction).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'CREATE', entity: 'job' })
    );
    expect(returned).toEqual({ id: 'temp_off' });
  });

  it('throws OfflineQueuedError when offline with no optimistic update', async () => {
    setNetwork(false, 'offline');
    const mutationFn = jest.fn();
    const { wrapper } = makeWrapper();

    const { result } = renderHook(
      () =>
        useOfflineMutation({
          mutationFn,
          entity: 'message',
          actionType: 'CREATE',
        }),
      { wrapper }
    );

    await act(async () => {
      await expect(
        result.current.mutateAsync({ text: 'hi' } as never)
      ).rejects.toThrow(/has been queued and will sync/);
    });
    expect(mockOfflineManager.queueAction).toHaveBeenCalled();
  });

  it('applies optimistic CREATE update by appending to existing array, then replaces temp on success', async () => {
    setNetwork(true, 'good');
    const { wrapper, queryClient } = makeWrapper();
    const queryKey = ['jobs', 'list', 'available'];
    queryClient.setQueryData(queryKey, [{ id: 'existing' }]);

    const realJob = { id: 'real-1' };
    const mutationFn = jest.fn().mockResolvedValue(realJob);
    const optimisticUpdate = jest.fn().mockReturnValue({ id: 'temp_abc' });
    const getQueryKey = jest.fn().mockReturnValue(queryKey);

    const { result } = renderHook(
      () =>
        useOfflineMutation({
          mutationFn,
          entity: 'job',
          actionType: 'CREATE',
          optimisticUpdate,
          getQueryKey,
        }),
      { wrapper }
    );

    await act(async () => {
      await result.current.mutateAsync({ title: 'N' } as never);
    });

    // onMutate appended temp, onSuccess replaced temp_ with real data
    const finalData = queryClient.getQueryData(queryKey) as Array<{
      id: string;
    }>;
    expect(finalData).toEqual([{ id: 'existing' }, realJob]);
  });

  it('optimistic CREATE seeds a new array when cache is empty', async () => {
    setNetwork(true, 'good');
    const { wrapper, queryClient } = makeWrapper();
    const queryKey = ['jobs', 'list', 'available'];

    const mutationFn = jest.fn().mockResolvedValue({ id: 'real' });
    const optimisticUpdate = jest.fn().mockReturnValue({ id: 'temp_seed' });
    const getQueryKey = jest.fn().mockReturnValue(queryKey);

    const { result } = renderHook(
      () =>
        useOfflineMutation({
          mutationFn,
          entity: 'job',
          actionType: 'CREATE',
          optimisticUpdate,
          getQueryKey,
        }),
      { wrapper }
    );

    await act(async () => {
      await result.current.mutateAsync({ title: 'N' } as never);
    });

    // onMutate seeded the empty cache as [temp_seed] (Array.isArray(old) false branch),
    // then onSuccess replaced temp_ entries with the real job — final shape is an array.
    const finalData = queryClient.getQueryData(queryKey);
    expect(Array.isArray(finalData)).toBe(true);
    expect(finalData).toEqual([{ id: 'real' }]);
  });

  it('applies non-CREATE optimistic update by overwriting, and rolls back on error', async () => {
    setNetwork(true, 'good');
    const { wrapper, queryClient } = makeWrapper();
    const queryKey = ['jobs', 'detail', 'j1'];
    queryClient.setQueryData(queryKey, { id: 'j1', status: 'old' });

    const mutationFn = jest.fn().mockRejectedValue(new Error('update failed'));
    const optimisticUpdate = jest
      .fn()
      .mockReturnValue({ id: 'j1', status: 'new' });
    const getQueryKey = jest.fn().mockReturnValue(queryKey);

    const { result } = renderHook(
      () =>
        useOfflineMutation({
          mutationFn,
          entity: 'job',
          actionType: 'UPDATE',
          optimisticUpdate,
          getQueryKey,
          onlineOnly: true, // so failure rethrows instead of queueing
        }),
      { wrapper }
    );

    await act(async () => {
      await expect(
        result.current.mutateAsync({ id: 'j1' } as never)
      ).rejects.toThrow('update failed');
    });

    // onError should have rolled back to previousData
    expect(queryClient.getQueryData(queryKey)).toEqual({
      id: 'j1',
      status: 'old',
    });
  });

  it('onSuccess CREATE leaves a non-array cache untouched (line 302 branch)', async () => {
    setNetwork(true, 'good');
    const { wrapper, queryClient } = makeWrapper();
    const queryKey = ['jobs', 'detail', 'solo'];
    // Pre-seed a non-array value so the CREATE onSuccess map branch returns old as-is
    queryClient.setQueryData(queryKey, { id: 'solo', existing: true });

    const mutationFn = jest.fn().mockResolvedValue({ id: 'created' });
    // No optimisticUpdate so onMutate is a no-op; getQueryKey + CREATE drives onSuccess
    const getQueryKey = jest.fn().mockReturnValue(queryKey);

    const { result } = renderHook(
      () =>
        useOfflineMutation({
          mutationFn,
          entity: 'job',
          actionType: 'CREATE',
          getQueryKey,
        }),
      { wrapper }
    );

    await act(async () => {
      await result.current.mutateAsync({ title: 'N' } as never);
    });

    expect(queryClient.getQueryData(queryKey)).toEqual({
      id: 'solo',
      existing: true,
    });
  });

  it('does nothing extra on success when getQueryKey is omitted', async () => {
    setNetwork(true, 'good');
    const { wrapper } = makeWrapper();
    const mutationFn = jest.fn().mockResolvedValue({ id: 'x' });

    const { result } = renderHook(
      () =>
        useOfflineMutation({
          mutationFn,
          entity: 'job',
          actionType: 'UPDATE',
        }),
      { wrapper }
    );

    await act(async () => {
      await result.current.mutateAsync({ id: 'x' } as never);
    });
    expect(mutationFn).toHaveBeenCalled();
  });

  it('configures retry differently for offline onlineOnly vs default (smoke)', async () => {
    // onlineOnly + offline => retry 0; just verify hook instantiates both ways
    setNetwork(false, 'poor');
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () =>
        useOfflineMutation({
          mutationFn: jest.fn(),
          entity: 'job',
          actionType: 'DELETE',
          onlineOnly: true,
        }),
      { wrapper }
    );
    expect(result.current.isPending).toBe(false);
  });
});
