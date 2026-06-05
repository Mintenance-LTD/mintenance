/**
 * Unit tests for CallManager (video call service).
 *
 * Unit under test: apps/mobile/src/services/video/CallManager.ts
 * Externals mocked: supabase (signaling/persistence), logger, performanceMonitor,
 *   serviceHelper (validation + DB op wrapper), VideoCallHelpers (transform/token/ICE),
 *   CallNotifier (participant notifications/records/lookup).
 *
 * The module under test (CallManager) is NEVER mocked.
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

// performanceMonitor.measureAsync just runs the wrapped op so the real
// CallManager logic executes and gets coverage.
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

// VideoCallHelpers — assert CallManager wires through them.
jest.mock('../VideoCallHelpers', () => ({
  transformVideoCallData: jest.fn(
    (row: { id: string; participants?: string[] }) => ({
      id: row.id,
      jobId: 'job-1',
      participants: row.participants ?? ['user-a', 'user-b'],
      initiatorId: 'user-a',
      status: 'active',
      created_at: 'c',
      updated_at: 'u',
      recordingEnabled: false,
      screenSharingEnabled: false,
    })
  ),
  generateSessionToken: jest.fn(() => 'session-token-1234567890-abc'),
  getIceServers: jest.fn(async () => [
    { urls: 'stun:stun.l.google.com:19302' },
  ]),
}));

// CallNotifier
jest.mock('../CallNotifier', () => ({
  notifyParticipants: jest.fn(async () => undefined),
  recordParticipantAction: jest.fn(async () => undefined),
  getCallById: jest.fn(async () => null),
}));

import { supabase } from '../../../config/supabase';
import { logger } from '../../../utils/logger';
import {
  validateRequired,
  handleDatabaseOperation,
} from '../../../utils/serviceHelper';
import {
  transformVideoCallData,
  generateSessionToken,
  getIceServers,
} from '../VideoCallHelpers';
import {
  notifyParticipants,
  recordParticipantAction,
  getCallById,
} from '../CallNotifier';
import {
  getActiveCall,
  isUserInCall,
  scheduleCall,
  startInstantCall,
  joinCall,
  endCall,
  toggleMute,
  toggleVideo,
  startScreenShare,
  stopScreenShare,
  cancelCall,
} from '../CallManager';

const mockedSupabase = supabase as unknown as {
  from: jest.Mock;
};

/**
 * Builds a chainable supabase-table mock. Every chain method returns the
 * same object; terminal `.single()` resolves to the configured value.
 * `select()`/`update()`/`insert()`/`eq()` are all jest mocks so callers can
 * assert payloads.
 */
