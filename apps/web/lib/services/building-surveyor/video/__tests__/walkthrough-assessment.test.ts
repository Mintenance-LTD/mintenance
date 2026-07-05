import { describe, it, expect } from 'vitest';
import { assessWalkthrough } from '../walkthrough-assessment';
import type {
  Phase1BuildingAssessment,
  DamageSeverity,
  RICSConditionRating,
} from '../../types';

/**
 * Minimal-but-valid frame survey. Only the fields the merge actually reads are
 * meaningful; the rest are filled to satisfy the type.
 */
function makeFrame(opts: {
  element: string;
  damageType: string;
  severity: DamageSeverity;
  confidence: number;
  conditionRating?: RICSConditionRating;
  taxonomyClassId?: string;
  safetyScore?: number;
  riskScore?: number;
  sceneSummary?: string;
  needsOnsiteInspection?: boolean;
}): Phase1BuildingAssessment {
  return {
    damageAssessment: {
      damageType: opts.damageType,
      severity: opts.severity,
      confidence: opts.confidence,
      location: opts.element,
      description: `${opts.damageType} on ${opts.element}`,
      detectedItems: [],
    },
    safetyHazards: {
      hazards: [],
      hasCriticalHazards: opts.severity === 'dangerous',
      overallSafetyScore: opts.safetyScore ?? 90,
    },
    compliance: {
      complianceIssues: [],
      requiresProfessionalInspection: false,
      complianceScore: 90,
    },
    insuranceRisk: {
      riskFactors: [],
      riskScore: opts.riskScore ?? 10,
      premiumImpact: 'none',
      mitigationSuggestions: [],
    },
    urgency: {
      urgency: opts.severity === 'dangerous' ? 'immediate' : 'monitor',
      reasoning: 'test',
      timeframe: 'n/a',
    },
    homeownerExplanation: {
      summary: 'test',
      whatHappened: 'test',
      whyItMatters: 'test',
      nextSteps: [],
    },
    contractorAdvice: {
      repairNeeded: [],
      materials: [],
      tools: [],
      estimatedTime: '1 day',
      estimatedCost: { min: 100, max: 200, recommended: 150 },
      complexity: 'low',
      recommendedTrades: [],
    },
    findings: [
      {
        element: opts.element,
        taxonomyClassId: opts.taxonomyClassId,
        damageType: opts.damageType,
        severity: opts.severity,
        conditionRating: opts.conditionRating,
        description: `${opts.damageType} on ${opts.element}`,
        confidence: opts.confidence,
      },
    ],
    sceneSummary: opts.sceneSummary,
    needsOnsiteInspection: opts.needsOnsiteInspection,
  } as Phase1BuildingAssessment;
}

describe('assessWalkthrough', () => {
  it('pairs each result with its frame URL and merges duplicate defects', async () => {
    const urls = ['https://x/1.jpg', 'https://x/2.jpg', 'https://x/3.jpg'];
    // Frames 1 & 2: same damp defect on the same wall (must dedup to one).
    // Frame 3: a distinct, more severe electrical hazard (must be primary).
    const frames: Record<string, Phase1BuildingAssessment> = {
      [urls[0]]: makeFrame({
        element: 'main_walls',
        damageType: 'damp',
        severity: 'developing',
        confidence: 60,
        conditionRating: 2,
      }),
      [urls[1]]: makeFrame({
        element: 'main_walls',
        damageType: 'damp',
        severity: 'significant',
        confidence: 80,
        conditionRating: 2,
      }),
      [urls[2]]: makeFrame({
        element: 'electrical_services',
        damageType: 'exposed_wiring',
        severity: 'dangerous',
        confidence: 85,
        conditionRating: 3,
        riskScore: 85,
      }),
    };

    const result = await assessWalkthrough(urls, undefined, {
      concurrency: 2,
      assessFrame: async ([url]) => frames[url],
    });

    expect(result.frameCount).toBe(3);
    expect(result.framesAssessed).toBe(3);
    // url↔assessment pairing is preserved and correct.
    expect(result.perFrameAssessments.map((p) => p.url)).toEqual(urls);
    // Two physical defects after dedup (damp + electrical), not three.
    expect(result.assessment?.findings).toHaveLength(2);
    // Most severe defect drives the primary + worst RICS rating + risk.
    expect(result.assessment?.damageAssessment.damageType).toBe(
      'exposed_wiring'
    );
    expect(result.assessment?.damageAssessment.severity).toBe('dangerous');
    expect(result.assessment?.ricsConditionRating).toBe(3);
    expect(result.assessment?.insuranceRisk.riskScore).toBe(85);
  });

  it('skips a frame that throws without sinking the walk', async () => {
    const urls = ['https://x/ok.jpg', 'https://x/bad.jpg'];
    const ok = makeFrame({
      element: 'roof',
      damageType: 'missing_tiles',
      severity: 'developing',
      confidence: 70,
    });
    const result = await assessWalkthrough(urls, undefined, {
      assessFrame: async ([url]) => {
        if (url.includes('bad')) throw new Error('vision timeout');
        return ok;
      },
    });

    expect(result.frameCount).toBe(2);
    expect(result.framesAssessed).toBe(1);
    expect(result.perFrameAssessments).toHaveLength(1);
    expect(result.perFrameAssessments[0].url).toBe('https://x/ok.jpg');
    expect(result.assessment?.damageAssessment.damageType).toBe(
      'missing_tiles'
    );
  });

  it('returns a null assessment when every frame fails', async () => {
    const result = await assessWalkthrough(
      ['https://x/a.jpg', 'https://x/b.jpg'],
      undefined,
      {
        assessFrame: async () => {
          throw new Error('all down');
        },
      }
    );
    expect(result.assessment).toBeNull();
    expect(result.perFrameAssessments).toHaveLength(0);
    expect(result.framesAssessed).toBe(0);
  });

  it('ORs needsOnsiteInspection across frames (any abstention flags the walk)', async () => {
    const urls = ['https://x/1.jpg', 'https://x/2.jpg'];
    const frames: Record<string, Phase1BuildingAssessment> = {
      [urls[0]]: makeFrame({
        element: 'main_walls',
        damageType: 'crack',
        severity: 'developing',
        confidence: 65,
      }),
      [urls[1]]: makeFrame({
        element: 'ceilings',
        damageType: 'stain',
        severity: 'early',
        confidence: 40,
        needsOnsiteInspection: true,
      }),
    };
    const result = await assessWalkthrough(urls, undefined, {
      assessFrame: async ([url]) => frames[url],
    });
    expect(result.assessment?.needsOnsiteInspection).toBe(true);
  });
});
