/**
 * Maintenance Feedback API Endpoint
 * Collects contractor feedback for continuous learning
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth';
import { rateLimiter } from '@/lib/rate-limiter';
import { logger } from '@mintenance/shared';
import { maintenanceFeedbackSchema } from '@/lib/validation/schemas';

export async function POST(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    // Check authentication
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify user is a contractor
    const supabase = await createServerSupabaseClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'contractor') {
      return NextResponse.json(
        { error: 'Only contractors can provide feedback' },
        { status: 403 }
      );
    }

    // Parse and validate request using centralized Zod schema
    const body = await request.json();
    const validationResult = maintenanceFeedbackSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid feedback data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const feedback = validationResult.data;

    // Get the original assessment
    const { data: assessment, error: assessmentError } = await supabase
      .from('maintenance_assessments')
      .select('*')
      .eq('id', feedback.assessmentId)
      .single();

    if (assessmentError || !assessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      );
    }

    // Verify contractor has access to this assessment
    if (assessment.job_id) {
      const { data: job } = await supabase
        .from('jobs')
        .select('contractor_id')
        .eq('id', assessment.job_id)
        .single();

      if (!job || job.contractor_id !== user.id) {
        return NextResponse.json(
          { error: 'Unauthorized to provide feedback for this assessment' },
          { status: 403 }
        );
      }
    }

    // Update assessment with feedback
    const { error: updateError } = await supabase
      .from('maintenance_assessments')
      .update({
        contractor_found_helpful: feedback.wasAccurate,
        actual_issue: feedback.actualIssue,
        actual_time_hours: feedback.actualTimeHours,
        actual_materials_used: feedback.actualMaterials,
        contractor_notes: feedback.contractorNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', feedback.assessmentId);

    if (updateError) {
      throw updateError;
    }

    // Create correction record if assessment was wrong
    if (!feedback.wasAccurate && feedback.actualIssue) {
      await createCorrection(
        assessment,
        feedback,
        user.id
      );
    }

    // Update contractor contribution stats
    await updateContributorStats(user.id, feedback.wasAccurate);

    // Check if retraining threshold is met
    const shouldRetrain = await checkRetrainingThreshold();

    // Calculate rewards
    const rewards = calculateRewards(feedback);

    return NextResponse.json({
      success: true,
      message: feedback.wasAccurate
        ? 'Thank you for confirming the AI assessment!'
        : 'Thank you for the correction. This helps improve our AI!',
      rewards,
      retrainingScheduled: shouldRetrain
    });

  } catch (error) {
    logger.error('Feedback error:', error, { service: 'api' });
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}

/**
 * Get feedback statistics
 */
export async function GET(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
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

    // Get contractor's feedback statistics
    const { data: stats, error } = await supabase
      .from('contractor_feedback_summary')
      .select('*')
      .eq('contractor_id', user.id);

    if (error) {
      throw error;
    }

    // Get contribution stats
    const { data: contributions } = await supabase
      .from('contractor_contributions')
      .select('*')
      .eq('contractor_id', user.id)
      .single();

    return NextResponse.json({
      success: true,
      feedbackStats: stats,
      contributions
    });

  } catch (error) {
    logger.error('Get feedback stats error:', error, { service: 'api' });
    return NextResponse.json(
      { error: 'Failed to retrieve feedback statistics' },
      { status: 500 }
    );
  }
}

/**
 * Create correction record for wrong assessment
 */
