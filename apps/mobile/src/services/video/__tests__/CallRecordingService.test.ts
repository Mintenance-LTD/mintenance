/**
 * Unit tests for CallRecordingService (video call recording + history + stats).
 *
 * Unit under test: apps/mobile/src/services/video/CallRecordingService.ts
 * Externals mocked: supabase (persistence), logger, performanceMonitor,
 *   serviceHelper (validation + DB op wrapper), VideoCallHelpers (row transform).
 *
 * The module under test (CallRecordingService) is NEVER mocked.
 */

// ---- External mocks -------------------------------------------------------

jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// performanceMonitor.measureAsync runs the wrapped op so the real
// CallRecordingService logic executes and gets coverage.
jest.mock('../../../utils/performance', () => ({
  performanceMonitor: {
    measureAsync: jest.fn(async (_name: string, op: () => Promise<unknown>) =>
      op()
    ),
  },
}));

// serviceHelper: validateRequired throws on empty; handleDatabaseOperation
// unwraps { data, error } and throws on error.
jest.mock('../../../utils/serviceHelper', () => ({
  validateRequired: jest.fn((value: unknown, fieldName: string) => {
    if (value === null || value === undefined || value === '') {
      throw new Error(`${fieldName} is required`);
    }
  }),
  handleDatabaseOperation: jest.fn(
    async (op: () => Promise<{ data: unknown; error: unknown }>) => {
      const { data, error } = await op();
      if (error) throw error;
      return data;
    }
  ),
}));

// VideoCallHelpers — assert CallRecordingService wires the transform through.
jest.mock('../VideoCallHelpers', () => ({
  transformVideoCallData: jest.fn((row: { id: string }) => ({
    id: row.id,
    jobId: 'job-1',
    participants: ['user-a', 'user-b'],
    initiatorId: 'user-a',
    status: 'completed',
    created_at: 'c',
    updated_at: 'u',
    recordingEnabled: false,
    screenSharingEnabled: false,
  })),
}));

// supabase — chainable builder. Each test installs the terminal result(s).
jest.mock('../../../config/supabase', () => {
  return {
    supabase: {
      from: jest.fn(),
    },
  };
});

import { supabase } from '../../../config/supabase';
import { logger } from '../../../utils/logger';
import { transformVideoCallData } from '../VideoCallHelpers';
import {
  getCallHistory,
  startRecording,
  stopRecording,
  getCallStatistics,
} from '../CallRecordingService';

const mockedFrom = supabase.from as jest.Mock;

/**
 * Builds a chainable query mock. Every chain method returns the same proxy so
 * the SUT can call .select/.update/.eq/.order/.single in any order. The proxy
 * is also `await`-able (thenable) resolving to `terminalResult` for chains that
 * end without `.single()` (e.g. .order(), .eq()).
 *
 * `singleResult` is returned from `.single()` calls in FIFO order so that
 * functions issuing two `.single()` queries (stopRecording) get distinct rows.
 */
function makeChain(opts: {
  terminalResult?: { data: unknown; error: unknown };
  singleResults?: Array<{ data: unknown; error: unknown }>;
}) {
  const singleQueue = [...(opts.singleResults ?? [])];
  const terminal = opts.terminalResult ?? { data: null, error: null };

  const chain: Record<string, unknown> = {};
  // Each builder method is its own jest.fn so per-method call args can be
  // asserted independently (they all return the same chain for fluency).
  chain.select = jest.fn(() => chain);
  chain.update = jest.fn(() => chain);
  chain.eq = jest.fn(() => chain);
  chain.order = jest.fn(() => chain);
  chain.single = jest.fn(() =>
    Promise.resolve(singleQueue.length ? singleQueue.shift() : terminal)
  );
  // thenable so `await chain` (chains ending at .order()/.eq()) resolves.
  chain.then = (resolve: (v: unknown) => unknown) => resolve(terminal);

  return chain;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getCallHistory', () => {
  it('returns transformed calls ordered by created_at desc', async () => {
    const rows = [
      { id: 'call-1', job_id: 'job-1' },
      { id: 'call-2', job_id: 'job-1' },
    ];
    const chain = makeChain({ terminalResult: { data: rows, error: null } });
    mockedFrom.mockReturnValue(chain);

    const result = await getCallHistory('job-1');

    expect(mockedFrom).toHaveBeenCalledWith('video_calls');
    expect(chain.select).toHaveBeenCalledWith('*');
    expect(chain.eq).toHaveBeenCalledWith('job_id', 'job-1');
    expect(chain.order).toHaveBeenCalledWith('created_at', {
      ascending: false,
    });
    expect(transformVideoCallData).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('call-1');
  });

  it('returns empty array when data is null', async () => {
    const chain = makeChain({ terminalResult: { data: null, error: null } });
    mockedFrom.mockReturnValue(chain);

    const result = await getCallHistory('job-1');

    expect(result).toEqual([]);
    expect(transformVideoCallData).not.toHaveBeenCalled();
  });

  it('throws when the query returns an error', async () => {
    const chain = makeChain({
      terminalResult: { data: null, error: { message: 'db down' } },
    });
    mockedFrom.mockReturnValue(chain);

    await expect(getCallHistory('job-1')).rejects.toThrow(
      'Failed to get call history: db down'
    );
  });

  it('throws when jobId is missing (validateRequired)', async () => {
    await expect(getCallHistory('')).rejects.toThrow('jobId is required');
    expect(mockedFrom).not.toHaveBeenCalled();
  });
});

