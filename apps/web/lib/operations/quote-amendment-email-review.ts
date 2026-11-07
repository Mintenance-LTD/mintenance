import { z } from 'zod';

export const emailReviewRequest = z
  .object({
    request_id: z.string().uuid(),
    amendment_id: z.string().uuid(),
    version: z.number().int().positive(),
    expected_review_version: z.number().int().nonnegative(),
    action: z.enum(['retry', 'confirm_accepted', 'close_unknown']),
    evidence: z.enum(['not_accepted', 'accepted', 'unknown']),
    note: z.string().trim().min(20).max(2000),
    confirmed: z.literal(true),
  })
  .strict()
  .refine(
    (v) =>
      v.evidence ===
      {
        retry: 'not_accepted',
        confirm_accepted: 'accepted',
        close_unknown: 'unknown',
      }[v.action],
    'Evidence must match the action'
  );
export type EmailReviewRequest = z.infer<typeof emailReviewRequest>;
export const emailReviewRow = z.object({
  amendment_id: z.string().uuid(),
  version: z.number().int().positive(),
  job_id: z.string().uuid(),
  action: z.string(),
  status: z.enum([
    'pending',
    'sending',
    'sent',
    'cancelled',
    'failed',
    'needs_review',
    'reviewed_unknown',
    'reviewed_accepted',
  ]),
  attempts: z.number().int().nonnegative(),
  error_code: z.string().nullable(),
  created_at: z.string(),
  review_version: z.number().int().nonnegative(),
  review_sequence: z.number().int().positive(),
});
export type EmailReviewRow = z.infer<typeof emailReviewRow>;
export const emailReviewResult = z.object({
  request_id: z.string().uuid(),
  amendment_id: z.string().uuid(),
  version: z.number().int().positive(),
  review_version: z.number().int().positive(),
  action: z.enum(['retry', 'confirm_accepted', 'close_unknown']),
  evidence: z.enum(['not_accepted', 'accepted', 'unknown']),
  note: z.string(),
  result_status: z.enum(['pending', 'reviewed_unknown', 'reviewed_accepted']),
  previous_status: z.string(),
  previous_attempts: z.number(),
  previous_error_code: z.string().nullable(),
  created_at: z.string(),
});
export const emailReviewPage = z.object({
  rows: z.array(emailReviewRow),
  next_before: z.number().nullable(),
});
