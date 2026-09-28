import { buildReviewReport, rate } from './report';
import { expertReviewSchema, type ExpertReview } from './review-contract';

function review(overrides: Partial<ExpertReview> = {}): ExpertReview {
  return {
    id: 'one',
    assessment_id: 'assessment',
    reviewer_id: 'reviewer',
    created_at: '2026-09-25T10:00:00Z',
    source_fingerprint: 'a'.repeat(64),
    property_id: 'site-1',
    domain: 'building',
    labels: {
      evidence: 'sufficient',
      damageType: 'electrical_fault',
      severity: 'dangerous',
      urgency: 'immediate',
      criticalHazard: true,
    },
    source_snapshot: {
      damageAssessment: {
        damageType: 'electrical_fault',
        severity: 'dangerous',
      },
      urgency: { urgency: 'immediate' },
      safetyHazards: { hasCriticalHazards: true },
      modelMetadata: { provider: 'openai', model: 'test', promptVersion: 'v1' },
    },
    ...overrides,
  };
}
describe('expert evaluation audit', () => {
  it('does not invent accuracy for an empty dataset', () => {
    expect(buildReviewReport([])).toMatchObject({ scored: 0, groups: [] });
    expect(rate(0, 0).value).toBeNull();
  });
  it('scores reference agreement and includes sample uncertainty', () => {
    const result = buildReviewReport([review()]).groups[0];
    expect(result.damageAgreement.value).toBe(1);
    expect(result.criticalHazardRecall.total).toBe(1);
    expect(result.criticalHazardRecall.lower95).toBeLessThan(0.3);
  });
  it('counts a missing critical judgement as a miss, never a correct negative', () => {
    const row = review();
    delete row.source_snapshot.safetyHazards;
    expect(buildReviewReport([row]).groups[0]).toMatchObject({
      criticalMisses: 1,
      missingHazardJudgements: 1,
      criticalHazardRecall: { value: 0 },
    });
  });
  it('reports false alarms and undefined recall when there are no positive labels', () => {
    const row = review();
    row.labels.criticalHazard = false;
    expect(buildReviewReport([row]).groups[0]).toMatchObject({
      criticalFalseAlarms: 1,
      criticalHazardRecall: { value: null },
      criticalHazardPrecision: { value: 0 },
    });
  });
  it('counts only the latest revision per reviewer and source version', () => {
    const old = review();
    old.labels.criticalHazard = false;
    expect(
      buildReviewReport([
        review({ id: 'two', created_at: '2026-09-26T10:00:00Z' }),
        old,
      ])
    ).toMatchObject({ reviewCount: 2, scored: 1, conflicts: 0 });
  });
  it('does not resolve inter-reviewer disagreement by choosing the newest opinion', () => {
    const other = review({ reviewer_id: 'other' });
    other.labels.urgency = 'monitor';
    expect(buildReviewReport([review(), other])).toMatchObject({
      scored: 0,
      conflicts: 1,
    });
  });
  it('excludes insufficient evidence', () => {
    const row = review();
    row.labels = {
      evidence: 'insufficient',
      damageType: null,
      severity: null,
      urgency: null,
      criticalHazard: null,
    };
    expect(buildReviewReport([row])).toMatchObject({
      scored: 0,
      insufficientEvidence: 1,
    });
  });
  it('separates models, prompts, domains and assessment versions', () => {
    const other = review({
      source_fingerprint: 'b'.repeat(64),
      domain: 'rail',
    });
    expect(buildReviewReport([review(), other]).groups).toHaveLength(2);
  });
  it('counts matching reviewers once', () => {
    expect(
      buildReviewReport([review(), review({ reviewer_id: 'other' })]).scored
    ).toBe(1);
  });
  it('does not force severity labels on healthy images', () => {
    const row = review();
    row.labels = {
      evidence: 'sufficient',
      damageType: 'none',
      severity: 'none',
      urgency: 'monitor',
      criticalHazard: false,
    };
    expect(buildReviewReport([row]).groups[0].severityAgreement.total).toBe(0);
  });
});

describe('expert review input', () => {
  const input = () => ({
    sourceFingerprint: 'a'.repeat(64),
    labels: review().labels,
    notes: 'Visible exposed electrical conductors.',
    expertise: 'Building surveyor',
    evidenceImageIds: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'],
    confirmedIndependentReview: true,
  });
  it('requires deliberate labels, rationale, expertise, selected evidence and confirmation', () => {
    expect(expertReviewSchema.safeParse(input()).success).toBe(true);
    for (const field of [
      'notes',
      'expertise',
      'evidenceImageIds',
      'confirmedIndependentReview',
      'sourceFingerprint',
    ]) {
      const value: Record<string, unknown> = input();
      delete value[field];
      expect(expertReviewSchema.safeParse(value).success).toBe(false);
    }
  });
  it('rejects fabricated client reviewer identities and snapshots', () => {
    expect(
      expertReviewSchema.safeParse({
        ...input(),
        reviewer_id: 'admin',
        source_snapshot: {},
      }).success
    ).toBe(false);
  });
  it('rejects contradictory insufficient labels', () => {
    const value = input();
    value.labels.evidence = 'insufficient';
    expect(expertReviewSchema.safeParse(value).success).toBe(false);
  });
  it('requires null rather than invented healthy answers for insufficient evidence', () => {
    expect(
      expertReviewSchema.safeParse({
        ...input(),
        labels: {
          evidence: 'insufficient',
          damageType: null,
          severity: null,
          urgency: null,
          criticalHazard: null,
        },
      }).success
    ).toBe(true);
  });
});
