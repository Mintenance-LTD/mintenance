import { describe, it, expect } from 'vitest';
import {
  applyFindingVerdicts,
  isVerifyOutcomeAcceptable,
  parseVerifyResponse,
  buildVerifyPrompt,
  shouldRunVerifyPass,
  verifyWalkthroughFindings,
  MAX_DROP_SHARE,
} from '../verify-findings';
import type { AssessmentFinding } from '../../types';

/**
 * The verify pass — asking the model to justify its own findings.
 *
 * Every other control constrains the surveyor before it answers. This one runs
 * after, and because it DELETES findings it needs the strictest safety rules in
 * the pipeline: a verifier must never be able to talk down a hazard, and a
 * confused response must never be able to empty a survey.
 */

const finding = (over: Partial<AssessmentFinding> = {}): AssessmentFinding => ({
  element: 'ceilings',
  damageType: 'discoloration',
  severity: 'developing',
  conditionRating: 2,
  description: 'Visible discoloration on the ceiling',
  confidence: 70,
  ...over,
});

describe('shouldRunVerifyPass', () => {
  it('is off unless explicitly enabled', () => {
    // Off by default: it spends money per walkthrough and prunes findings on
    // unvalidated model output.
    expect(shouldRunVerifyPass({})).toBe(false);
    expect(shouldRunVerifyPass({ WALKTHROUGH_VERIFY_PASS: 'false' })).toBe(
      false
    );
    expect(shouldRunVerifyPass({ WALKTHROUGH_VERIFY_PASS: '1' })).toBe(false);
  });

  it('is on for exactly "true"', () => {
    expect(shouldRunVerifyPass({ WALKTHROUGH_VERIFY_PASS: 'true' })).toBe(true);
  });
});

describe('applyFindingVerdicts', () => {
  it('drops an unsupported finding', () => {
    const out = applyFindingVerdicts(
      [finding(), finding({ element: 'main_walls' })],
      [
        { index: 0, supported: false },
        { index: 1, supported: true },
      ]
    );

    expect(out.findings).toHaveLength(1);
    expect(out.findings[0]?.element).toBe('main_walls');
    expect(out.dropped).toHaveLength(1);
  });

  it('keeps an unsupported DANGEROUS finding, marked unconfirmed', () => {
    // A verifier does not get to delete a hazard on its own say-so.
    const out = applyFindingVerdicts(
      [finding({ severity: 'dangerous', conditionRating: 3 })],
      [{ index: 0, supported: false }]
    );

    expect(out.dropped).toEqual([]);
    expect(out.findings).toHaveLength(1);
    expect(out.findings[0]?.severity).toBe('dangerous');
    expect(out.findings[0]?.unconfirmed).toBe(true);
    expect(out.softened).toHaveLength(1);
  });

  it('keeps an unsupported clean reading', () => {
    // "Nothing wrong here" asserts nothing, so there is no evidence to fail to
    // find.
    const out = applyFindingVerdicts(
      [finding({ isClear: true, severity: 'early', conditionRating: 1 })],
      [{ index: 0, supported: false }]
    );

    expect(out.dropped).toEqual([]);
    expect(out.findings).toHaveLength(1);
  });

  it('keeps a finding the verifier said nothing about', () => {
    // Silence is not rejection. A truncated response must not empty the survey.
    const out = applyFindingVerdicts(
      [finding(), finding({ element: 'windows' })],
      [{ index: 0, supported: true }]
    );

    expect(out.findings).toHaveLength(2);
    expect(out.dropped).toEqual([]);
  });

  it('changes nothing when there are no verdicts at all', () => {
    const findings = [finding()];
    const out = applyFindingVerdicts(findings, undefined);
    expect(out.findings).toBe(findings);

    const empty = applyFindingVerdicts(findings, []);
    expect(empty.findings).toBe(findings);
  });

  it('ignores verdicts with a non-integer index', () => {
    const out = applyFindingVerdicts(
      [finding()],
      [{ index: 1.5 as number, supported: false }]
    );
    expect(out.findings).toHaveLength(1);
    expect(out.dropped).toEqual([]);
  });

  it('ignores a verdict pointing past the end of the list', () => {
    const out = applyFindingVerdicts(
      [finding()],
      [{ index: 7, supported: false }]
    );
    expect(out.findings).toHaveLength(1);
  });

  it('does not mutate its input', () => {
    const input = [finding({ severity: 'dangerous' })];
    applyFindingVerdicts(input, [{ index: 0, supported: false }]);
    expect(input[0]?.unconfirmed).toBeUndefined();
  });

  it('handles an absent findings list', () => {
    expect(
      applyFindingVerdicts(undefined, [{ index: 0, supported: false }]).findings
    ).toEqual([]);
  });
});