describe('startRecording', () => {
  it('enables recording with metadata and logs success', async () => {
    const chain = makeChain({ terminalResult: { data: null, error: null } });
    mockedFrom.mockReturnValue(chain);

    await startRecording('call-1', 'user-a');

    expect(mockedFrom).toHaveBeenCalledWith('video_calls');
    expect(chain.update).toHaveBeenCalledTimes(1);
    const payload = (chain.update as jest.Mock).mock.calls[0][0];
    expect(payload.recording_enabled).toBe(true);
    expect(payload.metadata.recordingStartedBy).toBe('user-a');
    expect(typeof payload.metadata.recordingStartedAt).toBe('string');
    expect(typeof payload.updated_at).toBe('string');
    expect(chain.eq).toHaveBeenCalledWith('id', 'call-1');
    expect(logger.info).toHaveBeenCalledWith('Call recording started', {
      callId: 'call-1',
      startedBy: 'user-a',
    });
  });

  it('throws when the update errors', async () => {
    const chain = makeChain({
      terminalResult: { data: null, error: { message: 'write failed' } },
    });
    mockedFrom.mockReturnValue(chain);

    await expect(startRecording('call-1', 'user-a')).rejects.toThrow(
      'Failed to start recording: write failed'
    );
    expect(logger.info).not.toHaveBeenCalled();
  });
});

describe('stopRecording', () => {
  it('preserves existing metadata, returns recording_url, and logs', async () => {
    // First .single() = existing metadata fetch; second = update result.
    const chain = makeChain({
      singleResults: [
        { data: { metadata: { recordingStartedBy: 'user-a' } }, error: null },
        { data: { recording_url: 'https://cdn/rec.mp4' }, error: null },
      ],
    });
    mockedFrom.mockReturnValue(chain);

    const url = await stopRecording('call-1', 'user-b');

    expect(url).toBe('https://cdn/rec.mp4');
    // Second .from('video_calls') for the update path.
    expect(mockedFrom).toHaveBeenCalledWith('video_calls');
    const payload = (chain.update as jest.Mock).mock.calls[0][0];
    expect(payload.recording_enabled).toBe(false);
    expect(payload.metadata.recordingStartedBy).toBe('user-a'); // preserved
    expect(payload.metadata.recordingStoppedBy).toBe('user-b');
    expect(typeof payload.metadata.recordingStoppedAt).toBe('string');
    expect(chain.select).toHaveBeenCalledWith('recording_url');
    expect(logger.info).toHaveBeenCalledWith('Call recording stopped', {
      callId: 'call-1',
      stoppedBy: 'user-b',
      recordingUrl: 'https://cdn/rec.mp4',
    });
  });

  it('returns undefined when no recording_url present, handles missing metadata', async () => {
    const chain = makeChain({
      singleResults: [
        { data: { metadata: null }, error: null }, // no existing metadata -> {}
        { data: {}, error: null }, // no recording_url
      ],
    });
    mockedFrom.mockReturnValue(chain);

    const url = await stopRecording('call-1', 'user-b');

    expect(url).toBeUndefined();
    const payload = (chain.update as jest.Mock).mock.calls[0][0];
    expect(payload.metadata.recordingStoppedBy).toBe('user-b');
  });

  it('handles a null existing-data row (currentMetadata falls back to {})', async () => {
    const chain = makeChain({
      singleResults: [
        { data: null, error: null }, // existing fetch returns no row
        { data: { recording_url: 'u' }, error: null },
      ],
    });
    mockedFrom.mockReturnValue(chain);

    const url = await stopRecording('call-1', 'user-b');
    expect(url).toBe('u');
  });

  it('throws when the update query errors', async () => {
    const chain = makeChain({
      singleResults: [
        { data: { metadata: {} }, error: null },
        { data: null, error: { message: 'update blew up' } },
      ],
    });
    mockedFrom.mockReturnValue(chain);

    await expect(stopRecording('call-1', 'user-b')).rejects.toThrow(
      'Failed to stop recording: update blew up'
    );
  });
});

describe('getCallStatistics', () => {
  it('returns a default statistics object for the given callId', async () => {
    // No supabase call expected on this path.
    const stats = await getCallStatistics('call-9');

    expect(stats).toEqual({
      callId: 'call-9',
      duration: 0,
      averageQuality: 'good',
      packetsLost: 0,
      bandwidthUsed: 0,
      reconnections: 0,
      participantStats: [],
    });
    expect(mockedFrom).not.toHaveBeenCalled();
  });
});
