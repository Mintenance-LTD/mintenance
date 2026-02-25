/**
 * Maintenance Assessment API Endpoint
 * Analyzes maintenance issues from uploaded images
 */

import { NextResponse } from 'next/server';
import { MaintenanceAssessmentService, type MaintenanceAssessment } from '@/lib/services/maintenance/MaintenanceAssessmentService';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { z } from 'zod';
import { logger } from '@mintenance/shared';
import { ForbiddenError, NotFoundError, BadRequestError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

// Request validation schema
const assessmentRequestSchema = z.object({
  images: z.array(z.string().url()).min(1).max(5),
  description: z.string().optional(),
  jobId: z.string().uuid().optional(),
  useSAM3: z.boolean().default(true),
  useGPTFallback: z.boolean().default(true),
  saveAssessment: z.boolean().default(true),
});

export const POST = withApiHandler({ rateLimit: false }, async (request, { user }) => {
  // Custom per-user rate limiting (20 assessments per hour via DB count)
  const rateLimitOk = await checkRateLimit(user.id);
  if (!rateLimitOk) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      { status: 429 }
    );
  }

  // Parse and validate request
  const body = await request.json();
  const validationResult = assessmentRequestSchema.safeParse(body);

  if (!validationResult.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: validationResult.error.errors },
      { status: 400 }
    );
  }

  const { images, description, jobId, useSAM3, useGPTFallback, saveAssessment } = validationResult.data;

  // Run assessment
  const assessment = await MaintenanceAssessmentService.assessMaintenanceIssue(
    images,
    {
      userDescription: description,
      useSAM3,
      useGPTFallback,
      saveAssessment,
      jobId,
      userId: user.id,
    }
  );

  // Track usage metrics
  await trackUsageMetrics(user.id, assessment);

  // Return assessment result
  return NextResponse.json({
    success: true,
    assessment,
    message: generateUserMessage(assessment),
  });
});

/**
 * Get assessment by ID
 */
export const GET = withApiHandler({}, async (request, { user }) => {
  const { searchParams } = new URL(request.url);
  const assessmentId = searchParams.get('id');

  if (!assessmentId) {
    throw new BadRequestError('Assessment ID required');
  }

  // Get assessment
  const { data: assessment, error } = await serverSupabase
    .from('maintenance_assessments')
    .select('*')
    .eq('id', assessmentId)
    .single();

  if (error || !assessment) {
    throw new NotFoundError('Assessment not found');
  }

  // Check authorization
  if (assessment.user_id !== user.id) {
    // Check if user is contractor for this job
    if (assessment.job_id) {
      const { data: job } = await serverSupabase
        .from('jobs')
        .select('contractor_id')
        .eq('id', assessment.job_id)
        .single();

      if (!job || job.contractor_id !== user.id) {
        throw new ForbiddenError('Unauthorized');
      }
    } else {
      throw new ForbiddenError('Unauthorized');
    }
  }

  return NextResponse.json({
    success: true,
    assessment: assessment.assessment_data,
  });
});

/**
 * Rate limiting check
 */
async function checkRateLimit(userId: string): Promise<boolean> {
  // Check recent assessments count
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count } = await serverSupabase
    .from('maintenance_assessments')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', oneHourAgo);

  // Allow 20 assessments per hour
  return (count || 0) < 20;
}

/**
 * Track usage metrics
 */
async function trackUsageMetrics(userId: string, assessment: MaintenanceAssessment): Promise<void> {
  try {
    // Update daily metrics
    await serverSupabase.rpc('calculate_maintenance_metrics');

    // Log inference
    await serverSupabase.from('model_inference_logs').insert({
      session_id: assessment.id,
      model_variant: assessment.model_type === 'maintenance_yolo' ? 'treatment' : 'control',
      latency_ms: assessment.processing_time_ms,
      success: assessment.status === 'identified',
      detections_count: assessment.multiple_issues ? assessment.multiple_issues.length + 1 : 1,
      avg_confidence: assessment.confidence / 100,
    });
  } catch (error) {
    logger.error('Failed to track metrics:', error, { service: 'api' });
    // Don't throw - metrics are not critical
  }
}

/**
 * Generate user-friendly message
 */
function generateUserMessage(assessment: MaintenanceAssessment): string {
  if (assessment.status === 'identified') {
    const issue = (assessment.issue_detected || 'issue').replace('_', ' ');
    const severity = assessment.severity;
    const urgency = assessment.urgency;

    if (assessment.confidence_level === 'high') {
      return `We've identified a ${severity} ${issue}. ${
        urgency === 'immediate'
          ? 'This requires immediate attention!'
          : urgency === 'urgent'
          ? 'Please address this soon.'
          : 'Schedule a repair when convenient.'
      } A ${assessment.contractor_type} can help with this issue.`;
    } else if (assessment.confidence_level === 'medium') {
      return `This appears to be a ${issue}. Please review our assessment and let us know if this matches what you're seeing.`;
    } else {
      return `We've detected a potential issue but need more information. ${
        assessment.request_new_photo
          ? 'Please provide a clearer photo following our guidelines.'
          : 'Please describe the problem in more detail.'
      }`;
    }
  } else if (assessment.status === 'no_issue_detected') {
    return 'No maintenance issues detected in the image. If you\'re experiencing a problem, please describe it or take a photo from a different angle.';
  } else {
    return 'We need more information to identify the issue. Please provide additional photos or a description of the problem.';
  }
}
