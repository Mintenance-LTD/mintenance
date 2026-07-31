import { describe, it, expect } from 'vitest';
import {
  clampAbstainedAssessment,
  hasDangerousFinding,
  ABSTAINED_MAX_CONFIDENCE,
} from '../abstention-clamp';
import type { Phase1BuildingAssessment } from '../types';

/**
 * Abstention has to mean something downstream.
 *
 * Modelled on the real survey: it said "Cannot determine if socket is adequately
 * protected from water exposure" and then asserted Condition 3, Significant,
 * 70% confidence, insurance 80/100 with High premium impact, and an Electrical
 * Inspector referral marked urgent — within 24 hours. The words abstained; the
 * numbers did not, and the numbers are what the homeowner acts on.
 */

function assessment(
  over: Partial<Phase1BuildingAssessment> = {}
): Phase1BuildingAssessment {
  return {
    damageAssessment: {
      damageType: 'potential electrical hazard',
      severity: 'significant',
      confidence: 70,
      location: 'electrical_services',
      description: 'Electrical socket near kitchen counter.',
      detectedItems: [],
    },
    safetyHazards: {
      hazards: [
        {
          type: 'electrical hazard',
          severity: 'medium',
          location: 'kitchen',
          description: 'Socket near water source.',
          urgency: 'urgent',
        },
      ],
      hasCriticalHazards: false,
      overallSafetyScore: 75,
    },
    compliance: { complianceIssues: [], complianceScore: 70 },
    insuranceRisk: {
      riskFactors: [],
      riskScore: 80,
      premiumImpact: 'high',
      mitigationSuggestions: [],
    },
    urgency: {
      urgency: 'urgent',
      recommendedActionTimeline: 'Within 24 hours',
      reasoning: 'Potential shock risk.',
      priorityScore: 80,
    },
    homeownerExplanation: {
      whatIsIt: 'A socket near the counter.',
      whyItHappened: 'Placement.',
      whatToDo: 'Have it inspected.',
    },
    contractorAdvice: {},
    ricsConditionRating: 3,
    needsOnsiteInspection: true,
    onsiteInspectionReason:
      'Cannot determine if socket is adequately protected from water exposure.',
    specialistReferrals: [
      {
        specialistType: 'electrical_inspector',
        reason: 'To ensure electrical safety and compliance.',
        urgency: 'urgent',
      },
    ],
    findings: [
      {
        element: 'electrical_services',
        damageType: 'potential electrical hazard',
        severity: 'significant',
        conditionRating: 3,
        description: 'Socket near counter.',
        confidence: 70,
      },
    ],
    ...over,
  } as Phase1BuildingAssessment;
}

describe('clampAbstainedAssessment — an abstained survey', () => {
  it('caps confidence to the level the prompt already asks for', () => {
    const out = clampAbstainedAssessment(assessment());
    expect(out.damageAssessment.confidence).toBe(ABSTAINED_MAX_CONFIDENCE);
  });

  it('will not assert Condition 3 about a defect it could not diagnose', () => {
    const out = clampAbstainedAssessment(assessment());
    expect(out.ricsConditionRating).toBe(2);
    expect(out.findings?.[0]?.conditionRating).toBe(2);
  });

  it('downgrades "within 24 hours" to soon, and rewrites the timeline with it', () => {
    // Leaving the free-text timeline would keep saying "Within 24 hours"
    // underneath a downgraded badge.
    const out = clampAbstainedAssessment(assessment());
    expect(out.urgency.urgency).toBe('soon');
    expect(out.urgency.recommendedActionTimeline).not.toMatch(/24 hours/i);
  });

  it('caps the insurance risk that turns a maybe into a premium', () => {
    const out = clampAbstainedAssessment(assessment());
    expect(out.insuranceRisk.riskScore).toBeLessThanOrEqual(50);
    expect(out.insuranceRisk.premiumImpact).toBe('medium');
  });

  it('keeps the specialist referral but stops it being an emergency', () => {
    // Knowing who to call is the POINT of abstaining — it just is not urgent.
    const out = clampAbstainedAssessment(assessment());
    expect(out.specialistReferrals).toHaveLength(1);
    expect(out.specialistReferrals?.[0]?.specialistType).toBe(
      'electrical_inspector'
    );
    expect(out.specialistReferrals?.[0]?.urgency).toBe('soon');
  });

  it('keeps the hazard on the record and only softens its urgency', () => {
    // The observation may be real even when the diagnosis is not. Deleting a
    // hazard is a worse error than softening one.
    const out = clampAbstainedAssessment(assessment());
    expect(out.safetyHazards.hazards).toHaveLength(1);
    expect(out.safetyHazards.hazards[0]?.urgency).toBe('soon');
  });

  it('preserves the reason it abstained', () => {
    const out = clampAbstainedAssessment(assessment());
    expect(out.needsOnsiteInspection).toBe(true);
    expect(out.onsiteInspectionReason).toMatch(/Cannot determine/);
  });
});

