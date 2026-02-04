import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { handleAPIError, BadRequestError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const feedbackSchema = z.object({
  assessmentId: z.string().uuid(),
  isAccurate: z.boolean(),
  // Optional correction fields (required if isAccurate = false)
  correctedDamageType: z.string().optional(),
  correctedSeverity: z.enum(['early', 'midway', 'full']).optional(),
  correctedCostMin: z.number().optional(),
  correctedCostMax: z.number().optional(),
  correctionNotes: z.string().optional(),
  // Optional additional feedback
  feedbackText: z.string().optional(),
  userEmail: z.string().email().optional(),
});

/**
 * POST /api/building-surveyor/demo-feedback
 *
 * Submit user feedback on demo assessment for training data collection
 * Does NOT require authentication (for demo purposes)
 */
export async function POST(request: NextRequest) {
  logger.info('Demo feedback: Request received', {
    service: 'demo-feedback',
  });

  try {
    // Rate limiting for public endpoint
    const identifier = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                       request.headers.get('x-real-ip') ||
                       'anonymous';

    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: `demo-feedback:${identifier}`,
      windowMs: 60000, // 1 minute
      maxRequests: 10, // 10 feedback submissions per minute
    });

    if (!rateLimitResult.allowed) {
      logger.warn('Demo feedback rate limit exceeded', {
        service: 'demo-feedback',
        identifier,
      });

      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment and try again.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
          }
        }
      );
    }

    // Parse and validate request
    const body = await request.json();
    const validationResult = feedbackSchema.safeParse(body);

    if (!validationResult.success) {
      throw new BadRequestError('Invalid feedback data: ' + validationResult.error.message);
    }

    const {
      assessmentId,
      isAccurate,
      correctedDamageType,
      correctedSeverity,
      correctedCostMin,
      correctedCostMax,
      correctionNotes,
      feedbackText,
      userEmail,
    } = validationResult.data;

    // Validate that assessment exists and is a demo assessment (shadow_mode = true)
    const { data: assessment, error: assessmentError } = await serverSupabase
      .from('building_assessments')
      .select('id, shadow_mode, damage_type')
      .eq('id', assessmentId)
      .single();

    if (assessmentError || !assessment) {
      logger.warn('Demo feedback for non-existent assessment', {
        service: 'demo-feedback',
        assessmentId,
        error: assessmentError,
      });
      throw new BadRequestError('Assessment not found');
    }

    if (!assessment.shadow_mode) {
      logger.warn('Demo feedback attempted for non-demo assessment', {
        service: 'demo-feedback',
        assessmentId,
      });
      throw new BadRequestError('Feedback only allowed for demo assessments');
    }

    // Validate correction fields if isAccurate = false
    if (!isAccurate && !correctedDamageType && !correctionNotes) {
      throw new BadRequestError(
        'When marking as inaccurate, you must provide either corrected damage type or correction notes'
      );
    }

    logger.info('Submitting demo feedback', {
      service: 'demo-feedback',
      assessmentId,
      isAccurate,
      hasCorrections: !isAccurate && (!!correctedDamageType || !!correctionNotes),
    });

    // Insert feedback
    const { data: feedback, error: insertError } = await serverSupabase
      .from('demo_feedback')
      .insert({
        assessment_id: assessmentId,
        is_accurate: isAccurate,
        corrected_damage_type: correctedDamageType || null,
        corrected_severity: correctedSeverity || null,
        corrected_cost_min: correctedCostMin || null,
        corrected_cost_max: correctedCostMax || null,
        correction_notes: correctionNotes || null,
        feedback_text: feedbackText || null,
        user_email: userEmail || null,
        ip_address: identifier,
        user_agent: request.headers.get('user-agent') || null,
      })
      .select('id')
      .single();

    if (insertError) {
      logger.error('Failed to insert demo feedback', {
        service: 'demo-feedback',
        error: insertError,
        assessmentId,
      });
      throw new Error('Failed to save feedback');
    }

    logger.info('Demo feedback saved successfully', {
      service: 'demo-feedback',
      feedbackId: feedback.id,
      assessmentId,
      isAccurate,
    });

    // Return success
    return NextResponse.json({
      success: true,
      feedbackId: feedback.id,
      message: isAccurate
        ? 'Thank you for confirming the accuracy!'
        : 'Thank you for your feedback. This will help improve our AI.',
    });

  } catch (error) {
    logger.error('Demo feedback error', error, {
      service: 'demo-feedback',
    });
    return handleAPIError(error);
  }
}
