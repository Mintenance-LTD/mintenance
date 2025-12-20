/**
 * Maintenance Assessment API Endpoint
 * Analyzes maintenance issues from uploaded images
 */

import { NextRequest, NextResponse } from 'next/server';
import { MaintenanceAssessmentService } from '@/lib/services/maintenance/MaintenanceAssessmentService';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth';
import { z } from 'zod';

// Request validation schema
const assessmentRequestSchema = z.object({
  images: z.array(z.string().url()).min(1).max(5),
  description: z.string().optional(),
  jobId: z.string().uuid().optional(),
  useSAM3: z.boolean().default(true),
  useGPTFallback: z.boolean().default(true),
  saveAssessment: z.boolean().default(true)
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Rate limiting check
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

    // Log assessment request
    // console.log(`Assessment request from user ${user.id}:`, {
    //   imageCount: images.length,
    //   hasDescription: !!description,
    //   jobId,
    //   useSAM3,
    //   useGPTFallback
    // });

    // Run assessment
    const assessment = await MaintenanceAssessmentService.assessMaintenanceIssue(
      images,
      {
        userDescription: description,
        useSAM3,
        useGPTFallback,
        saveAssessment,
        jobId,
        userId: user.id
      }
    );

    // Track usage metrics
    await trackUsageMetrics(user.id, assessment);

    // Return assessment result
    return NextResponse.json({
      success: true,
      assessment,
      message: generateUserMessage(assessment)
    });

  } catch (error) {
    console.error('Assessment error:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('SAM3')) {
        return NextResponse.json(
          { error: 'Image segmentation service temporarily unavailable. Please try again.' },
          { status: 503 }
        );
      }

      if (error.message.includes('GPT-4')) {
        return NextResponse.json(
          { error: 'Advanced analysis service temporarily unavailable. Please try again.' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to assess maintenance issue. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * Get assessment by ID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const assessmentId = searchParams.get('id');

    if (!assessmentId) {
      return NextResponse.json(
        { error: 'Assessment ID required' },
        { status: 400 }
      );
    }

    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Get assessment
    const { data: assessment, error } = await supabase
      .from('maintenance_assessments')
      .select('*')
      .eq('id', assessmentId)
      .single();

    if (error || !assessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      );
    }

    // Check authorization
    if (assessment.user_id !== user.id) {
      // Check if user is contractor for this job
      if (assessment.job_id) {
        const { data: job } = await supabase
          .from('jobs')
          .select('contractor_id')
          .eq('id', assessment.job_id)
          .single();

        if (!job || job.contractor_id !== user.id) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 403 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      assessment: assessment.assessment_data
    });

  } catch (error) {
    console.error('Get assessment error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve assessment' },
      { status: 500 }
    );
  }
}

/**
 * Rate limiting check
 */
async function checkRateLimit(userId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();

  // Check recent assessments count
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count } = await supabase
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
async function trackUsageMetrics(userId: string, assessment: any): Promise<void> {
  const supabase = await createServerSupabaseClient();

  try {
    // Update daily metrics
    await supabase.rpc('calculate_maintenance_metrics');

    // Log inference
    await supabase.from('model_inference_logs').insert({
      session_id: assessment.id,
      model_variant: assessment.model_type === 'maintenance_yolo' ? 'treatment' : 'control',
      latency_ms: assessment.processing_time_ms,
      success: assessment.status === 'identified',
      detections_count: assessment.multiple_issues ? assessment.multiple_issues.length + 1 : 1,
      avg_confidence: assessment.confidence / 100
    });

  } catch (error) {
    console.error('Failed to track metrics:', error);
    // Don't throw - metrics are not critical
  }
}

/**
 * Generate user-friendly message
 */
function generateUserMessage(assessment: any): string {
  if (assessment.status === 'identified') {
    const issue = assessment.issue_detected.replace('_', ' ');
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
