import { z } from 'zod';
import { CUSTOMER_TERMS_VERSION } from '@mintenance/shared';
import { BadRequestError } from '@/lib/errors/api-error';

export const contractConsentSchema = z
  .object({
    termsVersion: z.literal(CUSTOMER_TERMS_VERSION),
    termsAccepted: z.literal(true),
    expectedUpdatedAt: z.string().datetime({ offset: true }),
    expectedReviewToken: z.string().regex(/^[a-f0-9]{32}$/),
    earlyStartRequested: z.boolean(),
    fullPerformanceAcknowledged: z.boolean(),
  })
  .strict()
  .refine(
    (v) => !v.fullPerformanceAcknowledged || v.earlyStartRequested,
    'Request an early start before acknowledging full performance'
  );

export function parseContractConsent(value: unknown, isContractor: boolean) {
  const result = contractConsentSchema.safeParse(value);
  if (!result.success)
    throw new BadRequestError(
      'Review the current terms and choose your cancellation options before signing. Update the app if these choices are not shown.'
    );
  if (
    isContractor &&
    (result.data.earlyStartRequested || result.data.fullPerformanceAcknowledged)
  )
    throw new BadRequestError('Only the customer may request an early start');
  return result.data;
}
