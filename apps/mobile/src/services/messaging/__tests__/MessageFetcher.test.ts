import {
  getJobMessages,
  getUserMessageThreads,
  searchJobMessages,
  getVideoCallMessages,
  getUnreadMessageCount,
} from '../MessageFetcher';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import { logger } from '../../../utils/logger';
import { isValidSearchTerm } from '../../../utils/sqlSanitization';
import type { Message } from '../types';

jest.mock('../../../utils/mobileApiClient', () => ({
  mobileApiClient: { get: jest.fn() },
}));

jest.mock('../../../utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../../utils/sqlSanitization', () => ({
  isValidSearchTerm: jest.fn(),
}));

const mockGet = mobileApiClient.get as jest.Mock;
const mockIsValid = isValidSearchTerm as jest.Mock;
const mockWarn = logger.warn as jest.Mock;
const mockError = logger.error as jest.Mock;

function msg(over: Partial<Message> = {}): Message {
  return {
    id: over.id ?? 'm1',
    jobId: over.jobId ?? 'job-1',
    senderId: over.senderId ?? 's1',
    receiverId: over.receiverId ?? 'r1',
    messageText: over.messageText ?? 'hello',
    messageType: over.messageType ?? 'text',
    read: over.read ?? false,
    createdAt: over.createdAt ?? '2026-01-01T00:00:00Z',
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  // clearAllMocks does not flush queued one-time return values from a
  // prior test (e.g. the safety-cap test queues more pages than it
  // consumes), so reset the mock implementation explicitly.
  mockGet.mockReset();
  mockIsValid.mockReturnValue(true);
});

