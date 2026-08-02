import { describe, it, expect } from 'vitest';
import {
  isFrameAssessable,
  selectAssessableFrames,
  describeExclusions,
  MIN_IMAGE_CLARITY,
  MIN_AVERAGE_BRIGHTNESS,
  MAX_AVERAGE_BRIGHTNESS,
} from '../frame-quality';
import { assessWalkthrough } from '../walkthrough-assessment';
import type { Phase1BuildingAssessment } from '../../types';

/**
 * Which frames deserve a vote.
 *
 * A handheld walk produces motion-blurred smears and near-black ceilings
 * alongside usable views. An unassessable frame is not a neutral vote: a model
 * told to report every defect it can see will find something in a grey blur.
 *
 * The bias throughout is toward KEEPING frames — wrongly excluding one loses
 * real evidence, which is the worse error.
 */

const good = {
  imageClarity: 0.6,
  lightingQuality: 0.7,
  averageBrightness: 0.5,
};

describe('isFrameAssessable', () => {
  it('keeps a well-exposed, sharp frame', () => {
    expect(isFrameAssessable(good).assessable).toBe(true);
  });

  it('rejects a motion-blurred smear', () => {
    const verdict = isFrameAssessable({
      ...good,
      imageClarity: MIN_IMAGE_CLARITY - 0.01,
    });
    expect(verdict).toEqual({ assessable: false, reason: 'too_blurry' });
  });

  it('rejects a near-black frame', () => {
    const verdict = isFrameAssessable({
      ...good,
      averageBrightness: MIN_AVERAGE_BRIGHTNESS - 0.01,
    });
    expect(verdict).toEqual({ assessable: false, reason: 'too_dark' });
  });

  it('rejects a blown-out frame', () => {
    const verdict = isFrameAssessable({
      ...good,
      averageBrightness: MAX_AVERAGE_BRIGHTNESS + 0.01,
    });
    expect(verdict).toEqual({ assessable: false, reason: 'blown_out' });
  });

  it('keeps a frame sitting exactly on the thresholds', () => {
    // Exclusion is for frames past the line, not on it.
    expect(
      isFrameAssessable({ ...good, imageClarity: MIN_IMAGE_CLARITY }).assessable
    ).toBe(true);
    expect(
      isFrameAssessable({ ...good, averageBrightness: MIN_AVERAGE_BRIGHTNESS })
        .assessable
    ).toBe(true);
  });

  it('keeps a frame whose metrics could not be measured', () => {
    // An absent measurement is not evidence of a bad frame. Defaulting the
    // other way would silently drop whole walkthroughs if extraction regressed.
    expect(isFrameAssessable(undefined).assessable).toBe(true);
    expect(isFrameAssessable(null).assessable).toBe(true);
  });

  it('ignores non-finite metrics rather than treating them as zero', () => {
    expect(isFrameAssessable({ ...good, imageClarity: NaN }).assessable).toBe(
      true
    );
    expect(
      isFrameAssessable({ ...good, averageBrightness: NaN }).assessable
    ).toBe(true);
  });

  it('keeps real production frames of smooth painted walls', () => {
    // Measured from an actual 1080x1920 walkthrough with the production maths.
    // The first gate (0.10) failed BOTH of these — every survey got stamped
    // "rests on poor footage" — because flat walls give the Laplacian almost
    // nothing to see. Sharp wall footage must always pass.
    expect(
      isFrameAssessable({
        imageClarity: 0.036, // frame0: variance 72.4, visibly sharp
        lightingQuality: 0.7,
        averageBrightness: 0.55,
      }).assessable
    ).toBe(true);
    expect(
      isFrameAssessable({
        imageClarity: 0.017, // frame5: variance 34.0, visibly sharp
        lightingQuality: 0.7,
        averageBrightness: 0.508,
      }).assessable
    ).toBe(true);
  });

  it('is unmoved by dim-but-readable lighting on its own', () => {
    // lightingQuality is recorded for tuning; only clarity and brightness
    // currently exclude, so a merely gloomy room is still surveyed.
    expect(
      isFrameAssessable({ ...good, lightingQuality: 0.05 }).assessable
    ).toBe(true);
  });
});

