import { z } from 'zod';

export const reviewLabelSchema = z
  .object({
    evidence: z.enum(['sufficient', 'insufficient']),
    damageType: z.string().trim().min(1).max(120).nullable(),
    severity: z
      .enum(['none', 'early', 'developing', 'significant', 'dangerous'])
      .nullable(),
    urgency: z
      .enum(['immediate', 'urgent', 'soon', 'planned', 'monitor'])
      .nullable(),
    criticalHazard: z.boolean().nullable(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const fields = [
      'damageType',
      'severity',
      'urgency',
      'criticalHazard',
    ] as const;
    for (const field of fields) {
      if (value.evidence === 'sufficient' && value[field] === null) {
        ctx.addIssue({
          code: 'custom',
          path: [field],
          message: 'Required when the evidence is sufficient',
        });
      }
      if (value.evidence === 'insufficient' && value[field] !== null) {
        ctx.addIssue({
          code: 'custom',
          path: [field],
          message: 'Leave unassessable labels blank',
        });
      }
    }
    if (value.evidence === 'sufficient') {
      const healthy = value.damageType?.toLowerCase() === 'none';
      if (
        healthy !== (value.severity === 'none') ||
        (healthy && value.criticalHazard)
      ) {
        ctx.addIssue({
          code: 'custom',
          message:
            'Use severity none only for no visible defect, with no critical hazard',
        });
      }
    }
  });

export const expertReviewSchema = z
  .object({
    sourceFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    labels: reviewLabelSchema,
    notes: z.string().trim().min(10).max(4000),
    expertise: z.string().trim().min(3).max(200),
    evidenceImageIds: z
      .array(z.string().uuid())
      .min(1)
      .max(100)
      .refine(
        (ids) => new Set(ids).size === ids.length,
        'Choose each photo once'
      ),
    confirmedIndependentReview: z.literal(true),
  })
  .strict();

export type ReviewLabels = z.infer<typeof reviewLabelSchema>;
export interface ExpertReview {
  id: string;
  assessment_id: string;
  reviewer_id: string;
  created_at: string;
  source_fingerprint: string;
  source_snapshot: Record<string, unknown>;
  labels: ReviewLabels;
  property_id: string | null;
  domain: string;
}
