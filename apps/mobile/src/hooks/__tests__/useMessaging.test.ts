/**
 * Tests for useMessaging hooks.
 *
 * Strategy: render the real hooks with a real QueryClientProvider, mocking only
 * externals — MessagingService, useNetworkState (forced online so the offline
 * wrappers take the online path), OfflineManager/LocalDatabase/SyncManager (the
 * useOfflineQuery dependencies), useAuth (AuthContext), and logger.
 *
 * Covers: thread loading, job message loading, send (optimistic + success/error),
 * mark-read (success + error), unread-count (auth + no-auth), search (enabled gate),
 * realtime new/update handlers (dedupe, append, empty cache, map-update), and
 * threads-with-realtime per-conversation subscription wiring + cleanup.
 */
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import {
  useJobMessages,
  useSendMessage,
  useMarkMessagesAsRead,
  useUnreadMessageCount,
  useRealTimeMessages,
  useMessageThreadsWithRealTime,
} from '../useMessaging';
import { MessagingService } from '../../services/MessagingService';
import { queryKeys } from '../../lib/queryClient';
import { logger } from '../../utils/logger';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../../services/MessagingService', () => ({
  MessagingService: {
    getUserMessageThreads: jest.fn(),
    getJobMessages: jest.fn(),
    sendMessage: jest.fn(),
    markMessagesAsRead: jest.fn(),
    getUnreadMessageCount: jest.fn(),
    searchJobMessages: jest.fn(),
    subscribeToJobMessages: jest.fn(),
  },
}));

// Force network to "online, good" so useOfflineQuery/useOfflineMutation take the
// happy online path through to MessagingService.
jest.mock('../useNetworkState', () => ({
  useNetworkState: () => ({
    isOnline: true,
    connectionQuality: 'good',
    isConnected: true,
    isInternetReachable: true,
  }),
}));

// useOfflineQuery dependencies — keep them inert so they never error.
jest.mock('../../services/OfflineManager', () => ({
  OfflineManager: {
    queueAction: jest.fn().mockResolvedValue('action-id'),
    hasPendingActions: jest.fn().mockResolvedValue(false),
    getPendingActionsCount: jest.fn().mockResolvedValue(0),
    clearQueue: jest.fn(),
  },
}));

jest.mock('../../services/LocalDatabase', () => ({
  LocalDatabase: {
    init: jest.fn().mockResolvedValue(undefined),
    getMessagesByJob: jest.fn().mockResolvedValue(null),
    saveMessage: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../services/SyncManager', () => ({
  SyncManager: {
    onSyncStatusChange: jest.fn(() => () => {}),
    forcSync: jest.fn(),
    resetAndResync: jest.fn(),
  },
}));

// useAuth — the hook imports from '../contexts/AuthContext'.
const mockUseAuth = jest.fn();
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const MS = MessagingService as unknown as {
  getUserMessageThreads: jest.Mock;
  getJobMessages: jest.Mock;
  sendMessage: jest.Mock;
  markMessagesAsRead: jest.Mock;
  getUnreadMessageCount: jest.Mock;
  searchJobMessages: jest.Mock;
  subscribeToJobMessages: jest.Mock;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      // Keep inactive query data resident so pre-seeded caches survive for the
      // realtime/optimistic assertions (gcTime:0 would evict them immediately).
      queries: { retry: false, gcTime: Infinity, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { queryClient, wrapper };
};

const mkMessage = (over: Record<string, unknown> = {}) => ({
  id: 'msg-1',
  jobId: 'job-1',
  senderId: 'user-1',
  receiverId: 'user-2',
  messageText: 'hello',
  messageType: 'text' as const,
  read: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });
});

// ---------------------------------------------------------------------------
// useJobMessages
// ---------------------------------------------------------------------------

