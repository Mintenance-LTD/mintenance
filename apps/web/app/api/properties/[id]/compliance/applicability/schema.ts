import { z } from 'zod';
export const applicabilitySchema = z
  .object({
    cert_type: z.enum([
      'gas_safety',
      'eicr',
      'epc',
      'smoke_alarm',
      'co_detector',
    ]),
    decision: z.enum(['unknown', 'applicable', 'not_applicable']),
    reason: z.string().trim().max(1000).default(''),
  })
  .strict()
  .refine(
    (value) => value.decision !== 'not_applicable' || value.reason.length >= 5,
    {
      path: ['reason'],
      message: 'Record why this does not apply to this property.',
    }
  );
