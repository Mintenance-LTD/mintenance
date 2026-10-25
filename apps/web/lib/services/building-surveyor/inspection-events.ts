import { z } from 'zod';

export const inspectionEventSchema = z
  .object({
    requestId: z.string().uuid(),
    sourceFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    kind: z.enum(['correction', 'repair', 'follow_up']),
    occurredOn: z.string().date(),
    notes: z.string().trim().min(10).max(4000),
    evidenceImageIds: z
      .array(z.string().uuid())
      .max(40)
      .refine(
        (ids) => new Set(ids).size === ids.length,
        'Select each photo once'
      ),
    outcome: z
      .enum([
        'visible_defect',
        'no_visible_defect',
        'insufficient_evidence',
        'resolved',
        'improved',
        'unchanged',
        'worse',
        'unknown',
      ])
      .nullable(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const allowed: (string | null)[] =
      value.kind === 'correction'
        ? ['visible_defect', 'no_visible_defect', 'insufficient_evidence']
        : value.kind === 'follow_up'
          ? ['resolved', 'improved', 'unchanged', 'worse', 'unknown']
          : [null];
    if (!allowed.includes(value.outcome))
      ctx.addIssue({
        code: 'custom',
        path: ['outcome'],
        message: 'Choose an outcome for this activity',
      });
    if (value.kind !== 'repair' && value.evidenceImageIds.length === 0)
      ctx.addIssue({
        code: 'custom',
        path: ['evidenceImageIds'],
        message: 'Select at least one photo',
      });
  });

export type InspectionEventInput = z.infer<typeof inspectionEventSchema>;
export interface InspectionEvent {
  id: string;
  actor_id: string;
  actor_role: 'owner' | 'admin';
  created_at: string;
  source_fingerprint: string;
  kind: InspectionEventInput['kind'];
  occurred_on: string;
  notes: string;
  outcome: InspectionEventInput['outcome'];
  evidence_image_ids: string[];
}

export const inspectionOutcomeLabels: Record<
  NonNullable<InspectionEventInput['outcome']>,
  string
> = {
  visible_defect: 'Visible defect',
  no_visible_defect: 'No visible defect in the selected photos',
  insufficient_evidence: 'More evidence needed',
  resolved: 'Reported resolved',
  improved: 'Improved',
  unchanged: 'Unchanged',
  worse: 'Worse',
  unknown: 'Not yet known',
};