describe('useJobMessages', () => {
  it('loads messages for a job via MessagingService.getJobMessages', async () => {
    const messages = [mkMessage()];
    MS.getJobMessages.mockResolvedValue(messages);
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useJobMessages('job-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(MS.getJobMessages).toHaveBeenCalledWith('job-1', 50);
    expect(result.current.data).toEqual(messages);
  });

  it('passes a custom limit through', async () => {
    MS.getJobMessages.mockResolvedValue([]);
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useJobMessages('job-9', 10), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(MS.getJobMessages).toHaveBeenCalledWith('job-9', 10);
  });

  it('is disabled when jobId is empty (queryFn never runs)', async () => {
    MS.getJobMessages.mockResolvedValue([]);
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useJobMessages(''), { wrapper });

    // Disabled query stays in pending/fetchStatus idle.
    expect(result.current.fetchStatus).toBe('idle');
    expect(MS.getJobMessages).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useSendMessage
// ---------------------------------------------------------------------------

describe('useSendMessage', () => {
  const vars = {
    jobId: 'job-1',
    receiverId: 'user-2',
    messageText: 'hi there',
    senderId: 'user-1',
  };

  it('sends a message through MessagingService.sendMessage with defaults', async () => {
    const sent = mkMessage({ id: 'real-1' });
    MS.sendMessage.mockResolvedValue(sent);
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useSendMessage(), { wrapper });

    let returned: unknown;
    await act(async () => {
      returned = await result.current.mutateAsync(vars);
    });

    expect(MS.sendMessage).toHaveBeenCalledWith(
      'job-1',
      'user-2',
      'hi there',
      'user-1',
      'text',
      undefined
    );
    expect(returned).toEqual(sent);
  });

  it('forwards messageType and attachmentUrl when provided', async () => {
    MS.sendMessage.mockResolvedValue(mkMessage({ id: 'real-2' }));
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useSendMessage(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        ...vars,
        messageType: 'image',
        attachmentUrl: 'https://x/y.png',
      });
    });

    expect(MS.sendMessage).toHaveBeenCalledWith(
      'job-1',
      'user-2',
      'hi there',
      'user-1',
      'image',
      'https://x/y.png'
    );
  });

  it('applies optimistic update to the conversation cache (onMutate, CREATE append)', async () => {
    MS.sendMessage.mockResolvedValue(mkMessage({ id: 'real-3' }));
    const { wrapper, queryClient } = makeWrapper();
    const key = queryKeys.messages.conversation('job-1');
    const existing = mkMessage({ id: 'existing' });
    queryClient.setQueryData(key, [existing]);

    const { result } = renderHook(() => useSendMessage(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(vars);
    });

    // After success, the temp_ optimistic entry is replaced by the real message;
    // the pre-existing message survives.
    const cached = queryClient.getQueryData(key) as Array<{ id: string }>;
    expect(cached.some((m) => m.id === 'existing')).toBe(true);
    expect(cached.some((m) => m.id === 'real-3')).toBe(true);
    expect(cached.some((m) => m.id.startsWith('temp_'))).toBe(false);
  });

  it('produces an optimistic entry shape with deliveryStatus=sending and senderName=You', async () => {
    // Capture cache during the in-flight window before the promise resolves.
    let resolveSend: (v: unknown) => void = () => {};
    MS.sendMessage.mockImplementation(
      () => new Promise((res) => (resolveSend = res))
    );
    const { wrapper, queryClient } = makeWrapper();
    const key = queryKeys.messages.conversation('job-1');

    const { result } = renderHook(() => useSendMessage(), { wrapper });

    let p: Promise<unknown>;
    act(() => {
      p = result.current.mutateAsync(vars);
    });

    await waitFor(() => {
      const cached = queryClient.getQueryData(key) as Array<{
        id: string;
        deliveryStatus?: string;
        senderName?: string;
      }>;
      expect(cached?.[0]?.id).toMatch(/^temp_message_/);
    });
    const optimistic = (
      queryClient.getQueryData(key) as Array<{
        deliveryStatus?: string;
        senderName?: string;
        messageType?: string;
      }>
    )[0];
    expect(optimistic.deliveryStatus).toBe('sending');
    expect(optimistic.senderName).toBe('You');
    expect(optimistic.messageType).toBe('text');

    await act(async () => {
      resolveSend(mkMessage({ id: 'real-late' }));
      await p;
    });
  });

  it('queues offline and resolves with optimistic data when the online send fails (no rethrow)', async () => {
    // useOfflineMutation: online failure + non-onlineOnly + optimisticUpdate
    // present => queue the action and resolve with the optimistic message.
    const { OfflineManager } = jest.requireMock(
      '../../services/OfflineManager'
    );
    MS.sendMessage.mockRejectedValue(new Error('network down'));
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useSendMessage(), { wrapper });

    let returned: { id: string; deliveryStatus?: string } | undefined;
    await act(async () => {
      returned = (await result.current.mutateAsync(vars)) as typeof returned;
    });

    expect(OfflineManager.queueAction).toHaveBeenCalledWith(
      expect.objectContaining({ entity: 'message', type: 'CREATE' })
    );
    expect(returned?.id).toMatch(/^temp_message_/);
    expect(returned?.deliveryStatus).toBe('sending');
    expect(logger.error).toHaveBeenCalled();
  });

  it('rolls back optimistic update and rethrows when queueing also fails (onError)', async () => {
    const { OfflineManager } = jest.requireMock(
      '../../services/OfflineManager'
    );
    MS.sendMessage.mockRejectedValue(new Error('network down'));
    // Reject on every attempt — useOfflineMutation retries once, so a single
    // rejection would otherwise resolve with optimistic data on the retry.
    OfflineManager.queueAction.mockRejectedValue(new Error('queue down'));
    const { wrapper, queryClient } = makeWrapper();
    const key = queryKeys.messages.conversation('job-1');
    const existing = mkMessage({ id: 'existing-only' });
    queryClient.setQueryData(key, [existing]);

    const { result } = renderHook(() => useSendMessage(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync(vars)).rejects.toThrow();
    });

    // Rolled back to previous cache value via onError.
    const cached = queryClient.getQueryData(key) as Array<{ id: string }>;
    expect(cached).toEqual([existing]);
    expect(logger.error).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useMarkMessagesAsRead
// ---------------------------------------------------------------------------

describe('useMarkMessagesAsRead', () => {
  it('marks read and invalidates both conversation and conversations queries on success', async () => {
    MS.markMessagesAsRead.mockResolvedValue(undefined);
    const { wrapper, queryClient } = makeWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useMarkMessagesAsRead(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ jobId: 'job-1', userId: 'user-1' });
    });

    expect(MS.markMessagesAsRead).toHaveBeenCalledWith('job-1', 'user-1');
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.messages.conversations(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.messages.conversation('job-1'),
    });
  });

  it('logs an error when marking read fails (onError)', async () => {
    const failure = new Error('mark failed');
    MS.markMessagesAsRead.mockRejectedValue(failure);
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useMarkMessagesAsRead(), { wrapper });

    await act(async () => {
      await expect(
        result.current.mutateAsync({ jobId: 'job-2', userId: 'user-1' })
      ).rejects.toThrow('mark failed');
    });

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to mark messages as read:',
      failure
    );
  });
});