function makeChain(opts: {
  single?: { data: unknown; error: unknown };
  // for `.update().eq()` (no select) which is awaited directly
  thenResult?: { data: unknown; error: unknown };
}) {
  const chain: Record<string, jest.Mock> & { then?: unknown } = {} as never;
  const ret = () => chain;
  chain.insert = jest.fn(ret);
  chain.select = jest.fn(ret);
  chain.eq = jest.fn(ret);
  chain.update = jest.fn(ret);
  chain.single = jest.fn(() =>
    Promise.resolve(opts.single ?? { data: null, error: null })
  );
  // Make the chain awaitable for `.update().eq()` paths that are awaited.
  if (opts.thenResult !== undefined) {
    (chain as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve(opts.thenResult).then(resolve);
  }
  return chain;
}

const ACTIVE_ROW = {
  id: 'call-1',
  job_id: 'job-1',
  participants: ['user-a', 'user-b'],
  initiator_id: 'user-a',
  status: 'active',
  created_at: 'c',
  updated_at: 'u',
  recording_enabled: false,
  screen_sharing_enabled: false,
};

beforeEach(() => {
  jest.clearAllMocks();
});

// Ensure module-level activeCall doesn't leak across describe blocks.
afterEach(async () => {
  // End any active call so getActiveCall() resets to null between suites.
  if (getActiveCall()) {
    mockedSupabase.from.mockImplementation(() =>
      makeChain({
        single: { data: { start_time: null, metadata: {} }, error: null },
        thenResult: { data: null, error: null },
      })
    );
    (getCallById as jest.Mock).mockResolvedValueOnce(null);
    await endCall(getActiveCall()!.id, 'user-a').catch(() => undefined);
  }
});

describe('CallManager — state accessors', () => {
  it('getActiveCall returns null when no call is active', () => {
    expect(getActiveCall()).toBeNull();
  });

  it('isUserInCall returns false when no active call', () => {
    expect(isUserInCall('user-a')).toBe(false);
  });
});

describe('scheduleCall', () => {
  it('inserts a scheduled call, transforms it and notifies participants', async () => {
    mockedSupabase.from.mockImplementation(() =>
      makeChain({ single: { data: ACTIVE_ROW, error: null } })
    );

    const result = await scheduleCall(
      'job-1',
      'user-a',
      ['user-a', 'user-b'],
      '2026-07-01T10:00:00Z',
      'consultation',
      true
    );

    expect(mockedSupabase.from).toHaveBeenCalledWith('video_calls');
    expect(validateRequired).toHaveBeenCalledWith(
      'job-1',
      'jobId',
      expect.any(Object)
    );
    expect(transformVideoCallData).toHaveBeenCalledWith(ACTIVE_ROW);
    expect(notifyParticipants).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'call-1' }),
      'scheduled'
    );
    expect(logger.info).toHaveBeenCalledWith(
      'Video call scheduled successfully',
      expect.objectContaining({ callId: 'call-1' })
    );
    expect(result.id).toBe('call-1');
    // scheduleCall must NOT set the module activeCall.
    expect(getActiveCall()).toBeNull();
  });

  it('uses default recordingEnabled=false when omitted', async () => {
    const insertSpy = jest.fn(function (this: unknown) {
      return chain;
    });
    const chain = makeChain({ single: { data: ACTIVE_ROW, error: null } });
    chain.insert = insertSpy as unknown as jest.Mock;
    chain.insert.mockReturnValue(chain);
    mockedSupabase.from.mockImplementation(() => chain);

    await scheduleCall(
      'job-1',
      'user-a',
      ['user-a'],
      '2026-07-01T10:00:00Z',
      'consultation'
    );

    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ recording_enabled: false, status: 'scheduled' })
    );
  });

  it('throws when insert returns an error', async () => {
    mockedSupabase.from.mockImplementation(() =>
      makeChain({ single: { data: null, error: { message: 'boom' } } })
    );

    await expect(
      scheduleCall('job-1', 'user-a', ['user-a'], 't', 'consultation')
    ).rejects.toThrow('Failed to schedule call: boom');
    expect(notifyParticipants).not.toHaveBeenCalled();
  });

  it('rejects when a required field is missing (validation path)', async () => {
    await expect(
      scheduleCall('', 'user-a', ['user-a'], 't', 'consultation')
    ).rejects.toThrow('jobId is required');
    expect(handleDatabaseOperation).not.toHaveBeenCalled();
  });
});

describe('startInstantCall', () => {
  it('inserts an active call, sets module activeCall and notifies "started"', async () => {
    mockedSupabase.from.mockImplementation(() =>
      makeChain({ single: { data: ACTIVE_ROW, error: null } })
    );

    const call = await startInstantCall('job-1', 'user-a', [
      'user-a',
      'user-b',
    ]);

    expect(call.id).toBe('call-1');
    expect(getActiveCall()).not.toBeNull();
    expect(getActiveCall()!.id).toBe('call-1');
    expect(isUserInCall('user-a')).toBe(true);
    expect(isUserInCall('nobody')).toBe(false);
    expect(notifyParticipants).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'call-1' }),
      'started'
    );
    expect(logger.info).toHaveBeenCalledWith(
      'Instant video call started',
      expect.objectContaining({ callId: 'call-1' })
    );
  });

  it('defaults purpose to "consultation"', async () => {
    const chain = makeChain({ single: { data: ACTIVE_ROW, error: null } });
    mockedSupabase.from.mockImplementation(() => chain);

    await startInstantCall('job-1', 'user-a', ['user-a']);

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'active',
        metadata: expect.objectContaining({ callPurpose: 'consultation' }),
      })
    );
  });

  it('throws when insert returns an error', async () => {
    mockedSupabase.from.mockImplementation(() =>
      makeChain({ single: { data: null, error: { message: 'down' } } })
    );

    await expect(
      startInstantCall('job-1', 'user-a', ['user-a'])
    ).rejects.toThrow('Failed to start call: down');
  });

  it('rejects on missing required field', async () => {
    await expect(startInstantCall('job-1', '', ['user-a'])).rejects.toThrow(
      'initiatorId is required'
    );
  });
});

