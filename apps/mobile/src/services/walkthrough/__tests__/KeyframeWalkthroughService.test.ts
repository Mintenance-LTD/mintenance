/**
 * Unit tests for the PURE keyframe-sampling logic of KeyframeWalkthroughService.
 *
 * The I/O-bound parts (thumbnail extraction, storage upload, the walkthrough
 * POST) need a device + network and are verified on-device after an EAS build.
 * Here we pin down the deterministic frame-planning maths. The module's native
 * / network deps are mocked only so the file imports cleanly.
 */
jest.mock('expo-video-thumbnails', () => ({ getThumbnailAsync: jest.fn() }));
jest.mock('../../../config/supabase', () => ({ supabase: { storage: {} } }));
jest.mock('../../../utils/mobileApiClient', () => ({
  mobileApiClient: { post: jest.fn() },
}));
jest.mock('@mintenance/shared', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import {
  frameTimestampsMs,
  frameCountForDuration,
  MIN_WALKTHROUGH_FRAMES,
  MAX_WALKTHROUGH_FRAMES,
} from '../KeyframeWalkthroughService';

describe('frameTimestampsMs', () => {
  it('returns `count` timestamps, evenly spaced and within the clip', () => {
    const ts = frameTimestampsMs(20_000, 4);
    expect(ts).toHaveLength(4);
    // Segment midpoints of 4 equal parts of 20s: 2.5s, 7.5s, 12.5s, 17.5s.
    expect(ts).toEqual([2500, 7500, 12500, 17500]);
    // Never the absolute start or end (start/stop motion blur).
    expect(ts[0]).toBeGreaterThan(0);
    expect(ts[ts.length - 1]).toBeLessThan(20_000);
  });

  it('is monotonically increasing', () => {
    const ts = frameTimestampsMs(60_000, 12);
    for (let i = 1; i < ts.length; i++) {
      expect(ts[i]).toBeGreaterThan(ts[i - 1]!);
    }
  });

  it('degrades safely on a zero-length clip', () => {
    expect(frameTimestampsMs(0, 3)).toEqual([0, 0, 0]);
  });
});

describe('frameCountForDuration', () => {
  it('targets ~1 frame per 4s', () => {
    expect(frameCountForDuration(20_000)).toBe(5);
  });

  it('clamps to the minimum for very short clips', () => {
    expect(frameCountForDuration(1_000)).toBe(MIN_WALKTHROUGH_FRAMES);
  });

  it('clamps to the maximum for long clips', () => {
    expect(frameCountForDuration(600_000)).toBe(MAX_WALKTHROUGH_FRAMES);
  });
});