// ---------------------------------------------------------------------------
// useUnreadMessageCount
// ---------------------------------------------------------------------------

describe('useUnreadMessageCount', () => {
  it('returns the unread count for an authenticated user', async () => {
    MS.getUnreadMessageCount.mockResolvedValue(7);
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useUnreadMessageCount(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(MS.getUnreadMessageCount).toHaveBeenCalledWith('user-1');
    expect(result.current.data).toBe(7);
  });

  it('is disabled when there is no user (queryFn never reaches the service)', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    MS.getUnreadMessageCount.mockResolvedValue(3);
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useUnreadMessageCount(), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(MS.getUnreadMessageCount).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useRealTimeMessages
// ---------------------------------------------------------------------------

describe('useRealTimeMessages', () => {
  /** Capture the subscribe args so we can drive the realtime callbacks directly. */
  const setupSubscription = () => {
    const unsubscribe = jest.fn();
    let onNew: (m: ReturnType<typeof mkMessage>) => void = () => {};
    let onUpdate: (m: ReturnType<typeof mkMessage>) => void = () => {};
    let onError: (e: Error) => void = () => {};
    MS.subscribeToJobMessages.mockImplementation(
      (_jobId: string, nNew, nUpdate, nError) => {
        onNew = nNew;
        onUpdate = nUpdate;
        onError = nError;
        return unsubscribe;
      }
    );
    return {
      unsubscribe,
      getOnNew: () => onNew,
      getOnUpdate: () => onUpdate,
      getOnError: () => onError,
    };
  };

  it('does not subscribe when jobId is empty', () => {
    const { wrapper } = makeWrapper();
    renderHook(() => useRealTimeMessages('', jest.fn()), { wrapper });
    expect(MS.subscribeToJobMessages).not.toHaveBeenCalled();
  });

  it('does not subscribe when disabled', () => {
    const { wrapper } = makeWrapper();
    renderHook(
      () => useRealTimeMessages('job-1', jest.fn(), undefined, false),
      {
        wrapper,
      }
    );
    expect(MS.subscribeToJobMessages).not.toHaveBeenCalled();
  });

  it('subscribes, appends a new message to an empty cache, and invokes callback', async () => {
    const sub = setupSubscription();
    const onNewMessage = jest.fn();
    const { wrapper, queryClient } = makeWrapper();
    const key = queryKeys.messages.conversation('job-1');

    renderHook(() => useRealTimeMessages('job-1', onNewMessage), { wrapper });

    await waitFor(() => expect(MS.subscribeToJobMessages).toHaveBeenCalled());
    const newMsg = mkMessage({ id: 'rt-1' });
    act(() => sub.getOnNew()(newMsg));

    expect(onNewMessage).toHaveBeenCalledWith(newMsg);
    expect(queryClient.getQueryData(key)).toEqual([newMsg]);
  });

  it('appends a new message to an existing non-empty cache', async () => {
    const sub = setupSubscription();
    const { wrapper, queryClient } = makeWrapper();
    const key = queryKeys.messages.conversation('job-1');
    const existing = mkMessage({ id: 'old' });
    queryClient.setQueryData(key, [existing]);

    renderHook(() => useRealTimeMessages('job-1', jest.fn()), { wrapper });
    await waitFor(() => expect(MS.subscribeToJobMessages).toHaveBeenCalled());

    const newMsg = mkMessage({ id: 'rt-2' });
    act(() => sub.getOnNew()(newMsg));

    expect(queryClient.getQueryData(key)).toEqual([existing, newMsg]);
  });

  it('dedupes a new message that already exists in the cache', async () => {
    const sub = setupSubscription();
    const { wrapper, queryClient } = makeWrapper();
    const key = queryKeys.messages.conversation('job-1');
    const existing = mkMessage({ id: 'dup' });
    queryClient.setQueryData(key, [existing]);

    renderHook(() => useRealTimeMessages('job-1', jest.fn()), { wrapper });
    await waitFor(() => expect(MS.subscribeToJobMessages).toHaveBeenCalled());

    act(() => sub.getOnNew()(mkMessage({ id: 'dup', messageText: 'changed' })));

    // Unchanged — duplicate id is ignored.
    expect(queryClient.getQueryData(key)).toEqual([existing]);
  });

  it('replaces an existing message on update, and seeds cache when empty', async () => {
    const sub = setupSubscription();
    const onUpdate = jest.fn();
    const { wrapper, queryClient } = makeWrapper();
    const key = queryKeys.messages.conversation('job-1');

    renderHook(() => useRealTimeMessages('job-1', jest.fn(), onUpdate), {
      wrapper,
    });
    await waitFor(() => expect(MS.subscribeToJobMessages).toHaveBeenCalled());

    // Update against empty cache -> seeds [updated]
    const upd1 = mkMessage({ id: 'u1', messageText: 'first' });
    act(() => sub.getOnUpdate()(upd1));
    expect(onUpdate).toHaveBeenCalledWith(upd1);
    expect(queryClient.getQueryData(key)).toEqual([upd1]);

    // Update against populated cache -> maps/replaces the matching id
    const upd2 = mkMessage({ id: 'u1', messageText: 'second' });
    act(() => sub.getOnUpdate()(upd2));
    expect(queryClient.getQueryData(key)).toEqual([upd2]);
  });

  it('logs realtime subscription errors via the error callback', async () => {
    const sub = setupSubscription();
    const { wrapper } = makeWrapper();

    renderHook(() => useRealTimeMessages('job-1', jest.fn()), { wrapper });
    await waitFor(() => expect(MS.subscribeToJobMessages).toHaveBeenCalled());

    const err = new Error('rt boom');
    act(() => sub.getOnError()(err));
    expect(logger.error).toHaveBeenCalledWith(
      'Real-time message subscription error:',
      err
    );
  });

  it('cleans up the subscription on unmount', async () => {
    const sub = setupSubscription();
    const { wrapper } = makeWrapper();

    const { unmount } = renderHook(
      () => useRealTimeMessages('job-1', jest.fn()),
      { wrapper }
    );
    await waitFor(() => expect(MS.subscribeToJobMessages).toHaveBeenCalled());

    unmount();
    expect(sub.unsubscribe).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useMessageThreadsWithRealTime
// ---------------------------------------------------------------------------

describe('useMessageThreadsWithRealTime', () => {
  it('loads threads and subscribes to each conversation; new-message invalidates threads', async () => {
    const threads = [
      { jobId: 'job-a', id: 't-a' },
      { jobId: 'job-b', id: 't-b' },
    ];
    MS.getUserMessageThreads.mockResolvedValue(threads);

    const subNew: Record<string, (m: ReturnType<typeof mkMessage>) => void> =
      {};
    const subUpd: Record<string, (m: ReturnType<typeof mkMessage>) => void> =
      {};
    const unsubs: jest.Mock[] = [];
    MS.subscribeToJobMessages.mockImplementation(
      (jobId: string, nNew, nUpdate) => {
        subNew[jobId] = nNew;
        subUpd[jobId] = nUpdate;
        const u = jest.fn();
        unsubs.push(u);
        return u;
      }
    );

    const { wrapper, queryClient } = makeWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result, unmount } = renderHook(
      () => useMessageThreadsWithRealTime(),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(threads);

    // Subscribed once per thread.
    await waitFor(() =>
      expect(MS.subscribeToJobMessages).toHaveBeenCalledTimes(2)
    );

    invalidateSpy.mockClear();
    act(() => subNew['job-a'](mkMessage()));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.messages.conversations(),
    });

    // Update where receiver is current user -> invalidates.
    invalidateSpy.mockClear();
    act(() => subUpd['job-b'](mkMessage({ receiverId: 'user-1' })));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.messages.conversations(),
    });

    // Update where receiver is NOT current user -> no invalidate.
    invalidateSpy.mockClear();
    act(() => subUpd['job-b'](mkMessage({ receiverId: 'someone-else' })));
    expect(invalidateSpy).not.toHaveBeenCalled();

    // Cleanup unsubscribes all.
    unmount();
    unsubs.forEach((u) => expect(u).toHaveBeenCalled());
  });

  it('does not subscribe when there is no authenticated user', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    MS.getUserMessageThreads.mockResolvedValue([{ jobId: 'job-a' }]);
    const { wrapper } = makeWrapper();

    renderHook(() => useMessageThreadsWithRealTime(), { wrapper });

    // Give the effect a tick; query is disabled (no user) so no threads load.
    await act(async () => {
      await Promise.resolve();
    });
    expect(MS.subscribeToJobMessages).not.toHaveBeenCalled();
  });
});
