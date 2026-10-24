import { act, cleanup, renderHook } from '@testing-library/react';
const mocks = vi.hoisted(() => ({
  channel: vi.fn(),
  removeChannel: vi.fn(),
  warn: vi.fn(),
}));
vi.mock('@/lib/supabase', () => ({ supabase: mocks }));
vi.mock('@/lib/logger', () => ({ logger: { warn: mocks.warn } }));
import { useRealtime } from '@/hooks/useRealtime';

function makeChannel() {
  let connection: (status: string) => void;
  let change: (payload: unknown) => void;
  const channel = {
    on: vi.fn((_event, _filter, callback) => {
      change = callback;
      return channel;
    }),
    subscribe: vi.fn((callback) => {
      connection = callback;
      return channel;
    }),
    status: (status: string) => connection(status),
    emit: () => change({ eventType: 'INSERT', new: { id: 'synthetic' } }),
  };
  return channel;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.channel.mockImplementation(makeChannel);
  mocks.removeChannel.mockResolvedValue('ok');
});
afterEach(cleanup);

it('contains a Safari synchronous WebSocket exception and releases the channel', () => {
  const channel = makeChannel();
  channel.subscribe.mockImplementation(() => {
    throw new DOMException('The operation is insecure.', 'SecurityError');
  });
  mocks.channel.mockReturnValueOnce(channel);
  const onError = vi.fn();
  const { result } = renderHook(() =>
    useRealtime({ table: 'notifications', onError })
  );
  expect(result.current.status.connected).toBe(false);
  expect(result.current.status.error).toBe(
    'Realtime connection could not be opened'
  );
  expect(onError).toHaveBeenCalledTimes(1);
  expect(mocks.removeChannel).toHaveBeenCalledWith(channel);
});

it('uses current callbacks and ignores replaced channels after an account change', () => {
  const first = vi.fn();
  const latest = vi.fn();
  const { result, rerender } = renderHook(
    ({ filter, onInsert }) =>
      useRealtime({ table: 'notifications', filter, onInsert }),
    {
      initialProps: { filter: 'user_id=eq.first', onInsert: first },
    }
  );
  const oldChannel = mocks.channel.mock.results[0].value;
  rerender({ filter: 'user_id=eq.first', onInsert: latest });
  act(() => oldChannel.emit());
  expect(latest).toHaveBeenCalledTimes(1);
  expect(first).not.toHaveBeenCalled();
  expect(mocks.channel).toHaveBeenCalledTimes(1);
  rerender({ filter: 'user_id=eq.second', onInsert: latest });
  act(() => {
    oldChannel.emit();
    oldChannel.status('SUBSCRIBED');
  });
  expect(latest).toHaveBeenCalledTimes(1);
  expect(result.current.status.connected).toBe(false);
  expect(mocks.removeChannel).toHaveBeenCalledWith(oldChannel);
});

it('reports disconnects and reconnection, and handles terminal closure', () => {
  const { result } = renderHook(() => useRealtime({ table: 'notifications' }));
  const channel = mocks.channel.mock.results[0].value;
  act(() => channel.status('SUBSCRIBED'));
  expect(result.current.status.connected).toBe(true);
  act(() => channel.status('TIMED_OUT'));
  expect(result.current.status.connected).toBe(false);
  act(() => channel.status('SUBSCRIBED'));
  expect(result.current.status.error).toBeNull();
  act(() => channel.status('CLOSED'));
  expect(result.current.status.connected).toBe(false);
  expect(mocks.removeChannel).toHaveBeenCalledWith(channel);
});

it('bounds connecting channels and frees slots on cleanup, including rejected cleanup', async () => {
  const hooks = Array.from({ length: 10 }, () =>
    renderHook(() => useRealtime({ table: 'notifications' }))
  );
  const overflow = renderHook(() => useRealtime({ table: 'notifications' }));
  expect(overflow.result.current.status.error).toContain('Channel limit');
  expect(mocks.channel).toHaveBeenCalledTimes(10);
  expect(new Set(mocks.channel.mock.calls.map(([name]) => name)).size).toBe(10);
  mocks.removeChannel.mockRejectedValueOnce(new Error('cleanup failed'));
  await act(async () => hooks[0].unmount());
  act(() => overflow.result.current.subscribe());
  expect(overflow.result.current.status.error).toBeNull();
  expect(mocks.channel).toHaveBeenCalledTimes(11);
});
