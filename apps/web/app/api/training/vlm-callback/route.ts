/**
 * POST /api/training/vlm-callback
 *
 * Receives training completion (or failure) callbacks from the Modal
 * VLM training worker (vlm_training_worker/modal_train.py).
 *
 * Security:
 * - Verified via HMAC-SHA256 signature in X-Mint-Signature header
 * - MINTENANCE_CALLBACK_SECRET must match the secret used by the worker
 * - No user auth required — this is a machine-to-machine endpoint
 *
 * On success: updates knowledge_distillation_jobs with adapter path + metrics
 * On failure: marks job as failed with error message
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { rateLimiter } from '@/lib/rate-limiter';
import { handleAPIError, BadRequestError, UnauthorizedError } from '@/lib/errors/api-error';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VLMCallbackPayload {
  jobId: string;
  success: boolean;
  adapterStoragePath: string | null;
  metrics: Record<string, unknown>;
  errorMessage: string | null;
}

// ---------------------------------------------------------------------------
// HMAC signature verification
// ---------------------------------------------------------------------------

function verifySignature(rawBody: string, signature: string): boolean {
  const secret = process.env.MINTENANCE_CALLBACK_SECRET?.trim();
  if (!secret) {
    // No secret configured — in development, allow through with a warning
    if (process.env.NODE_ENV !== 'production') {
      logger.warn('MINTENANCE_CALLBACK_SECRET not set — skipping signature check (dev only)', {
        route: 'vlm-callback',
      });
      return true;
    }
    // In production, reject if secret is not configured
    logger.error('MINTENANCE_CALLBACK_SECRET must be set in production', {
      route: 'vlm-callback',
    });
    return false;
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expected, 'hex'),
  );
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Rate limit: 60/min — high limit because this is machine-to-machine
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';
  const limitResult = await rateLimiter.checkRateLimit({ identifier: `${ip}:vlm-callback`, maxRequests: 60, windowMs: 60000 });
  if (!limitResult.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-mint-signature') ?? '';

    if (!verifySignature(rawBody, signature)) {
      throw new UnauthorizedError('Invalid callback signature');
    }

    let payload: VLMCallbackPayload;
    try {
      payload = JSON.parse(rawBody) as VLMCallbackPayload;
    } catch {
      throw new BadRequestError('Invalid JSON payload');
    }

    const { jobId, success, adapterStoragePath, metrics, errorMessage } = payload;

    if (!jobId || typeof success !== 'boolean') {
      throw new BadRequestError('Missing required fields: jobId, success');
    }

    logger.info('VLM training callback received', {
      route: 'vlm-callback',
      jobId,
      success,
      adapterStoragePath,
    });

    if (success) {
      // Mark job completed with adapter path and metrics
      const { error: updateError } = await serverSupabase
        .from('knowledge_distillation_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          output_model_path: adapterStoragePath,
          metrics_jsonb: metrics,
        })
        .eq('id', jobId);

      if (updateError) {
        logger.error('Failed to update job completion in DB', updateError, {
          route: 'vlm-callback',
          jobId,
        });
        // Don't fail the response — the callback was delivered successfully
      } else {
        logger.info('Job marked completed in DB', {
          route: 'vlm-callback',
          jobId,
          adapterStoragePath,
          metrics,
        });
      }
    } else {
      // Mark job as failed
      const { error: updateError } = await serverSupabase
        .from('knowledge_distillation_jobs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: errorMessage ?? 'Unknown error from training worker',
          metrics_jsonb: metrics,
        })
        .eq('id', jobId);

      if (updateError) {
        logger.error('Failed to update job failure in DB', updateError, {
          route: 'vlm-callback',
          jobId,
        });
      } else {
        logger.warn('Job marked failed in DB', {
          route: 'vlm-callback',
          jobId,
          errorMessage,
        });
      }
    }

    return NextResponse.json({ received: true, jobId });
  } catch (error) {
    return handleAPIError(error);
  }
}