describe('isVerifyOutcomeAcceptable', () => {
  it('accepts a normal pruning', () => {
    const original = [finding(), finding(), finding(), finding()];
    const outcome = applyFindingVerdicts(original, [
      { index: 0, supported: false },
    ]);
    expect(isVerifyOutcomeAcceptable(original, outcome)).toBe(true);
  });

  it('refuses a wholesale rejection', () => {
    // A confused verifier rejecting the lot would turn a survey with real
    // defects into a clean bill of health — the most dangerous outcome a safety
    // check can have. The original survey stands instead.
    const original = [finding(), finding(), finding(), finding()];
    const outcome = applyFindingVerdicts(
      original,
      original.map((_, index) => ({ index, supported: false }))
    );

    expect(outcome.dropped).toHaveLength(4);
    expect(isVerifyOutcomeAcceptable(original, outcome)).toBe(false);
  });

  it('accepts exactly at the threshold', () => {
    // 5 findings, 3 dropped = 0.6, which is the ceiling and still allowed.
    const original = Array.from({ length: 5 }, () => finding());
    const outcome = applyFindingVerdicts(original, [
      { index: 0, supported: false },
      { index: 1, supported: false },
      { index: 2, supported: false },
    ]);
    expect(outcome.dropped.length / original.length).toBe(MAX_DROP_SHARE);
    expect(isVerifyOutcomeAcceptable(original, outcome)).toBe(true);
  });

  it('accepts an empty survey trivially', () => {
    expect(
      isVerifyOutcomeAcceptable([], { findings: [], dropped: [], softened: [] })
    ).toBe(true);
  });
});

describe('parseVerifyResponse', () => {
  it('parses a clean response', () => {
    const v = parseVerifyResponse(
      '{"verdicts":[{"index":0,"supported":true,"evidence":"tide line above skirting"}]}'
    );
    expect(v).toEqual([
      { index: 0, supported: true, evidence: 'tide line above skirting' },
    ]);
  });

  it('tolerates a fenced code block', () => {
    const v = parseVerifyResponse(
      '```json\n{"verdicts":[{"index":1,"supported":false}]}\n```'
    );
    expect(v).toEqual([{ index: 1, supported: false, evidence: undefined }]);
  });

  it('returns null on malformed JSON rather than throwing', () => {
    // A bad response must leave the survey untouched, not fail the walkthrough.
    expect(parseVerifyResponse('not json at all')).toBeNull();
    expect(parseVerifyResponse('')).toBeNull();
    expect(parseVerifyResponse('{"verdicts":')).toBeNull();
  });

  it('returns null when verdicts is missing or not an array', () => {
    expect(parseVerifyResponse('{"ok":true}')).toBeNull();
    expect(parseVerifyResponse('{"verdicts":"yes"}')).toBeNull();
  });

  it('discards rows missing the fields that matter', () => {
    const v = parseVerifyResponse(
      '{"verdicts":[{"index":0},{"supported":true},{"index":2,"supported":false}]}'
    );
    expect(v).toEqual([{ index: 2, supported: false, evidence: undefined }]);
  });

  it('returns null when nothing usable survives', () => {
    expect(parseVerifyResponse('{"verdicts":[{"nope":1}]}')).toBeNull();
  });
});

describe('verifyWalkthroughFindings — every bail-out returns the survey untouched', () => {
  const assessment = {
    damageAssessment: {
      damageType: 'damp',
      severity: 'developing',
      confidence: 70,
      location: 'ceilings',
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
    findings: [finding()],
  } as unknown as Parameters<typeof verifyWalkthroughFindings>[0]['assessment'];

  it('does nothing when the flag is off', async () => {
    // The default path. No network call, same object back.
    const out = await verifyWalkthroughFindings({
      assessment,
      frameUrls: ['a.jpg'],
      openaiApiKey: 'sk-test',
    });
    expect(out).toBe(assessment);
  });

  it('does nothing without an API key', async () => {
    const out = await verifyWalkthroughFindings({
      assessment,
      frameUrls: ['a.jpg'],
      openaiApiKey: undefined,
    });
    expect(out).toBe(assessment);
  });

  it('does nothing when there are no findings to check', async () => {
    const empty = { ...assessment, findings: [] };
    const out = await verifyWalkthroughFindings({
      assessment: empty,
      frameUrls: ['a.jpg'],
      openaiApiKey: 'sk-test',
    });
    expect(out).toBe(empty);
  });
});

describe('buildVerifyPrompt', () => {
  it('numbers the findings so verdicts can be keyed back', () => {
    const prompt = buildVerifyPrompt([
      finding(),
      finding({ element: 'main_walls', description: 'Mould above cabinets' }),
    ]);

    expect(prompt).toContain('0. element=ceilings');
    expect(prompt).toContain('1. element=main_walls');
    expect(prompt).toContain('Mould above cabinets');
  });

  it('asks for justification, not for a fresh survey', () => {
    const prompt = buildVerifyPrompt([finding()]);
    expect(prompt).toMatch(/checking your own work/i);
    expect(prompt).toMatch(
      /Rejecting your own finding is the correct outcome/i
    );
    // The specific false positives this exists to catch.
    expect(prompt).toMatch(/shadow, a reflection, a dark recess/i);
    expect(prompt).toMatch(
      /Normal building features and finishes are not defects/i
    );
  });
});