async function createCorrection(
  assessment: Record<string, unknown>,
  feedback: { actualIssue?: string; actualSeverity?: string; contractorNotes?: string; wasAccurate: boolean },
  contractorId: string
): Promise<void> {
  const supabase = await createServerSupabaseClient();

  try {
    // Create correction record
    const assessmentData = assessment.assessment_data as Record<string, unknown> | null;
    const assessmentImages = assessmentData?.images as string[] | undefined;
    await supabase.from('maintenance_corrections').insert({
      assessment_id: assessment.id,
      image_url: assessmentImages?.[0],
      original_detections: {
        issue_type: assessment.issue_type,
        severity: assessment.severity,
        confidence: assessment.confidence
      },
      corrections_made: {
        actual_issue: feedback.actualIssue,
        actual_severity: feedback.actualSeverity,
        was_accurate: false,
        notes: feedback.contractorNotes
      },
      corrected_by: contractorId,
      correction_quality: 'contractor',
      confidence_score: 0.9, // High confidence for contractor corrections
      status: 'pending' // Will be reviewed before training
    });

  } catch (error) {
    logger.error('Failed to create correction:', error, { service: 'api' });
    // Don't throw - correction is not critical for feedback
  }
}

/**
 * Update contractor contribution statistics
 */
async function updateContributorStats(
  contractorId: string,
  wasAccurate: boolean
): Promise<void> {
  const supabase = await createServerSupabaseClient();

  try {
    // Get current stats
    const { data: current } = await supabase
      .from('contractor_contributions')
      .select('*')
      .eq('contractor_id', contractorId)
      .single();

    if (!current) {
      // Create new record
      await supabase.from('contractor_contributions').insert({
        contractor_id: contractorId,
        corrections_made: wasAccurate ? 0 : 1,
        credits_earned: wasAccurate ? 1 : 5 // More credits for corrections
      });
    } else {
      // Update existing
      await supabase
        .from('contractor_contributions')
        .update({
          corrections_made: current.corrections_made + (wasAccurate ? 0 : 1),
          credits_earned: current.credits_earned + (wasAccurate ? 1 : 5),
          updated_at: new Date().toISOString()
        })
        .eq('contractor_id', contractorId);
    }

    // Update contributor level
    await updateContributorLevel(contractorId);

  } catch (error) {
    logger.error('Failed to update contributor stats:', error, { service: 'api' });
  }
}

/**
 * Update contributor level based on contributions
 */
async function updateContributorLevel(contractorId: string): Promise<void> {
  const supabase = await createServerSupabaseClient();

  const { data: stats } = await supabase
    .from('contractor_contributions')
    .select('*')
    .eq('contractor_id', contractorId)
    .single();

  if (!stats) return;

  const totalContributions =
    stats.images_contributed +
    stats.corrections_made +
    stats.images_verified;

  let newLevel = 'bronze';
  if (totalContributions >= 500 && stats.average_quality_score >= 0.9) {
    newLevel = 'expert';
  } else if (totalContributions >= 200) {
    newLevel = 'gold';
  } else if (totalContributions >= 50) {
    newLevel = 'silver';
  }

  if (newLevel !== stats.contributor_level) {
    await supabase
      .from('contractor_contributions')
      .update({
        contributor_level: newLevel,
        updated_at: new Date().toISOString()
      })
      .eq('contractor_id', contractorId);
  }
}

/**
 * Check if retraining threshold is met
 */
async function checkRetrainingThreshold(): Promise<boolean> {
  const supabase = await createServerSupabaseClient();

  const { data: result } = await supabase.rpc('check_retraining_threshold');

  if (result) {
    // Trigger retraining job
    await supabase.from('yolo_retraining_jobs').insert({
      id: `maintenance-retrain-${Date.now()}`,
      status: 'pending',
      config_jsonb: {
        model_type: 'maintenance_yolo',
        trigger: 'threshold_reached'
      }
    });

    return true;
  }

  return false;
}

/**
 * Calculate rewards for feedback
 */
function calculateRewards(feedback: { wasAccurate: boolean; contractorNotes?: string }): {
  credits: number;
  message: string;
} {
  let credits = 0;
  let message = '';

  if (feedback.wasAccurate) {
    credits = 1;
    message = 'Earned 1 credit for confirming assessment';
  } else {
    credits = 5;
    message = 'Earned 5 credits for providing correction';

    if (feedback.contractorNotes && feedback.contractorNotes.length > 50) {
      credits += 2;
      message += ' + 2 bonus credits for detailed notes';
    }
  }

  return { credits, message };
}