describe('joinCall', () => {
  it('returns a session for an authorized participant on an active call', async () => {
    mockedSupabase.from.mockImplementation(() =>
      makeChain({ single: { data: ACTIVE_ROW, error: null } })
    );

    const session = await joinCall('call-1', 'user-a');

    expect(session.callId).toBe('call-1');
    expect(session.sessionToken).toBe('session-token-1234567890-abc');
    expect(session.iceServers).toEqual([
      { urls: 'stun:stun.l.google.com:19302' },
    ]);
    expect(session.mediaConstraints).toEqual({
      audio: true,
      video: true,
      screenShare: false,
    });
    expect(session.bandwidth).toEqual({ audio: 64, video: 500 });
    expect(generateSessionToken).toHaveBeenCalledWith('call-1', 'user-a');
    expect(getIceServers).toHaveBeenCalled();
    expect(recordParticipantAction).toHaveBeenCalledWith(
      'call-1',
      'user-a',
      'joined'
    );
  });

  it('flips a scheduled call to active before issuing a session', async () => {
    const scheduledRow = { ...ACTIVE_ROW, status: 'scheduled' };
    const chain = makeChain({ single: { data: scheduledRow, error: null } });
    (transformVideoCallData as jest.Mock).mockReturnValueOnce({
      id: 'call-1',
      jobId: 'job-1',
      participants: ['user-a', 'user-b'],
      initiatorId: 'user-a',
      status: 'scheduled',
      created_at: 'c',
      updated_at: 'u',
      recordingEnabled: false,
      screenSharingEnabled: false,
    });
    mockedSupabase.from.mockImplementation(() => chain);

    await joinCall('call-1', 'user-a');

    // update() called to flip to active
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active' })
    );
  });

  it('throws "Call not found" when the lookup errors', async () => {
    mockedSupabase.from.mockImplementation(() =>
      makeChain({ single: { data: null, error: { message: 'nope' } } })
    );

    await expect(joinCall('call-x', 'user-a')).rejects.toThrow(
      'Call not found'
    );
  });

  it('throws "Call not found" when lookup returns no data', async () => {
    mockedSupabase.from.mockImplementation(() =>
      makeChain({ single: { data: null, error: null } })
    );

    await expect(joinCall('call-x', 'user-a')).rejects.toThrow(
      'Call not found'
    );
  });

  it('throws authorization error when user is not a participant', async () => {
    const chain = makeChain({ single: { data: ACTIVE_ROW, error: null } });
    (transformVideoCallData as jest.Mock).mockReturnValueOnce({
      id: 'call-1',
      jobId: 'job-1',
      participants: ['user-b', 'user-c'],
      initiatorId: 'user-b',
      status: 'active',
      created_at: 'c',
      updated_at: 'u',
      recordingEnabled: false,
      screenSharingEnabled: false,
    });
    mockedSupabase.from.mockImplementation(() => chain);

    await expect(joinCall('call-1', 'user-a')).rejects.toThrow(
      'User not authorized to join this call'
    );
    expect(recordParticipantAction).not.toHaveBeenCalled();
  });

  it('rejects on missing required field', async () => {
    await expect(joinCall('', 'user-a')).rejects.toThrow('callId is required');
  });
});

