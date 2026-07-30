import { describe, it, expect } from 'vitest';
import { assessWalkthrough } from '../walkthrough-assessment';
import { buildWalkthroughAssessment } from '../build-walkthrough-assessment';
import type { Phase1BuildingAssessment } from '../../types';

/**
 * sourceFrameIndex must be the frame's REAL position in the walkthrough.
 *
 * That index is what the UI feeds into assessment_images to fetch the photograph
 * shown beside a finding. The builder used to receive a COMPACTED array
 * (`perFrame.filter(Boolean)`), so one failed frame shifted every later index
 * down by one and each finding after it was captioned with the wrong picture —
 * the precise failure the provenance feature exists to prevent, and worse than
 * showing nothing, because a wrong photograph looks like corroboration.
 */

function frameWith(
  element: string,
  over: Partial<Phase1BuildingAssessment> = {}
): Phase1BuildingAssessment {
  return {
    damageAssessment: {
      damageType: 'damp',
      severity: 'developing',
      confidence: 70,
      location: element,
      description: `${element} defect`,
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
      riskScore: 20,
      premiumImpact: 'low',
      mitigationSuggestions: [],
    },
    urgency: {
      urgency: 'planned',
      recommendedActionTimeline: 'Soon',
      reasoning: 'r',
      priorityScore: 20,
    },
    homeownerExplanation: { whatIsIt: '', whyItHappened: '', whatToDo: '' },
    contractorAdvice: {},
    findings: [
      {
        element,
        damageType: 'damp',
        severity: 'developing',
        conditionRating: 2,
        description: `${element} defect`,
        confidence: 70,
      },
    ],
    ...over,
  } as Phase1BuildingAssessment;
}

describe('buildWalkthroughAssessment — frame index alignment', () => {
  it('keeps a finding on its real frame index when an earlier frame is a hole', () => {
    // Frame 0 produced nothing; the ceilings defect is frame 1. Compacting would
    // report it as frame 0 and the UI would show the wrong photograph.
    const merged = buildWalkthroughAssessment([null, frameWith('ceilings')]);

    const ceilings = merged?.findings?.find((f) => f.element === 'ceilings');
    expect(ceilings?.sourceFrameIndex).toBe(1);
  });

  it('survives several holes without drifting', () => {
    const merged = buildWalkthroughAssessment([
      null,
      null,
      frameWith('main_walls'),
      null,
      frameWith('windows'),
    ]);

    expect(
      merged?.findings?.find((f) => f.element === 'main_walls')
        ?.sourceFrameIndex
    ).toBe(2);
    expect(
      merged?.findings?.find((f) => f.element === 'windows')?.sourceFrameIndex
    ).toBe(4);
  });

  it('still returns null when every frame is a hole', () => {
    expect(buildWalkthroughAssessment([null, null])).toBeNull();
  });

  it('counts holes toward the walk length, so corroboration sees the real total', () => {
    // A defect seen in 1 of 12 frames is weak evidence whether the other 11
    // reported nothing or could not be assessed.
    const frames: (Phase1BuildingAssessment | null)[] = [
      frameWith('ceilings'),
      ...Array.from({ length: 11 }, () => null),
    ];

    const merged = buildWalkthroughAssessment(frames);
    expect(merged?.findings?.[0]?.unconfirmed).toBe(true);
  });
});

describe('assessWalkthrough — frame index alignment end to end', () => {
  it('reports the real frame index when a middle frame throws', async () => {
    const urls = ['f0.jpg', 'f1.jpg', 'f2.jpg'];

    const result = await assessWalkthrough(urls, undefined, {
      concurrency: 1,
      assessFrame: async (imageUrls) => {
        const url = imageUrls[0];
        if (url === 'f1.jpg') throw new Error('vision call failed');
        // Name the element after the frame so the mapping is checkable.
        return frameWith(url === 'f0.jpg' ? 'main_walls' : 'windows');
      },
    });

    expect(result.framesAssessed).toBe(2);
    expect(result.frameCount).toBe(3);

    const windows = result.assessment?.findings?.find(
      (f) => f.element === 'windows'
    );
    // f2.jpg is index 2. Compacting would have called it 1.
    expect(windows?.sourceFrameIndex).toBe(2);

    const walls = result.assessment?.findings?.find(
      (f) => f.element === 'main_walls'
    );
    expect(walls?.sourceFrameIndex).toBe(0);
  });

  it('leaves the teacher corpus compacted — it pairs url to assessment directly', async () => {
    // perFrameAssessments is used for training pairs, where url+assessment are
    // carried together, so holes there would be noise.
    const result = await assessWalkthrough(['a.jpg', 'b.jpg'], undefined, {
      concurrency: 1,
      assessFrame: async (imageUrls) => {
        if (imageUrls[0] === 'a.jpg') throw new Error('nope');
        return frameWith('ceilings');
      },
    });

    expect(result.perFrameAssessments).toHaveLength(1);
    expect(result.perFrameAssessments[0]?.url).toBe('b.jpg');
  });
});
