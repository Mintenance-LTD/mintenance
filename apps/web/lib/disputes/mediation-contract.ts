import { z } from 'zod';
export const mediationActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('request') }).strict(),
  z
    .object({
      action: z.literal('schedule'),
      scheduledAt: z.string().datetime({ offset: true }),
      mediatorId: z.string().uuid(),
    })
    .strict(),
  z
    .object({
      action: z.literal('complete'),
      outcome: z.string().trim().min(5).max(5000),
    })
    .strict(),
]);
export const mediationResponseSchema = z.object({
  escrowId: z.string().uuid(),
  status: z.enum(['pending', 'scheduled', 'in_progress', 'completed']),
  requestedAt: z.string().nullable(),
  scheduledAt: z.string().nullable(),
  completedAt: z.string().nullable(),
});
export type MediationAction = z.infer<typeof mediationActionSchema>;
export type MediationState = z.infer<typeof mediationResponseSchema>;
