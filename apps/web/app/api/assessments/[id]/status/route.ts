import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { NotFoundError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * GET /api/assessments/:id/status
 *
 * Poll assessment processing status. Returns the assessment record
 * including validation_status ('pending' | 'processing' | 'completed' | 'failed')
 * and assessment_data (AI analysis results when complete).
 *
 * Mobile client: VideoProcessingStatusScreen polls this every 2s.
 */
export const GET = withApiHandler(
  { rateLimit: { maxRequests: 60 } },
  async (_request, { user, params }) => {
    const assessmentId = params.id as string;

    const { data, error } = await serverSupabase
      .from('building_assessments')
      .select(
        'id, user_id, property_id, domain, damage_type, severity, confidence, ' +
        'safety_score, compliance_score, insurance_risk_score, urgency, ' +
        'assessment_data, validation_status, video_url, created_at, updated_at'
      )
      .eq('id', assessmentId)
      .single();

    if (error || !data) {
      throw new NotFoundError('Assessment not found');
    }

    const assessment = data as unknown as Record<string, unknown>;

    // Only allow owner or admin to view
    if (assessment.user_id !== user.id && user.role !== 'admin') {
      throw new NotFoundError('Assessment not found');
    }

    // Fetch associated images
    const { data: images } = await serverSupabase
      .from('assessment_images')
      .select('id, image_url, image_index')
      .eq('assessment_id', assessmentId)
      .order('image_index', { ascending: true });

    const status = assessment.validation_status as string;
    const isComplete = status === 'completed' || status === 'validated';
    const isFailed = status === 'failed';

    return NextResponse.json({
      id: assessment.id,
      status,
      isComplete,
      isFailed,
      assessment: isComplete ? {
        domain: assessment.domain,
        damageType: assessment.damage_type,
        severity: assessment.severity,
        confidence: assessment.confidence,
        safetyScore: assessment.safety_score,
        complianceScore: assessment.compliance_score,
        insuranceRiskScore: assessment.insurance_risk_score,
        urgency: assessment.urgency,
        data: assessment.assessment_data,
      } : null,
      videoUrl: assessment.video_url,
      images: images || [],
      createdAt: assessment.created_at,
      updatedAt: assessment.updated_at,
    });
  }
);