describe('endCall', () => {
  it('completes the call, records "left" for each participant and notifies', async () => {
    // first .single() -> start_time/metadata lookup; update() awaited via thenResult
    mockedSupabase.from.mockImplementation(() =>
      makeChain({
        single: {
          data: {
            start_time: '2026-07-01T10:00:00Z',
            metadata: { foo: 'bar' },
          },
          error: null,
        },
        thenResult: { data: null, error: null },
      })
    );
    (getCallById as jest.Mock).mockResolvedValueOnce({
      id: 'call-1',
      jobId: 'job-1',
      participants: ['user-a', 'user-b'],
      initiatorId: 'user-a',
      status: 'completed',
      created_at: 'c',
      updated_at: 'u',
      recordingEnabled: false,
      screenSharingEnabled: false,
    });

    await endCall('call-1', 'user-a', 'good call', true);

    expect(recordParticipantAction).toHaveBeenCalledWith(
      'call-1',
      'user-a',
      'left'
    );
    expect(recordParticipantAction).toHaveBeenCalledWith(
      'call-1',
      'user-b',
      'left'
    );
    expect(notifyParticipants).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'call-1' }),
      'completed'
    );
    expect(logger.info).toHaveBeenCalledWith(
      'Video call ended',
      expect.objectContaining({ callId: 'call-1', endedBy: 'user-a' })
    );
  });

  it('clears module activeCall + cleans up when ending the active call', async () => {
    // First, start an instant call so activeCall is set to call-1.
    mockedSupabase.from.mockImplementation(() =>
      makeChain({ single: { data: ACTIVE_ROW, error: null } })
    );
    await startInstantCall('job-1', 'user-a', ['user-a', 'user-b']);
    expect(getActiveCall()).not.toBeNull();

    // Now end it.
    mockedSupabase.from.mockImplementation(() =>
      makeChain({
        single: { data: { start_time: null, metadata: null }, error: null },
        thenResult: { data: null, error: null },
      })
    );
    (getCallById as jest.Mock).mockResolvedValueOnce(null);

    await endCall('call-1', 'user-a');

    expect(getActiveCall()).toBeNull();
  });

  it('handles a null start_time by defaulting to now (duration computed)', async () => {
    mockedSupabase.from.mockImplementation(() =>
      makeChain({
        single: { data: { start_time: null, metadata: null }, error: null },
        thenResult: { data: null, error: null },
      })
    );
    (getCallById as jest.Mock).mockResolvedValueOnce(null);

    await expect(endCall('call-1', 'user-a')).resolves.toBeUndefined();
    // getCallById returned null -> no recordParticipantAction / notify
    expect(recordParticipantAction).not.toHaveBeenCalled();
    expect(notifyParticipants).not.toHaveBeenCalled();
  });

  it('throws "Call not found" when the start_time lookup errors', async () => {
    mockedSupabase.from.mockImplementation(() =>
      makeChain({
        single: { data: null, error: { message: 'x' } },
      })
    );

    await expect(endCall('call-1', 'user-a')).rejects.toThrow('Call not found');
  });

  it('throws when the completion update returns an error', async () => {
    mockedSupabase.from.mockImplementation(() =>
      makeChain({
        single: { data: { start_time: null, metadata: {} }, error: null },
        thenResult: { data: null, error: { message: 'update failed' } },
      })
    );

    await expect(endCall('call-1', 'user-a')).rejects.toThrow(
      'Failed to end call: update failed'
    );
  });

  it('rejects on missing required field', async () => {
    await expect(endCall('', 'user-a')).rejects.toThrow('callId is required');
  });
});

describe('toggleMute', () => {
  it('returns the new muted state and logs (DB stub), no local stream', async () => {
    const result = await toggleMute('call-1', 'user-a', true);
    expect(result).toBe(true);
    expect(logger.info).toHaveBeenCalledWith(
      'Audio mute toggled (DB persistence stubbed)',
      { callId: 'call-1', userId: 'user-a', muted: true }
    );
  });

  it('returns false when unmuting', async () => {
    await expect(toggleMute('call-1', 'user-a', false)).resolves.toBe(false);
  });

  it('logs and rethrows when the info log throws (catch path)', async () => {
    (logger.info as jest.Mock).mockImplementationOnce(() => {
      throw new Error('log fail');
    });

    await expect(toggleMute('call-1', 'user-a', true)).rejects.toThrow(
      'log fail'
    );
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to toggle mute:',
      expect.any(Error)
    );
  });
});

