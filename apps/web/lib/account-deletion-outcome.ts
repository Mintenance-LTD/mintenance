import { z } from 'zod';
const Outcome = z.object({
  status: z.enum(['completed', 'pending', 'needs_review']),
  success: z.boolean(),
  requestId: z.string().uuid(),
  message: z.string().min(1).max(1000),
});
export function readAccountDeletionOutcome(body: unknown, httpStatus: number) {
  const value = Outcome.parse(body);
  const completed = value.status === 'completed';
  if (value.success !== completed || httpStatus !== (completed ? 200 : 202))
    throw new Error('Account deletion outcome could not be confirmed');
  return {
    completed,
    notice: `${value.message}\nReference: ${value.requestId}`,
  };
}
