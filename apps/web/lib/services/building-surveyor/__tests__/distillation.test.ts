// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
/**
 * Unit tests for the VLM Teacher-Student Distillation services.
 *
 * Focuses on pure functions (no DB calls):
 *   - StudentShadowService.compareAssessments
 *   - ExperienceBufferService.computeSurpriseScore / computePriorityScore
 *   - TrainingDataExporter.toQwenConversation
 *   - SafetyRecallGate.validateStudentSafety
 */

import type { Phase1BuildingAssessment } from '../types';
import type { ShadowComparisonResult, VLMTrainingExample } from '../distillation/types';

// ---------------------------------------------------------------------------
// Mocks — must appear before imports of the modules under test
// ---------------------------------------------------------------------------

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: vi.fn() },
}));

vi.mock('@mintenance/shared', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

vi.mock('../../ai/CostControlService', () => ({
  CostControlService: {
    getBudgetStatus: vi.fn(),
    estimateCost: vi.fn(),
    recordUsage: vi.fn(),
  },
}));

vi.mock('../generator/AssessmentGenerator', () => ({
  callMintAiVLM: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports under test (after mocks)
// ---------------------------------------------------------------------------

import { StudentShadowService } from '../distillation/StudentShadowService';
import { ExperienceBufferService } from '../distillation/ExperienceBufferService';
import { TrainingDataExporter } from '../distillation/TrainingDataExporter';
import { SafetyRecallGate } from '../distillation/SafetyRecallGate';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeAssessment(
  overrides?: Partial<{
    damageType: string;
    severity: 'early' | 'midway' | 'full';
    confidence: number;
    urgency: 'immediate' | 'urgent' | 'soon' | 'planned' | 'monitor';
    hazards: Phase1BuildingAssessment['safetyHazards']['hazards'];
    hasCriticalHazards: boolean;
    overallSafetyScore: number;
  }>
): Phase1BuildingAssessment {
  return {
    damageAssessment: {
      damageType: overrides?.damageType ?? 'water_damage',
      severity: overrides?.severity ?? 'midway',
      confidence: overrides?.confidence ?? 85,
      location: 'Bathroom ceiling',
      description: 'Visible water stain with mold growth',
      detectedItems: ['water_stain', 'mold'],
    },
    safetyHazards: {
      hazards: overrides?.hazards ?? [],
      hasCriticalHazards: overrides?.hasCriticalHazards ?? false,
      overallSafetyScore: overrides?.overallSafetyScore ?? 70,
    },
    compliance: {
      complianceIssues: [],
      requiresProfessionalInspection: false,
      complianceScore: 90,
    },
    insuranceRisk: {
      riskFactors: [],
      riskScore: 30,
      premiumImpact: 'low',
      mitigationSuggestions: [],
    },
    urgency: {
      urgency: overrides?.urgency ?? 'soon',
      recommendedActionTimeline: 'Within 2 weeks',
      reasoning: 'Damage is progressing',
      priorityScore: 60,
    },
    homeownerExplanation: {
      whatIsIt: 'Water damage on ceiling',
      whyItHappened: 'Likely pipe leak above',
      whatToDo: 'Call a plumber',
    },
    contractorAdvice: {
      repairNeeded: ['Fix leak', 'Patch ceiling'],
      materials: [],
      tools: ['wrench'],
      estimatedTime: '3 hours',
      estimatedCost: { min: 100, max: 300, recommended: 200 },
      complexity: 'medium',
    },
  };
}

function makeHazard(type: string, severity = 'high' as const) {
  return {
    type,
    severity,
    location: 'Kitchen',
    description: `${type} hazard found`,
    urgency: 'urgent' as const,
  };
}

// ---------------------------------------------------------------------------
// 1. StudentShadowService.compareAssessments
// ---------------------------------------------------------------------------

describe('StudentShadowService.compareAssessments', () => {
  const baseArgs = {
    assessmentId: 'assess-001',
    latencyMs: 450,
    costUsd: 0.002,
    imageCount: 3,
  };

  it('returns all-zero agreement when student is null (parse failure)', () => {
    const teacher = makeAssessment();
    const result = StudentShadowService.compareAssessments(
      baseArgs.assessmentId, teacher, null, false,
      baseArgs.latencyMs, baseArgs.costUsd, baseArgs.imageCount,
    );

    expect(result.damageTypeMatch).toBe(false);
    expect(result.severityMatch).toBe(false);
    expect(result.urgencyMatch).toBe(false);
    expect(result.safetyRecall).toBe(0);
    expect(result.safetyPrecision).toBe(0);
    expect(result.overallAgreement).toBe(0);
    expect(result.confidenceDelta).toBe(0);
    expect(result.studentConfidence).toBe(0);
    expect(result.studentParseSuccess).toBe(false);
    expect(result.teacherConfidence).toBe(teacher.damageAssessment.confidence);
  });

  it('returns perfect agreement when teacher === student', () => {
    const teacher = makeAssessment();
    const student = makeAssessment(); // identical

    const result = StudentShadowService.compareAssessments(
      baseArgs.assessmentId, teacher, student, true,
      baseArgs.latencyMs, baseArgs.costUsd, baseArgs.imageCount,
    );

    expect(result.damageTypeMatch).toBe(true);
    expect(result.severityMatch).toBe(true);
    expect(result.urgencyMatch).toBe(true);
    expect(result.overallAgreement).toBe(1.0); // 0.35 + 0.25 + 0.15 + 0.25*1
    expect(result.confidenceDelta).toBe(0);
  });

  it('damageTypeMatch is case-insensitive', () => {
    const teacher = makeAssessment({ damageType: 'Water_Damage' });
    const student = makeAssessment({ damageType: 'water_damage' });

    const result = StudentShadowService.compareAssessments(
      baseArgs.assessmentId, teacher, student, true,
      baseArgs.latencyMs, baseArgs.costUsd, baseArgs.imageCount,
    );

    expect(result.damageTypeMatch).toBe(true);
  });

  it('severityMatch checks exact match', () => {
    const teacher = makeAssessment({ severity: 'midway' });
    const student = makeAssessment({ severity: 'full' });

    const result = StudentShadowService.compareAssessments(
      baseArgs.assessmentId, teacher, student, true,
      baseArgs.latencyMs, baseArgs.costUsd, baseArgs.imageCount,
    );

    expect(result.severityMatch).toBe(false);
  });

  it('urgencyMatch checks exact match', () => {
    const teacher = makeAssessment({ urgency: 'urgent' });
    const student = makeAssessment({ urgency: 'soon' });

    const result = StudentShadowService.compareAssessments(
      baseArgs.assessmentId, teacher, student, true,
      baseArgs.latencyMs, baseArgs.costUsd, baseArgs.imageCount,
    );

    expect(result.urgencyMatch).toBe(false);
  });

  it('safetyRecall = caught / total teacher hazards', () => {
    const teacher = makeAssessment({
      hazards: [makeHazard('electrical'), makeHazard('fire'), makeHazard('gas')],
    });
    const student = makeAssessment({
      hazards: [makeHazard('electrical'), makeHazard('fire')], // misses gas
    });

    const result = StudentShadowService.compareAssessments(
      baseArgs.assessmentId, teacher, student, true,
      baseArgs.latencyMs, baseArgs.costUsd, baseArgs.imageCount,
    );

    expect(result.safetyRecall).toBeCloseTo(2 / 3, 5);
  });

  it('safetyPrecision = correct / total student hazards', () => {
    const teacher = makeAssessment({
      hazards: [makeHazard('electrical')],
    });
    const student = makeAssessment({
      hazards: [makeHazard('electrical'), makeHazard('phantom_hazard')],
    });

    const result = StudentShadowService.compareAssessments(
      baseArgs.assessmentId, teacher, student, true,
      baseArgs.latencyMs, baseArgs.costUsd, baseArgs.imageCount,
    );

    expect(result.safetyPrecision).toBeCloseTo(1 / 2, 5);
  });

  it('safetyRecall and safetyPrecision default to 1 when no hazards exist', () => {
    const teacher = makeAssessment({ hazards: [] });
    const student = makeAssessment({ hazards: [] });

    const result = StudentShadowService.compareAssessments(
      baseArgs.assessmentId, teacher, student, true,
      baseArgs.latencyMs, baseArgs.costUsd, baseArgs.imageCount,
    );

    expect(result.safetyRecall).toBe(1);
    expect(result.safetyPrecision).toBe(1);
  });

  it('overallAgreement uses weighted formula: 0.35*dmg + 0.25*sev + 0.15*urg + 0.25*recall', () => {
    // Match only damageType and urgency, partial safety recall
    const teacher = makeAssessment({
      damageType: 'crack',
      severity: 'full',
      urgency: 'immediate',
      hazards: [makeHazard('electrical'), makeHazard('fire')],
    });
    const student = makeAssessment({
      damageType: 'crack',       // match  -> 0.35
      severity: 'midway',        // no match -> 0
      urgency: 'immediate',      // match  -> 0.15
      hazards: [makeHazard('electrical')], // recall 1/2 -> 0.25*0.5
    });

    const result = StudentShadowService.compareAssessments(
      baseArgs.assessmentId, teacher, student, true,
      baseArgs.latencyMs, baseArgs.costUsd, baseArgs.imageCount,
    );

    const expected = 0.35 + 0 + 0.15 + 0.25 * 0.5; // = 0.625
    expect(result.overallAgreement).toBeCloseTo(expected, 5);
  });

  it('confidenceDelta = student confidence - teacher confidence', () => {
    const teacher = makeAssessment({ confidence: 90 });
    const student = makeAssessment({ confidence: 72 });

    const result = StudentShadowService.compareAssessments(
      baseArgs.assessmentId, teacher, student, true,
      baseArgs.latencyMs, baseArgs.costUsd, baseArgs.imageCount,
    );

    expect(result.confidenceDelta).toBe(72 - 90);
  });
});

// ---------------------------------------------------------------------------
// 2. ExperienceBufferService.computeSurpriseScore
// ---------------------------------------------------------------------------

describe('ExperienceBufferService.computeSurpriseScore', () => {
  it('returns 1.0 when studentParseSuccess is false', () => {
    const comparison = {
      studentParseSuccess: false,
      overallAgreement: 0.8,
    } as ShadowComparisonResult;

    expect(ExperienceBufferService.computeSurpriseScore(comparison)).toBe(1.0);
  });

  it('returns 1 - overallAgreement when parse succeeded', () => {
    const comparison = {
      studentParseSuccess: true,
      overallAgreement: 0.75,
    } as ShadowComparisonResult;

    expect(ExperienceBufferService.computeSurpriseScore(comparison)).toBeCloseTo(0.25, 5);
  });

  it('returns 0 for perfect agreement', () => {
    const comparison = {
      studentParseSuccess: true,
      overallAgreement: 1.0,
    } as ShadowComparisonResult;

    expect(ExperienceBufferService.computeSurpriseScore(comparison)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 3. ExperienceBufferService.computePriorityScore
// ---------------------------------------------------------------------------

describe('ExperienceBufferService.computePriorityScore', () => {
  it('high surprise + underrepresented category + high confidence -> high score', () => {
    // surprise=0.9, confidence=95, categoryCount=5, target=50
    const score = ExperienceBufferService.computePriorityScore(0.9, 95, 5, 50);

    // surprise * 0.5 = 0.45
    // categoryBalance = 1 - 5/50 = 0.9, * 0.3 = 0.27
    // teacherQuality = min(95/100, 1) = 0.95, * 0.2 = 0.19
    // total = 0.91
    expect(score).toBeCloseTo(0.91, 2);
  });

  it('zero surprise yields only teacher quality + category components', () => {
    const score = ExperienceBufferService.computePriorityScore(0, 80, 10, 50);

    // surprise * 0.5 = 0
    // categoryBalance = 1 - 10/50 = 0.8, * 0.3 = 0.24
    // teacherQuality = 0.8, * 0.2 = 0.16
    // total = 0.40
    expect(score).toBeCloseTo(0.40, 2);
  });

  it('category at target gives categoryBalanceScore = 0', () => {
    const score = ExperienceBufferService.computePriorityScore(0.5, 70, 50, 50);

    // surprise * 0.5 = 0.25
    // categoryBalance = 0 (count >= target)
    // teacherQuality = 0.7, * 0.2 = 0.14
    // total = 0.39
    expect(score).toBeCloseTo(0.39, 2);
  });

  it('category over target still gives categoryBalanceScore = 0', () => {
    const score = ExperienceBufferService.computePriorityScore(0.5, 70, 100, 50);
    const scoreAtTarget = ExperienceBufferService.computePriorityScore(0.5, 70, 50, 50);

    expect(score).toBe(scoreAtTarget);
  });

  it('follows formula: surprise*0.5 + categoryBalance*0.3 + teacherQuality*0.2', () => {
    const surprise = 0.6;
    const confidence = 100;
    const categoryCount = 25;
    const target = 50;

    const expected =
      surprise * 0.5 +
      (1 - categoryCount / target) * 0.3 +
      Math.min(confidence / 100, 1) * 0.2;

    const score = ExperienceBufferService.computePriorityScore(
      surprise, confidence, categoryCount, target,
    );

    expect(score).toBeCloseTo(expected, 10);
  });
});

// ---------------------------------------------------------------------------
// 4. TrainingDataExporter.toQwenConversation
// ---------------------------------------------------------------------------

describe('TrainingDataExporter.toQwenConversation', () => {
  const example: VLMTrainingExample = {
    id: 'ex-001',
    assessmentId: 'assess-001',
    imageUrls: ['https://storage.example.com/img1.jpg', 'https://storage.example.com/img2.jpg'],
    systemPrompt: 'PROPRIETARY: secret prompt engineering here',
    userPrompt: 'Analyze this bathroom ceiling damage',
    teacherResponse: makeAssessment(),
    studentResponse: null,
    surpriseScore: 0.7,
    priorityScore: 0.85,
    difficultyScore: null,
    damageCategory: 'water_damage',
    severity: 'midway',
    teacherConfidence: 85,
    teacherQuality: 'high',
    humanVerified: false,
    usedInTraining: false,
    trainingRound: null,
    createdAt: new Date('2026-02-15'),
  };

  it('returns exactly 3 messages: system, user, assistant', () => {
    const conversation = TrainingDataExporter.toQwenConversation(example);

    expect(conversation.messages).toHaveLength(3);
    expect(conversation.messages[0].role).toBe('system');
    expect(conversation.messages[1].role).toBe('user');
    expect(conversation.messages[2].role).toBe('assistant');
  });

  it('system message uses a generic training prompt, NOT the example systemPrompt', () => {
    const conversation = TrainingDataExporter.toQwenConversation(example);
    const systemContent = conversation.messages[0].content as string;

    expect(systemContent).not.toContain('PROPRIETARY');
    expect(systemContent).not.toContain('secret');
    expect(systemContent).toContain('building damage assessment');
  });

  it('user content includes text and image_url entries', () => {
    const conversation = TrainingDataExporter.toQwenConversation(example);
    const userContent = conversation.messages[1].content;

    expect(Array.isArray(userContent)).toBe(true);
    const items = userContent as Array<{ type: string; text?: string; image_url?: { url: string } }>;

    // First element: text prompt
    expect(items[0]).toEqual({ type: 'text', text: example.userPrompt });

    // Subsequent elements: one image_url per image
    expect(items[1]).toEqual({
      type: 'image_url',
      image_url: { url: 'https://storage.example.com/img1.jpg' },
    });
    expect(items[2]).toEqual({
      type: 'image_url',
      image_url: { url: 'https://storage.example.com/img2.jpg' },
    });

    expect(items).toHaveLength(3); // 1 text + 2 images
  });

  it('assistant content is JSON.stringify of teacherResponse', () => {
    const conversation = TrainingDataExporter.toQwenConversation(example);
    const assistantContent = conversation.messages[2].content as string;

    expect(assistantContent).toBe(JSON.stringify(example.teacherResponse));
    // Verify it round-trips back to the same object
    expect(JSON.parse(assistantContent)).toEqual(example.teacherResponse);
  });
});

// ---------------------------------------------------------------------------
// 5. SafetyRecallGate.validateStudentSafety
// ---------------------------------------------------------------------------

describe('SafetyRecallGate.validateStudentSafety', () => {
  it('returns safe:true for normal non-hazardous assessment', () => {
    const assessment = makeAssessment({ confidence: 80, overallSafetyScore: 70 });
    const result = SafetyRecallGate.validateStudentSafety(assessment, 'water_damage');

    expect(result.safe).toBe(true);
    expect(result.failReason).toBeUndefined();
  });

  it.each([
    'structural_failure',
    'electrical_hazard',
    'fire_hazard',
    'asbestos',
    'mold_toxicity',
    'gas_leak',
    'lead_paint',
  ])('returns safe:false when always-hazardous category "%s" has NO hazards', (category) => {
    const assessment = makeAssessment({
      confidence: 80,
      hazards: [],
      hasCriticalHazards: false,
    });

    const result = SafetyRecallGate.validateStudentSafety(assessment, category);

    expect(result.safe).toBe(false);
    expect(result.failReason).toContain(category);
    expect(result.failReason).toContain('expected hazards');
  });

  it('returns safe:true for always-hazardous category when hazards ARE reported', () => {
    const assessment = makeAssessment({
      confidence: 80,
      hazards: [makeHazard('electrical')],
      hasCriticalHazards: true,
    });

    const result = SafetyRecallGate.validateStudentSafety(assessment, 'electrical_hazard');

    expect(result.safe).toBe(true);
  });

  it('returns safe:false when confidence < 40', () => {
    const assessment = makeAssessment({ confidence: 35 });
    const result = SafetyRecallGate.validateStudentSafety(assessment, 'water_damage');

    expect(result.safe).toBe(false);
    expect(result.failReason).toContain('confidence too low');
  });

  it('returns safe:true when confidence is exactly 40', () => {
    const assessment = makeAssessment({ confidence: 40 });
    const result = SafetyRecallGate.validateStudentSafety(assessment, 'water_damage');

    expect(result.safe).toBe(true);
  });

  it('returns safe:false when high safety score contradicts immediate urgency', () => {
    const assessment = makeAssessment({
      confidence: 80,
      overallSafetyScore: 85,
      urgency: 'immediate',
    });

    const result = SafetyRecallGate.validateStudentSafety(assessment, 'water_damage');

    expect(result.safe).toBe(false);
    expect(result.failReason).toContain('Contradiction');
  });

  it('returns safe:true when safety score <= 80 with immediate urgency (no contradiction)', () => {
    const assessment = makeAssessment({
      confidence: 80,
      overallSafetyScore: 80,
      urgency: 'immediate',
    });

    const result = SafetyRecallGate.validateStudentSafety(assessment, 'water_damage');

    expect(result.safe).toBe(true);
  });
});
