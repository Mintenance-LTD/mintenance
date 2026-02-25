import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@mintenance/shared';
import { withCronHandler } from '@/lib/cron-handler';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { ModelRetrainingService } from '@/lib/services/building-surveyor/ModelRetrainingService';
import { BadRequestError } from '@/lib/errors/api-error';

const manualRetrainingSchema = z.object({
  force: z.boolean().default(false),
  dryRun: z.boolean().optional(),
  config: z.record(z.unknown()).optional(),
});

/**
 * Cron endpoint for automated model retraining.
 * Checks corrections, time, drift, and performance thresholds.
 * Should be called daily.
 */
export const GET = withCronHandler('model-retraining', async () => {
  return await ModelRetrainingService.runRetrainingCycle();
});

/**
 * Manual trigger endpoint for model retraining (admin only).
 */
export const POST = withApiHandler({ roles: ['admin'], rateLimit: { maxRequests: 1 } }, async (request) => {
  const body = await request.json();
  const parsed = manualRetrainingSchema.safeParse(body);
  if (!parsed.success) {
    throw new BadRequestError('Invalid request: force (boolean) expected');
  }

  logger.info('Manual retraining trigger requested', { params: parsed.data });

  const result = await ModelRetrainingService.manualTrigger({
    force: parsed.data.force,
    dryRun: parsed.data.dryRun,
  });

  return NextResponse.json({ success: true, ...result });
});
