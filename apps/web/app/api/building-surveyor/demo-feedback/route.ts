import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { BadRequestError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const feedbackSchema = z.object({
  assessmentId: z.string().uuid(),
  isAccurate: z.boolean(),
  correctedDamageType: z.string().optional(),
  correctedSeverity: z.enum(['early', 'midway', 'full']).optional(),
  correctedCostMin: z.number().optional(),
  correctedCostMax: z.number().optional(),
  correctionNotes: z.string().optional(),
  feedbackText: z.string().optional(),
  userEmail: z.string().email().optional(),
});

export const POST = withApiHandler({ auth: false, rateLimit: { maxRequests: 10 } }, async (request) => {
  logger.info('Demo feedback: Request received', { service: 'demo-feedback' });

  const body = await request.json();
  const validationResult = feedbackSchema.safeParse(body);
  if (!validationResult.success) {
    throw new BadRequestError('Invalid feedback data: ' + validationResult.error.message);
  }

  const { assessmentId, isAccurate, correctedDamageType, correctedSeverity, correctedCostMin, correctedCostMax, correctionNotes, feedbackText, userEmail } = validationResult.data;

  const { data: assessment, error: assessmentError } = await serverSupabase.from('building_assessments').select('id, shadow_mode, damage_type').eq('id', assessmentId).single();

  if (assessmentError || !assessment) {
    logger.warn('Demo feedback for non-existent assessment', { service: 'demo-feedback', assessmentId, error: assessmentError });
    throw new BadRequestError('Assessment not found');
  }

  if (!assessment.shadow_mode) {
    logger.warn('Demo feedback attempted for non-demo assessment', { service: 'demo-feedback', assessmentId });
    throw new BadRequestError('Feedback only allowed for demo assessments');
  }

  if (!isAccurate && !correctedDamageType && !correctionNotes) {
    throw new BadRequestError('When marking as inaccurate, you must provide either corrected damage type or correction notes');
  }

  logger.info('Submitting demo feedback', { service: 'demo-feedback', assessmentId, isAccurate, hasCorrections: !isAccurate && (!!correctedDamageType || !!correctionNotes) });

  const identifier = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous';

  const { data: feedback, error: insertError } = await serverSupabase.from('demo_feedback').insert({
    assessment_id: assessmentId, is_accurate: isAccurate, corrected_damage_type: correctedDamageType || null,
    corrected_severity: correctedSeverity || null, corrected_cost_min: correctedCostMin || null, corrected_cost_max: correctedCostMax || null,
    correction_notes: correctionNotes || null, feedback_text: feedbackText || null, user_email: userEmail || null,
    ip_address: identifier, user_agent: request.headers.get('user-agent') || null,
  }).select('id').single();

  if (insertError) {
    logger.error('Failed to insert demo feedback', { service: 'demo-feedback', error: insertError, assessmentId });
    throw new Error('Failed to save feedback');
  }

  logger.info('Demo feedback saved successfully', { service: 'demo-feedback', feedbackId: feedback.id, assessmentId, isAccurate });

  return NextResponse.json({ success: true, feedbackId: feedback.id, message: isAccurate ? 'Thank you for confirming the accuracy!' : 'Thank you for your feedback. This will help improve our AI.' });
});
