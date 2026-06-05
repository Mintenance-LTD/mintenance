/**
 * Unit tests for VideoCallHelpers (services/video/VideoCallHelpers.ts).
 *
 * Pure functions — no externals to mock. Drives every `||`/`??` fallback arm
 * in transformVideoCallData and every switch case in the notification helpers.
 */
import {
  transformVideoCallData,
  getNotificationTitle,
  getNotificationBody,
  generateSessionToken,
  getIceServers,
} from '../VideoCallHelpers';
import type { DatabaseVideoCallRow, VideoCall } from '../types';

function fullRow(): DatabaseVideoCallRow {
  return {
    id: 'call-1',
    job_id: 'job-1',
    participants: ['u1', 'u2'],
    initiator_id: 'u1',
    status: 'active',
    start_time: '2026-01-01T10:00:00Z',
    end_time: '2026-01-01T10:30:00Z',
    scheduled_time: '2026-01-01T09:00:00Z',
    duration: 1800,
    recording_url: 'https://rec/1',
    recording_enabled: true,
    screen_sharing_enabled: true,
    call_quality: 'hd',
    metadata: {
      callPurpose: 'progress_update',
      notes: 'n',
      issues: 'i',
      resolution: 'r',
      followUpRequired: true,
    },
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:05:00Z',
  } as DatabaseVideoCallRow;
}

describe('transformVideoCallData', () => {
  it('maps a fully-populated row (truthy arm of every fallback)', () => {
    const r = transformVideoCallData(fullRow());
    expect(r).toMatchObject({
      id: 'call-1',
      jobId: 'job-1',
      participants: ['u1', 'u2'],
      initiatorId: 'u1',
      status: 'active',
      startTime: '2026-01-01T10:00:00Z',
      endTime: '2026-01-01T10:30:00Z',
      scheduledTime: '2026-01-01T09:00:00Z',
      duration: 1800,
      recordingUrl: 'https://rec/1',
      recordingEnabled: true,
      screenSharingEnabled: true,
      callQuality: 'hd',
      created_at: '2026-01-01T08:00:00Z',
      updated_at: '2026-01-01T08:05:00Z',
    });
    expect(r.metadata).toEqual({
      callPurpose: 'progress_update',
      notes: 'n',
      issues: 'i',
      resolution: 'r',
      followUpRequired: true,
    });
  });

  it('applies all fallbacks when optional fields are null/missing (falsy arm)', () => {
    const row = {
      id: 'call-2',
      job_id: 'job-2',
      participants: null,
      initiator_id: 'u3',
      status: 'ended',
      start_time: null,
      end_time: null,
      scheduled_time: null,
      duration: null,
      recording_url: null,
      recording_enabled: null,
      screen_sharing_enabled: null,
      call_quality: null,
      metadata: null,
      created_at: 'c',
      updated_at: 'u',
    } as unknown as DatabaseVideoCallRow;

    const r = transformVideoCallData(row);
    expect(r.participants).toEqual([]);
    expect(r.startTime).toBeUndefined();
    expect(r.endTime).toBeUndefined();
    expect(r.scheduledTime).toBeUndefined();
    expect(r.duration).toBeUndefined();
    expect(r.recordingUrl).toBeUndefined();
    expect(r.recordingEnabled).toBe(false);
    expect(r.screenSharingEnabled).toBe(false);
    expect(r.callQuality).toBeUndefined();
    expect(r.metadata).toBeUndefined();
  });

  it('defaults metadata.callPurpose to consultation when absent (?? arm)', () => {
    const row = fullRow();
    row.metadata = { notes: 'only notes' } as DatabaseVideoCallRow['metadata'];
    const r = transformVideoCallData(row);
    expect(r.metadata?.callPurpose).toBe('consultation');
    expect(r.metadata?.notes).toBe('only notes');
  });
});

describe('getNotificationTitle', () => {
  it.each([
    ['scheduled', 'Video Call Scheduled'],
    ['started', 'Video Call Starting'],
    ['completed', 'Video Call Completed'],
    ['cancelled', 'Video Call Cancelled'],
    ['anything-else', 'Video Call Update'],
  ])('%s → %s', (action, title) => {
    expect(getNotificationTitle(action)).toBe(title);
  });
});

describe('getNotificationBody', () => {
  const baseCall = {
    scheduledTime: '2026-01-01T09:00:00Z',
    duration: 1800,
  } as VideoCall;

  it('scheduled includes the localized scheduled time', () => {
    const body = getNotificationBody('scheduled', baseCall);
    expect(body).toContain('A video call has been scheduled for');
    expect(body).toContain(new Date('2026-01-01T09:00:00Z').toLocaleString());
  });

  it('started prompts to join', () => {
    expect(getNotificationBody('started', baseCall)).toBe(
      'A video call is starting now. Tap to join.'
    );
  });

  it('completed reports duration in whole minutes', () => {
    expect(getNotificationBody('completed', baseCall)).toBe(
      'Video call completed. Duration: 30 minutes'
    );
  });

  it('completed coalesces missing duration to 0 minutes', () => {
    expect(getNotificationBody('completed', {} as VideoCall)).toBe(
      'Video call completed. Duration: 0 minutes'
    );
  });

  it('cancelled message', () => {
    expect(getNotificationBody('cancelled', baseCall)).toBe(
      'The scheduled video call has been cancelled.'
    );
  });

  it('unknown action → generic status', () => {
    expect(getNotificationBody('whatever', baseCall)).toBe(
      'Video call status updated'
    );
  });
});

describe('generateSessionToken', () => {
  it('returns a base64 token encoding callId-userId-timestamp', () => {
    const token = generateSessionToken('call-9', 'user-9');
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    expect(decoded).toMatch(/^call-9-user-9-\d+$/);
  });
});

describe('getIceServers', () => {
  it('returns the two Google STUN servers', async () => {
    const servers = await getIceServers();
    expect(servers).toEqual([
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ]);
  });
});