describe('selectAssessableFrames', () => {
  // Derived from the constants, not hardcoded: the gate was retuned once
  // already (0.10 -> 0.005 after real frames measured 0.017-0.036), and a
  // literal here silently becomes "sharp" the next time it moves.
  const blurry = { ...good, imageClarity: MIN_IMAGE_CLARITY / 2 };
  const dark = { ...good, averageBrightness: MIN_AVERAGE_BRIGHTNESS / 2 };

  it('skips nothing when every frame is fine', () => {
    const s = selectAssessableFrames([good, good, good], 2);
    expect(s.skip.size).toBe(0);
    expect(s.excluded).toEqual([]);
    expect(s.degraded).toBe(false);
  });

  it('skips the bad frames by their real index', () => {
    const s = selectAssessableFrames([good, blurry, good, dark, good], 2);
    expect([...s.skip].sort()).toEqual([1, 3]);
    expect(s.excluded).toEqual([
      { index: 1, reason: 'too_blurry' },
      { index: 3, reason: 'too_dark' },
    ]);
    expect(s.degraded).toBe(false);
  });

  it('excludes nothing and flags degraded when too few frames would survive', () => {
    // THE load-bearing rule. Somebody has walked round a room filming; a survey
    // from poor frames, labelled as such, beats no survey at all.
    const s = selectAssessableFrames([good, blurry, dark, dark], 3);
    expect(s.skip.size).toBe(0);
    expect(s.degraded).toBe(true);
    expect(s.excluded).toHaveLength(3);
  });

  it('excludes when survivors exactly meet the minimum', () => {
    const s = selectAssessableFrames([good, good, blurry], 2);
    expect([...s.skip]).toEqual([2]);
    expect(s.degraded).toBe(false);
  });

  it('flags degraded when every single frame is unassessable', () => {
    const s = selectAssessableFrames([blurry, dark], 2);
    expect(s.skip.size).toBe(0);
    expect(s.degraded).toBe(true);
  });
});

describe('describeExclusions', () => {
  it('groups reasons into something a person can read', () => {
    const text = describeExclusions([
      { reason: 'too_blurry' },
      { reason: 'too_blurry' },
      { reason: 'too_dark' },
    ]);
    expect(text).toBe('2 too blurry to assess, 1 too dark to assess');
  });
});

describe('assessWalkthrough — skipFrames', () => {
  function frame(element: string): Phase1BuildingAssessment {
    return {
      damageAssessment: {
        damageType: 'damp',
        severity: 'developing',
        confidence: 70,
        location: element,
        description: '',
        detectedItems: [],
      },
      safetyHazards: {
        hazards: [],
        hasCriticalHazards: false,
        overallSafetyScore: 90,
      },
      compliance: { complianceIssues: [], complianceScore: 90 },
      insuranceRisk: {
        riskFactors: [],
        riskScore: 10,
        premiumImpact: 'low',
        mitigationSuggestions: [],
      },
      urgency: {
        urgency: 'planned',
        recommendedActionTimeline: 'x',
        reasoning: 'y',
        priorityScore: 10,
      },
      homeownerExplanation: { whatIsIt: '', whyItHappened: '', whatToDo: '' },
      contractorAdvice: {},
      findings: [
        {
          element,
          damageType: 'damp',
          severity: 'developing',
          conditionRating: 2,
          description: '',
          confidence: 70,
        },
      ],
    } as Phase1BuildingAssessment;
  }

  it('never calls the model for a skipped frame', async () => {
    const seen: string[] = [];

    const result = await assessWalkthrough(['a', 'b', 'c'], undefined, {
      concurrency: 1,
      skipFrames: new Set([1]),
      assessFrame: async (urls) => {
        seen.push(urls[0]!);
        return frame(urls[0]!);
      },
    });

    // The saved vision call is the point — it is cost as well as noise.
    expect(seen).toEqual(['a', 'c']);
    expect(result.framesSkippedForQuality).toBe(1);
    expect(result.framesAssessed).toBe(2);
    expect(result.frameCount).toBe(3);
  });

  it('keeps real frame indices across a skip', async () => {
    // A skipped frame becomes a hole, so 'c' stays index 2. If skipping
    // compacted the list, its finding would be captioned with frame b's photo.
    const result = await assessWalkthrough(['a', 'b', 'c'], undefined, {
      concurrency: 1,
      skipFrames: new Set([1]),
      assessFrame: async (urls) =>
        frame(urls[0] === 'a' ? 'main_walls' : 'windows'),
    });

    expect(
      result.assessment?.findings?.find((f) => f.element === 'windows')
        ?.sourceFrameIndex
    ).toBe(2);
  });

  it('returns no survey when every frame is skipped', async () => {
    const result = await assessWalkthrough(['a', 'b'], undefined, {
      concurrency: 1,
      skipFrames: new Set([0, 1]),
      assessFrame: async () => frame('ceilings'),
    });

    expect(result.assessment).toBeNull();
    expect(result.framesAssessed).toBe(0);
  });
});