describe('clampAbstainedAssessment — what it must never touch', () => {
  it('leaves a confident survey completely alone', () => {
    const confident = assessment({ needsOnsiteInspection: false });
    expect(clampAbstainedAssessment(confident)).toBe(confident);
  });

  it('leaves a survey alone when abstention is simply absent', () => {
    const plain = assessment({ needsOnsiteInspection: undefined });
    expect(clampAbstainedAssessment(plain)).toBe(plain);
  });

  it('never talks down a dangerous finding, however uncertain the diagnosis', () => {
    // "I can see exposed wiring but cannot tell whether it is live" is an
    // abstention that should still shout. Clamping this is the one failure mode
    // worse than over-alarming.
    const dangerous = assessment({
      damageAssessment: {
        damageType: 'exposed wiring',
        severity: 'dangerous',
        confidence: 70,
        location: 'electrical_services',
        description: 'Exposed conductors.',
        detectedItems: [],
      },
    });

    const out = clampAbstainedAssessment(dangerous);
    expect(out).toBe(dangerous);
    expect(out.ricsConditionRating).toBe(3);
    expect(out.urgency.urgency).toBe('urgent');
    expect(out.insuranceRisk.riskScore).toBe(80);
  });

  it('spares a survey whose dangerous finding is not the primary', () => {
    // The merge can leave a dangerous finding in the list while the primary is
    // something milder.
    const withDangerous = assessment({
      findings: [
        {
          element: 'main_walls',
          damageType: 'damp',
          severity: 'developing',
          conditionRating: 2,
          description: 'Staining.',
          confidence: 60,
        },
        {
          element: 'electrical_services',
          damageType: 'exposed wiring',
          severity: 'dangerous',
          conditionRating: 3,
          description: 'Exposed conductors.',
          confidence: 70,
        },
      ],
    });

    expect(clampAbstainedAssessment(withDangerous)).toBe(withDangerous);
  });

  it('spares a survey flagged with critical safety hazards', () => {
    const critical = assessment({
      safetyHazards: {
        hazards: [
          {
            type: 'electrical hazard',
            severity: 'critical',
            location: 'kitchen',
            description: 'Live conductors exposed.',
            urgency: 'immediate',
          },
        ],
        hasCriticalHazards: true,
        overallSafetyScore: 20,
      },
    });

    expect(clampAbstainedAssessment(critical)).toBe(critical);
  });
});

describe('clampAbstainedAssessment — mechanics', () => {
  it('is idempotent, so it can be applied per frame and again after the merge', () => {
    const once = clampAbstainedAssessment(assessment());
    const twice = clampAbstainedAssessment(once);
    expect(twice).toEqual(once);
  });

  it('does not mutate its input', () => {
    const input = assessment();
    clampAbstainedAssessment(input);
    expect(input.ricsConditionRating).toBe(3);
    expect(input.damageAssessment.confidence).toBe(70);
    expect(input.urgency.urgency).toBe('urgent');
  });

  it('leaves values already under the ceilings untouched', () => {
    const mild = assessment({
      ricsConditionRating: 1,
      urgency: {
        urgency: 'monitor',
        recommendedActionTimeline: 'Keep an eye on it',
        reasoning: 'Minor.',
        priorityScore: 10,
      },
      insuranceRisk: {
        riskFactors: [],
        riskScore: 10,
        premiumImpact: 'low',
        mitigationSuggestions: [],
      },
    });

    const out = clampAbstainedAssessment(mild);
    expect(out.ricsConditionRating).toBe(1);
    expect(out.urgency.urgency).toBe('monitor');
    expect(out.urgency.recommendedActionTimeline).toBe('Keep an eye on it');
    expect(out.insuranceRisk.riskScore).toBe(10);
    expect(out.insuranceRisk.premiumImpact).toBe('low');
  });

  it('survives a sparse assessment without throwing', () => {
    const sparse = {
      needsOnsiteInspection: true,
      damageAssessment: {
        damageType: 'unknown',
        severity: 'developing',
        confidence: 90,
        location: 'general',
        description: '',
        detectedItems: [],
      },
    } as unknown as Phase1BuildingAssessment;

    const out = clampAbstainedAssessment(sparse);
    expect(out.damageAssessment.confidence).toBe(ABSTAINED_MAX_CONFIDENCE);
  });
});

describe('hasDangerousFinding', () => {
  it('detects danger from the primary, the findings, or the hazard flags', () => {
    expect(hasDangerousFinding(assessment())).toBe(false);
    expect(
      hasDangerousFinding(
        assessment({
          findings: [
            {
              element: 'x',
              damageType: 'y',
              severity: 'dangerous',
              description: '',
              confidence: 1,
            },
          ],
        })
      )
    ).toBe(true);
  });
});