describe('getJobMessages', () => {
  it('returns sorted messages from a single page when no nextCursor', async () => {
    mockGet.mockResolvedValueOnce({
      messages: [
        msg({ id: 'b', createdAt: '2026-01-02T00:00:00Z' }),
        msg({ id: 'a', createdAt: '2026-01-01T00:00:00Z' }),
      ],
    });

    const result = await getJobMessages('job-9');

    expect(result.map((m) => m.id)).toEqual(['a', 'b']);
    expect(mockGet).toHaveBeenCalledTimes(1);
    // First page: limit=50, no cursor param.
    const url = mockGet.mock.calls[0][0] as string;
    expect(url).toContain('/api/messages/threads/job-9/messages?');
    expect(url).toContain('limit=50');
    expect(url).not.toContain('cursor=');
  });

  it('url-encodes the jobId', async () => {
    mockGet.mockResolvedValueOnce({ messages: [] });
    await getJobMessages('job/with space');
    const url = mockGet.mock.calls[0][0] as string;
    expect(url).toContain(encodeURIComponent('job/with space'));
  });

  it('follows nextCursor across pages and re-sorts ascending', async () => {
    mockGet
      .mockResolvedValueOnce({
        messages: [msg({ id: 'p1', createdAt: '2026-01-05T00:00:00Z' })],
        nextCursor: 'cur-1',
      })
      .mockResolvedValueOnce({
        messages: [msg({ id: 'p2', createdAt: '2026-01-01T00:00:00Z' })],
      });

    const result = await getJobMessages('job-1');

    expect(result.map((m) => m.id)).toEqual(['p2', 'p1']);
    expect(mockGet).toHaveBeenCalledTimes(2);
    // Second request must include the cursor from page 1.
    const secondUrl = mockGet.mock.calls[1][0] as string;
    expect(secondUrl).toContain('cursor=cur-1');
  });

  it('stops paging when a page comes back empty even if nextCursor present', async () => {
    mockGet.mockResolvedValueOnce({ messages: [], nextCursor: 'cur-x' });

    const result = await getJobMessages('job-1');

    expect(result).toEqual([]);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('treats a non-array messages field as an empty page', async () => {
    mockGet.mockResolvedValueOnce({ messages: null as unknown as Message[] });
    const result = await getJobMessages('job-1');
    expect(result).toEqual([]);
  });

  it('handles a null/undefined response object without throwing', async () => {
    mockGet.mockResolvedValueOnce(undefined);
    const result = await getJobMessages('job-1');
    expect(result).toEqual([]);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('logs a warning and truncates when the safety cap is hit', async () => {
    // Each page returns 50 messages + a cursor; loop runs until
    // collected.length >= 1000 (20 pages).
    const page = () => ({
      messages: Array.from({ length: 50 }, (_, i) =>
        msg({ id: `x${i}`, createdAt: '2026-01-01T00:00:00Z' })
      ),
      nextCursor: 'more',
    });
    for (let i = 0; i < 25; i++) mockGet.mockResolvedValueOnce(page());

    const result = await getJobMessages('job-cap', 5000, 0);

    expect(mockGet).toHaveBeenCalledTimes(20); // 20 * 50 = 1000 -> cap
    expect(result).toHaveLength(1000);
    expect(mockWarn).toHaveBeenCalledWith(
      'getJobMessages hit safety cap; older messages truncated',
      expect.objectContaining({ jobId: 'job-cap', cap: 1000, fetchedPages: 20 })
    );
  });

  it('applies offset/limit slice when offset > 0', async () => {
    mockGet.mockResolvedValueOnce({
      messages: [
        msg({ id: 'a', createdAt: '2026-01-01T00:00:00Z' }),
        msg({ id: 'b', createdAt: '2026-01-02T00:00:00Z' }),
        msg({ id: 'c', createdAt: '2026-01-03T00:00:00Z' }),
      ],
    });
    const result = await getJobMessages('job-1', 1, 1);
    expect(result.map((m) => m.id)).toEqual(['b']);
  });

  it('applies slice when sorted length exceeds the limit (offset 0)', async () => {
    mockGet.mockResolvedValueOnce({
      messages: [
        msg({ id: 'a', createdAt: '2026-01-01T00:00:00Z' }),
        msg({ id: 'b', createdAt: '2026-01-02T00:00:00Z' }),
        msg({ id: 'c', createdAt: '2026-01-03T00:00:00Z' }),
      ],
    });
    const result = await getJobMessages('job-1', 2, 0);
    expect(result.map((m) => m.id)).toEqual(['a', 'b']);
  });

  it('sorts safely when createdAt is missing (nullish fallback)', async () => {
    mockGet.mockResolvedValueOnce({
      messages: [
        msg({ id: 'b', createdAt: undefined as unknown as string }),
        msg({ id: 'a', createdAt: '2026-01-01T00:00:00Z' }),
      ],
    });
    const result = await getJobMessages('job-1');
    // missing createdAt -> '' sorts before the dated one.
    expect(result.map((m) => m.id)).toEqual(['b', 'a']);
  });

  it('sorts safely when the second operand createdAt is missing', async () => {
    // Drives the `b.createdAt ?? ''` branch on the sort comparator.
    mockGet.mockResolvedValueOnce({
      messages: [
        msg({ id: 'a', createdAt: '2026-01-01T00:00:00Z' }),
        msg({ id: 'b', createdAt: undefined as unknown as string }),
      ],
    });
    const result = await getJobMessages('job-1');
    expect(result.map((m) => m.id)).toEqual(['b', 'a']);
  });

  it('logs and rethrows on API error', async () => {
    const err = new Error('boom');
    mockGet.mockRejectedValueOnce(err);
    await expect(getJobMessages('job-1')).rejects.toThrow('boom');
    expect(mockError).toHaveBeenCalledWith('Error fetching messages:', err);
  });
});

describe('getUserMessageThreads', () => {
  it('maps threads with full participant + lastMessage data', async () => {
    mockGet.mockResolvedValueOnce({
      threads: [
        {
          jobId: 'j1',
          jobTitle: 'Leaky tap',
          unreadCount: 3,
          participants: [
            { id: 'u1', name: 'Alice', role: 'homeowner', avatar: 'a.png' },
          ],
          lastMessage: {
            content: 'see you',
            messageType: 'text',
            createdAt: '2026-01-01T00:00:00Z',
          },
        },
      ],
    });

    const result = await getUserMessageThreads('user-1');

    expect(mockGet).toHaveBeenCalledWith('/api/messages/threads');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      jobId: 'j1',
      jobTitle: 'Leaky tap',
      unreadCount: 3,
      participants: [{ id: 'u1', name: 'Alice', role: 'homeowner' }],
    });
    expect(result[0].lastMessage).toMatchObject({
      jobId: 'j1',
      messageText: 'see you',
      messageType: 'text',
      read: false,
    });
  });

  it('falls back through all defaults when fields are missing', async () => {
    mockGet.mockResolvedValueOnce({
      threads: [
        {
          jobId: 'j2',
          // no jobTitle, no unreadCount, no participants
          lastMessage: {
            // no content -> falls back to messageText, then ''
            messageText: 'from messageText',
            // no messageType -> 'text'
            // no createdAt -> ''
          },
        },
      ],
    });

    const result = await getUserMessageThreads('user-1');

    expect(result[0]).toMatchObject({
      jobTitle: '',
      unreadCount: 0,
      participants: [],
    });
    expect(result[0].lastMessage).toMatchObject({
      messageText: 'from messageText',
      messageType: 'text',
      createdAt: '',
    });
  });

  it('uses empty messageText when both content and messageText absent', async () => {
    mockGet.mockResolvedValueOnce({
      threads: [{ jobId: 'j3', jobTitle: 'x', lastMessage: {} }],
    });
    const result = await getUserMessageThreads('user-1');
    expect(result[0].lastMessage?.messageText).toBe('');
  });

  it('leaves lastMessage undefined when not provided', async () => {
    mockGet.mockResolvedValueOnce({
      threads: [{ jobId: 'j4', jobTitle: 'x' }],
    });
    const result = await getUserMessageThreads('user-1');
    expect(result[0].lastMessage).toBeUndefined();
  });

  it('returns [] when threads is not an array', async () => {
    mockGet.mockResolvedValueOnce({ threads: undefined });
    const result = await getUserMessageThreads('user-1');
    expect(result).toEqual([]);
  });

  it('logs and rethrows on error', async () => {
    const err = new Error('threads-fail');
    mockGet.mockRejectedValueOnce(err);
    await expect(getUserMessageThreads('user-1')).rejects.toThrow(
      'threads-fail'
    );
    expect(mockError).toHaveBeenCalledWith(
      'Error fetching message threads:',
      err
    );
  });
});

describe('searchJobMessages', () => {
  it('rejects an invalid search term and returns [] without fetching', async () => {
    mockIsValid.mockReturnValue(false);
    const result = await searchJobMessages('job-1', 'a'.repeat(80));
    expect(result).toEqual([]);
    expect(mockGet).not.toHaveBeenCalled();
    expect(mockWarn).toHaveBeenCalledWith(
      'Invalid search term rejected:',
      expect.objectContaining({ searchTerm: 'a'.repeat(50) })
    );
  });

  it('filters messages case-insensitively by messageText', async () => {
    mockGet.mockResolvedValueOnce({
      messages: [
        msg({ id: 'a', messageText: 'Hello World' }),
        msg({ id: 'b', messageText: 'goodbye' }),
        msg({ id: 'c', messageText: '' }),
      ],
    });
    const result = await searchJobMessages('job-1', 'WORLD');
    expect(result.map((m) => m.id)).toEqual(['a']);
  });

  it('treats nullish messageText as empty string when filtering', async () => {
    mockGet.mockResolvedValueOnce({
      messages: [msg({ id: 'a', messageText: undefined as unknown as string })],
    });
    const result = await searchJobMessages('job-1', 'anything');
    expect(result).toEqual([]);
  });

  it('logs and rethrows when the underlying fetch fails', async () => {
    const err = new Error('search-fail');
    mockGet.mockRejectedValueOnce(err);
    await expect(searchJobMessages('job-1', 'term')).rejects.toThrow(
      'search-fail'
    );
    expect(mockError).toHaveBeenCalledWith('Error searching messages:', err);
  });
});

describe('getVideoCallMessages', () => {
  it('returns only video-call message types', async () => {
    mockGet.mockResolvedValueOnce({
      messages: [
        msg({ id: 'a', messageType: 'text' }),
        msg({ id: 'b', messageType: 'video_call_started' }),
        msg({ id: 'c', messageType: 'video_call_missed' }),
      ],
    });
    const result = await getVideoCallMessages('job-1');
    expect(result.map((m) => m.id)).toEqual(['b', 'c']);
  });

  it('handles messages with missing messageType via empty-string fallback', async () => {
    mockGet.mockResolvedValueOnce({
      messages: [
        msg({
          id: 'a',
          messageType: undefined as unknown as Message['messageType'],
        }),
      ],
    });
    const result = await getVideoCallMessages('job-1');
    expect(result).toEqual([]);
  });

  it('logs and rethrows on error', async () => {
    const err = new Error('vc-fail');
    mockGet.mockRejectedValueOnce(err);
    await expect(getVideoCallMessages('job-1')).rejects.toThrow('vc-fail');
    expect(mockError).toHaveBeenCalledWith(
      'Error fetching video call messages:',
      err
    );
  });
});

describe('getUnreadMessageCount', () => {
  it('returns the numeric count from the API', async () => {
    mockGet.mockResolvedValueOnce({ count: 7 });
    const result = await getUnreadMessageCount('user-1');
    expect(result).toBe(7);
    expect(mockGet).toHaveBeenCalledWith('/api/messages/unread-count');
  });

  it('returns 0 when count is not a number', async () => {
    mockGet.mockResolvedValueOnce({ count: 'lots' as unknown as number });
    const result = await getUnreadMessageCount('user-1');
    expect(result).toBe(0);
  });

  it('returns 0 and logs on error (no rethrow)', async () => {
    const err = new Error('count-fail');
    mockGet.mockRejectedValueOnce(err);
    const result = await getUnreadMessageCount('user-1');
    expect(result).toBe(0);
    expect(mockError).toHaveBeenCalledWith(
      'Error getting unread message count:',
      err
    );
  });
});
