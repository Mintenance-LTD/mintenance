import type { ExpertReview, ReviewLabels } from './review-contract';

const key = (value: unknown) =>
  typeof value === 'string'
    ? value
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_')
    : null;
const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/** Wilson interval, with no invented score when the denominator is zero. */
export function rate(successes: number, total: number) {
  if (!total)
    return { successes, total, value: null, lower95: null, upper95: null };
  const p = successes / total,
    z2 = 1.96 ** 2;
  const center = (p + z2 / (2 * total)) / (1 + z2 / total);
  const half =
    (1.96 * Math.sqrt((p * (1 - p)) / total + z2 / (4 * total ** 2))) /
    (1 + z2 / total);
  return {
    successes,
    total,
    value: p,
    lower95: Math.max(0, center - half),
    upper95: Math.min(1, center + half),
  };
}

function labelKey(label: ReviewLabels) {
  return JSON.stringify([
    label.evidence,
    key(label.damageType),
    label.severity,
    label.urgency,
    label.criticalHazard,
  ]);
}

/** Audit of historical predictions. This is not an unseen-site model benchmark. */
export function buildReviewReport(reviews: ExpertReview[]) {
  const groups = new Map<string, ExpertReview[]>();
  for (const review of reviews) {
    const groupKey = `${review.assessment_id}:${review.source_fingerprint}`;
    groups.set(groupKey, [...(groups.get(groupKey) ?? []), review]);
  }
  let conflicts = 0,
    insufficient = 0;
  const accepted: ExpertReview[] = [];
  for (const group of groups.values()) {
    const latest = new Map<string, ExpertReview>();
    for (const row of [...group].sort(
      (a, b) =>
        a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)
    ))
      latest.set(row.reviewer_id, row);
    const current = [...latest.values()];
    if (new Set(current.map((r) => labelKey(r.labels))).size !== 1) {
      conflicts++;
      continue;
    }
    if (current[0].labels.evidence === 'insufficient') {
      insufficient++;
      continue;
    }
    accepted.push(current[0]);
  }
  const models = new Map<string, ExpertReview[]>();
  for (const row of accepted) {
    const metadata = object(row.source_snapshot.modelMetadata);
    const model = JSON.stringify([
      row.domain,
      metadata.provider ?? 'unknown',
      metadata.model ?? 'unknown',
      metadata.promptVersion ?? 'unknown',
    ]);
    models.set(model, [...(models.get(model) ?? []), row]);
  }
  return {
    kind: 'historical_review_audit' as const,
    reviewCount: reviews.length,
    assessedVersions: groups.size,
    scored: accepted.length,
    conflicts,
    insufficientEvidence: insufficient,
    groups: [...models.entries()].map(([model, rows]) => {
      let damage = 0,
        severity = 0,
        urgency = 0,
        missing = 0,
        tp = 0,
        fn = 0,
        fp = 0,
        negative = 0;
      const categories: Record<string, { total: number; correct: number }> = {};
      for (const row of rows) {
        const prediction = object(row.source_snapshot.damageAssessment);
        const safety = object(row.source_snapshot.safetyHazards);
        const predictedUrgency = object(row.source_snapshot.urgency).urgency;
        const category = key(row.labels.damageType)!;
        const correct = key(prediction.damageType) === category;
        categories[category] ??= { total: 0, correct: 0 };
        categories[category].total++;
        categories[category].correct += Number(correct);
        damage += Number(correct);
        severity += Number(
          row.labels.severity !== 'none' &&
            prediction.severity === row.labels.severity
        );
        urgency += Number(predictedUrgency === row.labels.urgency);
        // Only an explicit hazard judgement or typed hazard list is scoreable.
        const hazards = Array.isArray(safety.hazards) ? safety.hazards : null;
        const predictedCritical =
          typeof safety.hasCriticalHazards === 'boolean'
            ? safety.hasCriticalHazards
            : hazards
              ? hazards.some((h) => object(h).severity === 'critical')
              : null;
        if (predictedCritical === null) missing++;
        if (row.labels.criticalHazard) {
          if (predictedCritical === true) tp++;
          else fn++;
        } else {
          negative++;
          if (predictedCritical === true) fp++;
        }
      }
      const [domain, provider, modelName, promptVersion] = JSON.parse(
        model
      ) as string[];
      return {
        domain,
        provider,
        model: modelName,
        promptVersion,
        count: rows.length,
        propertyCount: new Set(rows.map((r) => r.property_id).filter(Boolean))
          .size,
        unanchoredCount: rows.filter((r) => !r.property_id).length,
        damageAgreement: rate(damage, rows.length),
        severityAgreement: rate(
          severity,
          rows.filter((r) => r.labels.severity !== 'none').length
        ),
        urgencyAgreement: rate(urgency, rows.length),
        criticalHazardRecall: rate(tp, tp + fn),
        criticalHazardPrecision: rate(tp, tp + fp),
        criticalMisses: fn,
        criticalFalseAlarms: fp,
        criticalFalseAlarmRate: rate(fp, negative),
        missingHazardJudgements: missing,
        categories,
      };
    }),
  };
}
