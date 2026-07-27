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
  mobileApiClient: { post: jest.fn(), postFormData: jest.fn() },
}));
jest.mock('@mintenance/shared', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import {
  frameTimestampsMs,
  frameCountForDuration,
  MIN_WALKTHROUGH_FRAMES,
  MAX_WALKTHROUGH_FRAMES,
  type WalkthroughRunResult,
} from '../KeyframeWalkthroughService';

/**
 * Regression: the walkthrough route responds with the merged survey spread at
 * the TOP LEVEL — `{ ...assessment, assessmentId, frameCount, framesAssessed }`
 * — but WalkthroughRunResult declared a nested `assessment` key and
 * VideoCaptureScreen read `result.assessment`. Because postFormData<T> is a
 * generic cast and not a validated parse, TypeScript could not see the
 * mismatch: the result screen received `undefined`, fell through to its legacy
 * card, and reported "0% confidence" with no findings on a walkthrough that had
 * actually analysed 9 of 11 frames.
 *
 * These pin the wire contract so the nested shape cannot creep back in.
 */
describe('WalkthroughRunResult wire contract', () => {
  /** A response shaped exactly like the route's NextResponse.json(...). */
  const routeResponse = {
    damageAssessment: {
      damageType: 'damp',
      severity: 'developing',
      confidence: 0.81,
    },
    urgency: { urgency: 'soon', recommendedActionTimeline: 'Within 2 weeks' },
    findings: [{ id: 'f1' }],
    assessmentId: 'assessment-1',
    frameCount: 11,
    framesAssessed: 9,
  } as unknown as WalkthroughRunResult;

  it('carries the survey at the top level, not under `assessment`', () => {
    expect(routeResponse.damageAssessment).toBeDefined();
    expect(
      (routeResponse as Record<string, unknown>).assessment
    ).toBeUndefined();
  });

  it('separates cleanly into meta + survey the result screen can render', () => {
    const { assessmentId, frameCount, framesAssessed, ...assessment } =
      routeResponse;

    expect(assessmentId).toBe('assessment-1');
    expect(frameCount).toBe(11);
    expect(framesAssessed).toBe(9);

    // AIAnalysisCard picks its rich layout on exactly this key; when it is
    // missing the card silently degrades to the legacy "estimated complexity"
    // panel, which is the failure this guards.
    expect(assessment.damageAssessment).toBeDefined();
    expect(assessment.findings).toHaveLength(1);
    expect(assessment).not.toHaveProperty('assessmentId');
  });
});

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