describe('toggleVideo', () => {
  it('returns the new video-enabled state and logs (DB stub)', async () => {
    const result = await toggleVideo('call-1', 'user-a', false);
    expect(result).toBe(false);
    expect(logger.info).toHaveBeenCalledWith(
      'Video toggled (DB persistence stubbed)',
      { callId: 'call-1', userId: 'user-a', videoEnabled: false }
    );
  });

  it('returns true when enabling', async () => {
    await expect(toggleVideo('call-1', 'user-a', true)).resolves.toBe(true);
  });

  it('logs and rethrows when the info log throws (catch path)', async () => {
    (logger.info as jest.Mock).mockImplementationOnce(() => {
      throw new Error('vlog fail');
    });

    await expect(toggleVideo('call-1', 'user-a', true)).rejects.toThrow(
      'vlog fail'
    );
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to toggle video:',
      expect.any(Error)
    );
  });
});

describe('startScreenShare', () => {
  it('updates video_calls screen_sharing_enabled=true and logs', async () => {
    const chain = makeChain({ thenResult: { data: null, error: null } });
    mockedSupabase.from.mockImplementation(() => chain);

    await startScreenShare('call-1', 'user-a');

    expect(mockedSupabase.from).toHaveBeenCalledWith('video_calls');
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ screen_sharing_enabled: true })
    );
    expect(chain.eq).toHaveBeenCalledWith('id', 'call-1');
    expect(logger.info).toHaveBeenCalledWith(
      'Screen sharing started (participant row stubbed)',
      { callId: 'call-1', userId: 'user-a' }
    );
  });

  it('logs and rethrows when supabase update throws', async () => {
    mockedSupabase.from.mockImplementation(() => {
      throw new Error('rtc fail');
    });

    await expect(startScreenShare('call-1', 'user-a')).rejects.toThrow(
      'rtc fail'
    );
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to start screen share:',
      expect.any(Error)
    );
  });
});

describe('stopScreenShare', () => {
  it('updates video_calls screen_sharing_enabled=false and logs', async () => {
    const chain = makeChain({ thenResult: { data: null, error: null } });
    mockedSupabase.from.mockImplementation(() => chain);

    await stopScreenShare('call-1', 'user-a');

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ screen_sharing_enabled: false })
    );
    expect(logger.info).toHaveBeenCalledWith(
      'Screen sharing stopped (participant row stubbed)',
      { callId: 'call-1', userId: 'user-a' }
    );
  });

  it('logs and rethrows when supabase update throws', async () => {
    mockedSupabase.from.mockImplementation(() => {
      throw new Error('stop fail');
    });

    await expect(stopScreenShare('call-1', 'user-a')).rejects.toThrow(
      'stop fail'
    );
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to stop screen share:',
      expect.any(Error)
    );
  });
});

describe('cancelCall', () => {
  it('updates status to cancelled, transforms and notifies "cancelled"', async () => {
    const cancelledRow = { ...ACTIVE_ROW, status: 'cancelled' };
    const chain = makeChain({ single: { data: cancelledRow, error: null } });
    mockedSupabase.from.mockImplementation(() => chain);

    await cancelCall('call-1', 'user-a', 'changed mind');

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'cancelled',
        metadata: expect.objectContaining({
          cancelledBy: 'user-a',
          cancellationReason: 'changed mind',
        }),
      })
    );
    expect(notifyParticipants).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'call-1' }),
      'cancelled'
    );
    expect(logger.info).toHaveBeenCalledWith(
      'Video call cancelled',
      expect.objectContaining({ callId: 'call-1', cancelledBy: 'user-a' })
    );
  });

  it('works without a reason argument', async () => {
    const chain = makeChain({
      single: { data: { ...ACTIVE_ROW, status: 'cancelled' }, error: null },
    });
    mockedSupabase.from.mockImplementation(() => chain);

    await expect(cancelCall('call-1', 'user-a')).resolves.toBeUndefined();
  });

  it('throws when the update returns an error', async () => {
    mockedSupabase.from.mockImplementation(() =>
      makeChain({ single: { data: null, error: { message: 'cant cancel' } } })
    );

    await expect(cancelCall('call-1', 'user-a')).rejects.toThrow(
      'Failed to cancel call: cant cancel'
    );
    expect(notifyParticipants).not.toHaveBeenCalled();
  });
});
